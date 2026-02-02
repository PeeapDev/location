"""Analytics API endpoints for dashboard statistics."""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, cast, Date
from pydantic import BaseModel

from app.database import get_db
from app.models.address import Address
from app.models.postal_zone import PostalZone
from app.models.user import User
from app.models.region import Region
from app.models.district import District
from app.models.zone import Zone
from app.api.deps import get_current_active_user, get_admin_or_above

router = APIRouter()


# =============================================================================
# Response Schemas
# =============================================================================

class DashboardStats(BaseModel):
    total_addresses: int
    verified_addresses: int
    pending_addresses: int
    rejected_addresses: int
    total_zones: int
    zones_with_addresses: int
    total_regions: int
    total_districts: int
    total_users: int
    active_users: int


class TrendDataPoint(BaseModel):
    date: str
    count: int


class RegistrationTrends(BaseModel):
    daily: List[TrendDataPoint]
    total_this_week: int
    total_this_month: int
    change_percent: float


class ZoneCoverage(BaseModel):
    zone_code: str
    zone_name: Optional[str]
    district_name: str
    region_name: str
    address_count: int
    verified_count: int
    pending_count: int


class ZoneCoverageResponse(BaseModel):
    zones: List[ZoneCoverage]
    total_zones: int
    zones_with_addresses: int
    coverage_percent: float


class AddressTypeBreakdown(BaseModel):
    address_type: str
    count: int
    percentage: float


class VerificationStats(BaseModel):
    total_verified: int
    total_pending: int
    total_rejected: int
    avg_confidence_score: float
    high_confidence_count: int
    medium_confidence_count: int
    low_confidence_count: int
    type_breakdown: List[AddressTypeBreakdown]


class RecentActivity(BaseModel):
    type: str
    description: str
    timestamp: datetime
    user: Optional[str]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get overview statistics for the admin dashboard."""

    # Address counts
    total_addresses = await db.scalar(select(func.count(Address.pda_id)))
    verified_addresses = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "verified")
    )
    pending_addresses = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "pending")
    )
    rejected_addresses = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "rejected")
    )

    # Zone counts - try new model first, fallback to postal_zones
    try:
        total_zones = await db.scalar(select(func.count(Zone.id)))
        zones_with_addresses = await db.scalar(
            select(func.count(Zone.id)).where(Zone.address_count > 0)
        )
    except Exception:
        total_zones = await db.scalar(select(func.count(PostalZone.zone_code))) or 0
        zones_with_addresses = await db.scalar(
            select(func.count(func.distinct(Address.zone_code)))
        ) or 0

    # Region and district counts
    try:
        total_regions = await db.scalar(select(func.count(Region.id))) or 0
        total_districts = await db.scalar(select(func.count(District.id))) or 0
    except Exception:
        total_regions = 0
        total_districts = 0

    # User counts
    try:
        total_users = await db.scalar(select(func.count(User.id))) or 0
        active_users = await db.scalar(
            select(func.count(User.id)).where(User.status == "active")
        ) or 0
    except Exception:
        total_users = 0
        active_users = 0

    return DashboardStats(
        total_addresses=total_addresses or 0,
        verified_addresses=verified_addresses or 0,
        pending_addresses=pending_addresses or 0,
        rejected_addresses=rejected_addresses or 0,
        total_zones=total_zones or 0,
        zones_with_addresses=zones_with_addresses or 0,
        total_regions=total_regions,
        total_districts=total_districts,
        total_users=total_users,
        active_users=active_users,
    )


@router.get("/registrations", response_model=RegistrationTrends)
async def get_registration_trends(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get address registration trends over time."""

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Daily registrations
    daily_query = (
        select(
            cast(Address.created_at, Date).label("date"),
            func.count(Address.pda_id).label("count")
        )
        .where(Address.created_at >= start_date)
        .group_by(cast(Address.created_at, Date))
        .order_by(cast(Address.created_at, Date))
    )

    result = await db.execute(daily_query)
    daily_data = result.all()

    # Fill in missing dates with 0
    date_counts = {row.date: row.count for row in daily_data}
    daily = []
    current_date = start_date.date()
    while current_date <= end_date.date():
        daily.append(TrendDataPoint(
            date=current_date.isoformat(),
            count=date_counts.get(current_date, 0)
        ))
        current_date += timedelta(days=1)

    # This week total
    week_start = end_date - timedelta(days=7)
    this_week = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.created_at >= week_start)
    ) or 0

    # This month total
    month_start = end_date - timedelta(days=30)
    this_month = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.created_at >= month_start)
    ) or 0

    # Previous month for change calculation
    prev_month_start = month_start - timedelta(days=30)
    prev_month = await db.scalar(
        select(func.count(Address.pda_id)).where(
            and_(
                Address.created_at >= prev_month_start,
                Address.created_at < month_start
            )
        )
    ) or 0

    # Calculate change percentage
    if prev_month > 0:
        change_percent = ((this_month - prev_month) / prev_month) * 100
    else:
        change_percent = 100.0 if this_month > 0 else 0.0

    return RegistrationTrends(
        daily=daily,
        total_this_week=this_week,
        total_this_month=this_month,
        change_percent=round(change_percent, 1)
    )


@router.get("/verification", response_model=VerificationStats)
async def get_verification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get verification statistics and confidence breakdown."""

    # Status counts
    total_verified = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "verified")
    ) or 0
    total_pending = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "pending")
    ) or 0
    total_rejected = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.verification_status == "rejected")
    ) or 0

    # Average confidence
    avg_confidence = await db.scalar(
        select(func.avg(Address.confidence_score))
    ) or 0.0

    # Confidence breakdown
    high_confidence = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.confidence_score >= 0.8)
    ) or 0
    medium_confidence = await db.scalar(
        select(func.count(Address.pda_id)).where(
            and_(Address.confidence_score >= 0.5, Address.confidence_score < 0.8)
        )
    ) or 0
    low_confidence = await db.scalar(
        select(func.count(Address.pda_id)).where(Address.confidence_score < 0.5)
    ) or 0

    # Address type breakdown
    type_query = (
        select(
            Address.address_type,
            func.count(Address.pda_id).label("count")
        )
        .group_by(Address.address_type)
        .order_by(func.count(Address.pda_id).desc())
    )
    type_result = await db.execute(type_query)
    type_data = type_result.all()

    total = sum(row.count for row in type_data) or 1
    type_breakdown = [
        AddressTypeBreakdown(
            address_type=row.address_type or "unknown",
            count=row.count,
            percentage=round((row.count / total) * 100, 1)
        )
        for row in type_data
    ]

    return VerificationStats(
        total_verified=total_verified,
        total_pending=total_pending,
        total_rejected=total_rejected,
        avg_confidence_score=round(float(avg_confidence), 2),
        high_confidence_count=high_confidence,
        medium_confidence_count=medium_confidence,
        low_confidence_count=low_confidence,
        type_breakdown=type_breakdown
    )


@router.get("/zone-coverage", response_model=ZoneCoverageResponse)
async def get_zone_coverage(
    region_id: Optional[int] = None,
    district_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get zone coverage statistics."""

    # Try to use new Zone model
    try:
        from sqlalchemy.orm import selectinload

        query = (
            select(Zone)
            .options(selectinload(Zone.district).selectinload(District.region))
            .where(Zone.is_active == True)
        )

        if district_id:
            query = query.where(Zone.district_id == district_id)
        elif region_id:
            query = query.join(District).where(District.region_id == region_id)

        query = query.order_by(Zone.address_count.desc()).limit(limit)

        result = await db.execute(query)
        zones = result.scalars().all()

        zone_list = []
        for zone in zones:
            # Count verified and pending for this zone
            verified = await db.scalar(
                select(func.count(Address.pda_id)).where(
                    and_(
                        Address.zone_code == zone.primary_code,
                        Address.verification_status == "verified"
                    )
                )
            ) or 0
            pending = await db.scalar(
                select(func.count(Address.pda_id)).where(
                    and_(
                        Address.zone_code == zone.primary_code,
                        Address.verification_status == "pending"
                    )
                )
            ) or 0

            zone_list.append(ZoneCoverage(
                zone_code=zone.primary_code,
                zone_name=zone.name,
                district_name=zone.district.name if zone.district else "Unknown",
                region_name=zone.district.region.name if zone.district and zone.district.region else "Unknown",
                address_count=zone.address_count,
                verified_count=verified,
                pending_count=pending
            ))

        total_zones = await db.scalar(select(func.count(Zone.id)).where(Zone.is_active == True)) or 0
        zones_with_addr = await db.scalar(
            select(func.count(Zone.id)).where(and_(Zone.is_active == True, Zone.address_count > 0))
        ) or 0

    except Exception:
        # Fallback to PostalZone model
        zone_list = []
        total_zones = await db.scalar(select(func.count(PostalZone.zone_code))) or 0
        zones_with_addr = await db.scalar(
            select(func.count(func.distinct(Address.zone_code)))
        ) or 0

    coverage_percent = (zones_with_addr / total_zones * 100) if total_zones > 0 else 0

    return ZoneCoverageResponse(
        zones=zone_list,
        total_zones=total_zones,
        zones_with_addresses=zones_with_addr,
        coverage_percent=round(coverage_percent, 1)
    )


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = Query(20, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get recent system activity."""

    activities = []

    # Recent address registrations
    recent_addresses = await db.execute(
        select(Address)
        .order_by(Address.created_at.desc())
        .limit(limit // 2)
    )
    for addr in recent_addresses.scalars():
        activities.append({
            "type": "address_registered",
            "description": f"New address registered: {addr.display_address or addr.pda_id}",
            "timestamp": addr.created_at.isoformat(),
            "user": addr.created_by
        })

    # Recent verifications
    recent_verified = await db.execute(
        select(Address)
        .where(Address.verification_status == "verified")
        .where(Address.verified_at.isnot(None))
        .order_by(Address.verified_at.desc())
        .limit(limit // 2)
    )
    for addr in recent_verified.scalars():
        activities.append({
            "type": "address_verified",
            "description": f"Address verified: {addr.pda_id}",
            "timestamp": addr.verified_at.isoformat() if addr.verified_at else addr.updated_at.isoformat(),
            "user": addr.verified_by
        })

    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return {"activities": activities[:limit]}
