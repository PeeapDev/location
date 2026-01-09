"""Postal Zone API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.functions import ST_AsGeoJSON

from app.database import get_db
from app.models.postal_zone import PostalZone, REGIONS
from app.models.address import Address
from app.schemas.postal_zone import (
    PostalZoneResponse,
    PostalZoneListResponse,
    PostalZoneSummary,
    DistrictSummary,
    RegionSummary
)

router = APIRouter()


@router.get("", response_model=PostalZoneListResponse)
async def list_zones(
    region: Optional[int] = Query(None, ge=1, le=5),
    district: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List postal zones with optional filtering.

    Filter by region (1-5) or district name.
    """
    stmt = select(PostalZone)

    if region:
        stmt = stmt.where(PostalZone.region_code == region)
    if district:
        stmt = stmt.where(PostalZone.district_name == district)

    stmt = stmt.order_by(PostalZone.zone_code).offset(offset).limit(limit)

    result = await db.execute(stmt)
    zones = result.scalars().all()

    # Get counts
    count_stmt = select(func.count(PostalZone.zone_code))
    if region:
        count_stmt = count_stmt.where(PostalZone.region_code == region)
    if district:
        count_stmt = count_stmt.where(PostalZone.district_name == district)

    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    zone_responses = []
    for zone in zones:
        # Get address count for zone
        addr_count_stmt = select(func.count(Address.pda_id)).where(Address.zone_code == zone.zone_code)
        addr_result = await db.execute(addr_count_stmt)
        addr_count = addr_result.scalar() or 0

        zone_responses.append(PostalZoneResponse(
            zone_code=zone.zone_code,
            primary_code=zone.primary_code,
            segment=zone.segment,
            region_code=zone.region_code,
            region_name=zone.region_name,
            district_code=zone.district_code,
            district_name=zone.district_name,
            zone_name=zone.zone_name,
            segment_type=zone.segment_type,
            address_count=addr_count,
            created_at=zone.created_at,
            geometry=None  # Exclude geometry from list view
        ))

    return PostalZoneListResponse(
        zones=zone_responses,
        total_count=total
    )


@router.get("/regions")
async def list_regions(db: AsyncSession = Depends(get_db)):
    """
    List all regions with summary statistics.
    """
    regions = []

    for code, name in REGIONS.items():
        # Get district count
        district_stmt = (
            select(func.count(func.distinct(PostalZone.district_code)))
            .where(PostalZone.region_code == code)
        )
        district_result = await db.execute(district_stmt)
        district_count = district_result.scalar() or 0

        # Get zone count
        zone_stmt = select(func.count(PostalZone.zone_code)).where(PostalZone.region_code == code)
        zone_result = await db.execute(zone_stmt)
        zone_count = zone_result.scalar() or 0

        # Get address count
        addr_stmt = (
            select(func.count(Address.pda_id))
            .join(PostalZone, Address.zone_code == PostalZone.zone_code)
            .where(PostalZone.region_code == code)
        )
        addr_result = await db.execute(addr_stmt)
        addr_count = addr_result.scalar() or 0

        regions.append(RegionSummary(
            region_code=code,
            region_name=name,
            district_count=district_count,
            zone_count=zone_count,
            address_count=addr_count
        ))

    return regions


@router.get("/districts")
async def list_districts(
    region: Optional[int] = Query(None, ge=1, le=5),
    db: AsyncSession = Depends(get_db)
):
    """
    List all districts with summary statistics.
    """
    stmt = (
        select(
            PostalZone.district_code,
            PostalZone.district_name,
            PostalZone.region_name,
            func.count(PostalZone.zone_code).label("zone_count")
        )
        .group_by(
            PostalZone.district_code,
            PostalZone.district_name,
            PostalZone.region_name
        )
    )

    if region:
        stmt = stmt.where(PostalZone.region_code == region)

    result = await db.execute(stmt)
    rows = result.all()

    districts = []
    for row in rows:
        # Get address count for district
        addr_stmt = (
            select(func.count(Address.pda_id))
            .join(PostalZone, Address.zone_code == PostalZone.zone_code)
            .where(PostalZone.district_name == row.district_name)
        )
        addr_result = await db.execute(addr_stmt)
        addr_count = addr_result.scalar() or 0

        districts.append(DistrictSummary(
            district_code=row.district_code,
            district_name=row.district_name,
            region_name=row.region_name,
            zone_count=row.zone_count,
            address_count=addr_count
        ))

    return districts


@router.get("/{zone_code}", response_model=PostalZoneResponse)
async def get_zone(
    zone_code: str,
    include_geometry: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """
    Get postal zone details by code.

    Set include_geometry=true to include the zone boundary polygon.
    """
    stmt = select(PostalZone).where(PostalZone.zone_code == zone_code)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Postal zone not found")

    # Get address count
    addr_stmt = select(func.count(Address.pda_id)).where(Address.zone_code == zone_code)
    addr_result = await db.execute(addr_stmt)
    addr_count = addr_result.scalar() or 0

    # Get geometry as GeoJSON if requested
    geometry = None
    if include_geometry and zone.geometry:
        geom_stmt = select(ST_AsGeoJSON(zone.geometry))
        geom_result = await db.execute(geom_stmt)
        geometry = geom_result.scalar()

    return PostalZoneResponse(
        zone_code=zone.zone_code,
        primary_code=zone.primary_code,
        segment=zone.segment,
        region_code=zone.region_code,
        region_name=zone.region_name,
        district_code=zone.district_code,
        district_name=zone.district_name,
        zone_name=zone.zone_name,
        segment_type=zone.segment_type,
        address_count=addr_count,
        created_at=zone.created_at,
        geometry=geometry
    )


@router.get("/{zone_code}/addresses")
async def get_zone_addresses(
    zone_code: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List all addresses in a postal zone.
    """
    # Verify zone exists
    zone_stmt = select(PostalZone).where(PostalZone.zone_code == zone_code)
    zone_result = await db.execute(zone_stmt)
    zone = zone_result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Postal zone not found")

    # Get addresses
    stmt = (
        select(Address)
        .where(Address.zone_code == zone_code)
        .order_by(Address.pda_id)
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(stmt)
    addresses = result.scalars().all()

    # Get total count
    count_stmt = select(func.count(Address.pda_id)).where(Address.zone_code == zone_code)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    return {
        "zone_code": zone_code,
        "zone_name": zone.zone_name,
        "addresses": [
            {
                "pda_id": addr.pda_id,
                "display_address": addr.display_address,
                "latitude": addr.latitude,
                "longitude": addr.longitude,
                "confidence_score": addr.confidence_score,
                "verification_status": addr.verification_status.value
            }
            for addr in addresses
        ],
        "total_count": total
    }
