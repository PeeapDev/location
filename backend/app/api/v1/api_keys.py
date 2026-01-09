"""API Key management endpoints."""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.api_key import APIKey
from app.models.user import User
from app.models.audit_log import AuditLog
from app.api.deps import get_current_active_user, get_admin_or_above

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    scopes: List[str] = Field(default=["read"])
    rate_limit_per_minute: int = Field(default=60, ge=1, le=1000)
    rate_limit_per_hour: int = Field(default=1000, ge=1, le=10000)
    rate_limit_per_day: int = Field(default=10000, ge=1, le=100000)
    allowed_endpoints: List[str] = Field(default=[])
    allowed_ips: List[str] = Field(default=[])
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class APIKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    key_prefix: str
    scopes: List[str]
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    rate_limit_per_day: int
    allowed_endpoints: List[str]
    allowed_ips: List[str]
    total_requests: int
    last_used_at: Optional[datetime]
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class APIKeyCreateResponse(BaseModel):
    """Response when creating a new API key - includes the full key (shown only once)."""
    id: str
    name: str
    key: str  # Full key - only shown once at creation
    key_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime]
    created_at: datetime


class APIKeyUsageStats(BaseModel):
    total_requests: int
    requests_today: int
    requests_this_week: int
    requests_this_month: int
    last_used_at: Optional[datetime]
    last_used_ip: Optional[str]


# =============================================================================
# Helper Functions
# =============================================================================

def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        tuple: (full_key, key_prefix, key_hash)
    """
    # Generate a secure random key: xeeno_sk_<40 random chars>
    random_part = secrets.token_hex(20)
    full_key = f"xeeno_sk_{random_part}"
    key_prefix = full_key[:16]  # "xeeno_sk_xxxxxx"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash


def hash_api_key(key: str) -> str:
    """Hash an API key for storage/comparison."""
    return hashlib.sha256(key.encode()).hexdigest()


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    user_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """List API keys. Admins see all keys, regular users see only their own."""
    query = select(APIKey).options(selectinload(APIKey.user))

    # Filter by user if specified or if not superadmin
    if user_id:
        query = query.where(APIKey.user_id == user_id)
    elif current_user.role != "superadmin":
        query = query.where(APIKey.user_id == current_user.id)

    if is_active is not None:
        query = query.where(APIKey.is_active == is_active)

    query = query.order_by(APIKey.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    keys = result.scalars().all()

    return [
        APIKeyResponse(
            id=str(key.id),
            name=key.name,
            description=key.description,
            key_prefix=key.key_prefix,
            scopes=key.scopes or [],
            rate_limit_per_minute=key.rate_limit_per_minute,
            rate_limit_per_hour=key.rate_limit_per_hour,
            rate_limit_per_day=key.rate_limit_per_day,
            allowed_endpoints=key.allowed_endpoints or [],
            allowed_ips=key.allowed_ips or [],
            total_requests=key.total_requests,
            last_used_at=key.last_used_at,
            is_active=key.is_active,
            expires_at=key.expires_at,
            created_at=key.created_at,
            user_email=key.user.email if key.user else None,
        )
        for key in keys
    ]


@router.post("", response_model=APIKeyCreateResponse)
async def create_api_key(
    data: APIKeyCreate,
    for_user_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new API key. The full key is only shown once in the response."""
    # Determine which user the key is for
    target_user_id = current_user.id
    if for_user_id and current_user.role in ["superadmin", "admin"]:
        target_user_id = for_user_id
    elif for_user_id:
        raise HTTPException(status_code=403, detail="Cannot create keys for other users")

    # Validate scopes
    valid_scopes = ["read", "write", "admin"]
    for scope in data.scopes:
        if scope not in valid_scopes:
            raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")

    # Only superadmins can create admin-scoped keys
    if "admin" in data.scopes and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can create admin-scoped keys")

    # Generate the key
    full_key, key_prefix, key_hash = generate_api_key()

    # Calculate expiration
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

    # Create the API key
    api_key = APIKey(
        user_id=target_user_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=data.name,
        description=data.description,
        scopes=data.scopes,
        rate_limit_per_minute=data.rate_limit_per_minute,
        rate_limit_per_hour=data.rate_limit_per_hour,
        rate_limit_per_day=data.rate_limit_per_day,
        allowed_endpoints=data.allowed_endpoints,
        allowed_ips=data.allowed_ips,
        expires_at=expires_at,
    )

    db.add(api_key)

    # Audit log
    audit_log = AuditLog.create_log(
        action="api_key_create",
        resource_type="api_key",
        resource_id=str(api_key.id),
        user_id=str(current_user.id),
        new_values={"name": data.name, "scopes": data.scopes, "for_user": str(target_user_id)},
        description=f"Created API key '{data.name}'",
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(api_key)

    return APIKeyCreateResponse(
        id=str(api_key.id),
        name=api_key.name,
        key=full_key,  # Only time the full key is returned
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
    )


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get API key details."""
    query = select(APIKey).options(selectinload(APIKey.user)).where(APIKey.id == key_id)
    result = await db.execute(query)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check access
    if api_key.user_id != current_user.id and current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return APIKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        description=api_key.description,
        key_prefix=api_key.key_prefix,
        scopes=api_key.scopes or [],
        rate_limit_per_minute=api_key.rate_limit_per_minute,
        rate_limit_per_hour=api_key.rate_limit_per_hour,
        rate_limit_per_day=api_key.rate_limit_per_day,
        allowed_endpoints=api_key.allowed_endpoints or [],
        allowed_ips=api_key.allowed_ips or [],
        total_requests=api_key.total_requests,
        last_used_at=api_key.last_used_at,
        is_active=api_key.is_active,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
        user_email=api_key.user.email if api_key.user else None,
    )


@router.get("/{key_id}/usage", response_model=APIKeyUsageStats)
async def get_api_key_usage(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get usage statistics for an API key."""
    query = select(APIKey).where(APIKey.id == key_id)
    result = await db.execute(query)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check access
    if api_key.user_id != current_user.id and current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get usage from audit logs
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Count requests from audit logs
    requests_today = await db.scalar(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.api_key_id == key_id,
                AuditLog.created_at >= today_start
            )
        )
    ) or 0

    requests_this_week = await db.scalar(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.api_key_id == key_id,
                AuditLog.created_at >= week_start
            )
        )
    ) or 0

    requests_this_month = await db.scalar(
        select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.api_key_id == key_id,
                AuditLog.created_at >= month_start
            )
        )
    ) or 0

    return APIKeyUsageStats(
        total_requests=api_key.total_requests,
        requests_today=requests_today,
        requests_this_week=requests_this_week,
        requests_this_month=requests_this_month,
        last_used_at=api_key.last_used_at,
        last_used_ip=api_key.last_used_ip,
    )


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke (deactivate) an API key."""
    query = select(APIKey).where(APIKey.id == key_id)
    result = await db.execute(query)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check access - only owner or admin can revoke
    if api_key.user_id != current_user.id and current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not api_key.is_active:
        raise HTTPException(status_code=400, detail="API key is already revoked")

    # Revoke the key
    api_key.is_active = False
    api_key.revoked_at = datetime.utcnow()
    api_key.revoked_by = current_user.id

    # Audit log
    audit_log = AuditLog.create_log(
        action="api_key_revoke",
        resource_type="api_key",
        resource_id=str(api_key.id),
        user_id=str(current_user.id),
        old_values={"is_active": True},
        new_values={"is_active": False},
        description=f"Revoked API key '{api_key.name}'",
    )
    db.add(audit_log)

    await db.commit()

    return {"message": "API key revoked successfully"}


@router.post("/{key_id}/regenerate", response_model=APIKeyCreateResponse)
async def regenerate_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Regenerate an API key (creates new key, revokes old one)."""
    query = select(APIKey).where(APIKey.id == key_id)
    result = await db.execute(query)
    old_key = result.scalar_one_or_none()

    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check access
    if old_key.user_id != current_user.id and current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Revoke old key
    old_key.is_active = False
    old_key.revoked_at = datetime.utcnow()
    old_key.revoked_by = current_user.id

    # Generate new key with same settings
    full_key, key_prefix, key_hash = generate_api_key()

    new_key = APIKey(
        user_id=old_key.user_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=old_key.name,
        description=old_key.description,
        scopes=old_key.scopes,
        rate_limit_per_minute=old_key.rate_limit_per_minute,
        rate_limit_per_hour=old_key.rate_limit_per_hour,
        rate_limit_per_day=old_key.rate_limit_per_day,
        allowed_endpoints=old_key.allowed_endpoints,
        allowed_ips=old_key.allowed_ips,
        expires_at=old_key.expires_at,
    )

    db.add(new_key)

    # Audit log
    audit_log = AuditLog.create_log(
        action="api_key_regenerate",
        resource_type="api_key",
        resource_id=str(new_key.id),
        user_id=str(current_user.id),
        old_values={"old_key_id": str(old_key.id)},
        new_values={"new_key_prefix": key_prefix},
        description=f"Regenerated API key '{old_key.name}'",
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(new_key)

    return APIKeyCreateResponse(
        id=str(new_key.id),
        name=new_key.name,
        key=full_key,
        key_prefix=new_key.key_prefix,
        scopes=new_key.scopes,
        expires_at=new_key.expires_at,
        created_at=new_key.created_at,
    )
