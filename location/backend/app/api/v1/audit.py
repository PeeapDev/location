"""Audit log query endpoints."""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.api.deps import get_admin_or_above

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    description: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    api_key_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditSummary(BaseModel):
    total_events: int
    events_today: int
    events_this_week: int
    top_actions: List[dict]
    top_users: List[dict]
    failed_logins_today: int
    security_events_today: int


class SecurityAlert(BaseModel):
    type: str
    severity: str  # low, medium, high, critical
    description: str
    count: int
    first_seen: datetime
    last_seen: datetime
    ip_addresses: List[str]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    ip_address: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """
    Query audit logs with filtering and pagination.

    Filters:
    - action: Filter by action type (login, create, update, delete, etc.)
    - resource_type: Filter by resource (user, address, zone, etc.)
    - resource_id: Filter by specific resource ID
    - user_id: Filter by user who performed the action
    - ip_address: Filter by IP address
    - start_date/end_date: Filter by date range
    - search: Search in description
    """
    query = select(AuditLog).options(selectinload(AuditLog.user))
    count_query = select(func.count(AuditLog.id))

    # Apply filters
    filters = []

    if action:
        filters.append(AuditLog.action == action)
    if resource_type:
        filters.append(AuditLog.resource_type == resource_type)
    if resource_id:
        filters.append(AuditLog.resource_id == resource_id)
    if user_id:
        filters.append(AuditLog.user_id == user_id)
    if ip_address:
        filters.append(AuditLog.ip_address == ip_address)
    if start_date:
        filters.append(AuditLog.created_at >= start_date)
    if end_date:
        filters.append(AuditLog.created_at <= end_date)
    if search:
        filters.append(AuditLog.description.ilike(f"%{search}%"))

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Get total count
    total = await db.scalar(count_query) or 0
    total_pages = (total + page_size - 1) // page_size

    # Apply pagination and ordering
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return AuditLogListResponse(
        logs=[
            AuditLogResponse(
                id=log.id,
                user_id=str(log.user_id) if log.user_id else None,
                user_email=log.user.email if log.user else None,
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                description=log.description,
                old_values=log.old_values,
                new_values=log.new_values,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                api_key_id=str(log.api_key_id) if log.api_key_id else None,
                created_at=log.created_at,
            )
            for log in logs
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/summary", response_model=AuditSummary)
async def get_audit_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get summary statistics for audit logs."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # Total events
    total_events = await db.scalar(select(func.count(AuditLog.id))) or 0

    # Events today
    events_today = await db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= today_start)
    ) or 0

    # Events this week
    events_this_week = await db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= week_start)
    ) or 0

    # Top actions (last 7 days)
    top_actions_query = (
        select(AuditLog.action, func.count(AuditLog.id).label("count"))
        .where(AuditLog.created_at >= week_start)
        .group_by(AuditLog.action)
        .order_by(desc("count"))
        .limit(10)
    )
    top_actions_result = await db.execute(top_actions_query)
    top_actions = [{"action": row.action, "count": row.count} for row in top_actions_result]

    # Top users (last 7 days)
    top_users_query = (
        select(AuditLog.user_id, func.count(AuditLog.id).label("count"))
        .where(and_(AuditLog.created_at >= week_start, AuditLog.user_id.isnot(None)))
        .group_by(AuditLog.user_id)
        .order_by(desc("count"))
        .limit(10)
    )
    top_users_result = await db.execute(top_users_query)

    # Get user emails
    top_users = []
    for row in top_users_result:
        user = await db.get(User, row.user_id)
        top_users.append({
            "user_id": str(row.user_id),
            "email": user.email if user else "Unknown",
            "count": row.count
        })

    # Failed logins today
    failed_logins_today = await db.scalar(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.action == "login_failed",
                AuditLog.created_at >= today_start
            )
        )
    ) or 0

    # Security events today (failed logins, lockouts, permission changes)
    security_actions = ["login_failed", "lockout", "suspend", "api_key_revoke", "emergency_lockdown"]
    security_events_today = await db.scalar(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.action.in_(security_actions),
                AuditLog.created_at >= today_start
            )
        )
    ) or 0

    return AuditSummary(
        total_events=total_events,
        events_today=events_today,
        events_this_week=events_this_week,
        top_actions=top_actions,
        top_users=top_users,
        failed_logins_today=failed_logins_today,
        security_events_today=security_events_today,
    )


@router.get("/security/alerts", response_model=List[SecurityAlert])
async def get_security_alerts(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get security alerts based on suspicious activity patterns."""
    alerts = []
    since = datetime.utcnow() - timedelta(hours=hours)

    # Check for brute force attempts (multiple failed logins from same IP)
    brute_force_query = (
        select(
            AuditLog.ip_address,
            func.count(AuditLog.id).label("count"),
            func.min(AuditLog.created_at).label("first_seen"),
            func.max(AuditLog.created_at).label("last_seen"),
        )
        .where(
            and_(
                AuditLog.action == "login_failed",
                AuditLog.created_at >= since,
                AuditLog.ip_address.isnot(None)
            )
        )
        .group_by(AuditLog.ip_address)
        .having(func.count(AuditLog.id) >= 5)
    )
    brute_force_result = await db.execute(brute_force_query)

    for row in brute_force_result:
        severity = "medium" if row.count < 10 else "high" if row.count < 20 else "critical"
        alerts.append(SecurityAlert(
            type="brute_force",
            severity=severity,
            description=f"Multiple failed login attempts from IP {row.ip_address}",
            count=row.count,
            first_seen=row.first_seen,
            last_seen=row.last_seen,
            ip_addresses=[row.ip_address],
        ))

    # Check for unusual admin activity
    admin_actions = ["settings_change", "emergency_lockdown", "api_key_create", "user_suspend"]
    admin_activity_query = (
        select(
            AuditLog.action,
            func.count(AuditLog.id).label("count"),
            func.min(AuditLog.created_at).label("first_seen"),
            func.max(AuditLog.created_at).label("last_seen"),
        )
        .where(
            and_(
                AuditLog.action.in_(admin_actions),
                AuditLog.created_at >= since
            )
        )
        .group_by(AuditLog.action)
        .having(func.count(AuditLog.id) >= 3)
    )
    admin_activity_result = await db.execute(admin_activity_query)

    for row in admin_activity_result:
        alerts.append(SecurityAlert(
            type="unusual_admin_activity",
            severity="medium",
            description=f"Elevated {row.action} activity detected",
            count=row.count,
            first_seen=row.first_seen,
            last_seen=row.last_seen,
            ip_addresses=[],
        ))

    # Check for API key abuse (many requests from single key)
    # This would typically check a separate rate limiting store

    return sorted(alerts, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}[x.severity])


@router.get("/security/failed-logins")
async def get_failed_logins(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get recent failed login attempts."""
    since = datetime.utcnow() - timedelta(hours=hours)

    query = (
        select(AuditLog)
        .where(
            and_(
                AuditLog.action == "login_failed",
                AuditLog.created_at >= since
            )
        )
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    # Group by IP
    by_ip = {}
    for log in logs:
        ip = log.ip_address or "unknown"
        if ip not in by_ip:
            by_ip[ip] = {"count": 0, "attempts": []}
        by_ip[ip]["count"] += 1
        by_ip[ip]["attempts"].append({
            "timestamp": log.created_at.isoformat(),
            "user_agent": log.user_agent,
            "details": log.new_values,
        })

    return {
        "total_failed": len(logs),
        "unique_ips": len(by_ip),
        "by_ip": by_ip,
    }


@router.get("/actions")
async def get_action_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get list of all action types in the audit log."""
    query = select(AuditLog.action).distinct().order_by(AuditLog.action)
    result = await db.execute(query)
    actions = [row[0] for row in result]
    return {"actions": actions}


@router.get("/resource-types")
async def get_resource_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get list of all resource types in the audit log."""
    query = select(AuditLog.resource_type).distinct().order_by(AuditLog.resource_type)
    result = await db.execute(query)
    types = [row[0] for row in result]
    return {"resource_types": types}
