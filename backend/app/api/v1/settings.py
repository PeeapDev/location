"""System settings management endpoints."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.system_settings import SystemSettings
from app.models.user import User
from app.models.audit_log import AuditLog
from app.api.deps import get_admin_or_above, get_superadmin

router = APIRouter()


# =============================================================================
# Schemas
# =============================================================================

class SettingResponse(BaseModel):
    key: str
    value: Any
    description: Optional[str]
    category: Optional[str]
    updated_at: Optional[datetime]
    updated_by: Optional[str]

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: Any


class SettingCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: Any
    description: Optional[str] = None
    category: Optional[str] = None


class BulkSettingUpdate(BaseModel):
    settings: dict[str, Any]


class LockdownRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


# =============================================================================
# Endpoints
# =============================================================================

@router.get("", response_model=List[SettingResponse])
async def list_settings(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """List all system settings, optionally filtered by category."""
    query = select(SystemSettings)

    if category:
        query = query.where(SystemSettings.category == category)

    query = query.order_by(SystemSettings.category, SystemSettings.key)

    result = await db.execute(query)
    settings = result.scalars().all()

    return [
        SettingResponse(
            key=s.key,
            value=s.value,
            description=s.description,
            category=s.category,
            updated_at=s.updated_at,
            updated_by=str(s.updated_by) if s.updated_by else None,
        )
        for s in settings
    ]


@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get list of setting categories."""
    query = select(SystemSettings.category).distinct().where(SystemSettings.category.isnot(None))
    result = await db.execute(query)
    categories = [row[0] for row in result if row[0]]
    return {"categories": sorted(categories)}


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get a specific setting by key."""
    setting = await db.get(SystemSettings, key)

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        description=setting.description,
        category=setting.category,
        updated_at=setting.updated_at,
        updated_by=str(setting.updated_by) if setting.updated_by else None,
    )


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Update a system setting. Requires superadmin role."""
    setting = await db.get(SystemSettings, key)

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    # Store old value for audit
    old_value = setting.value

    # Update the setting
    setting.value = data.value
    setting.updated_at = datetime.utcnow()
    setting.updated_by = current_user.id

    # Audit log
    audit_log = AuditLog.create_log(
        action="settings_change",
        resource_type="settings",
        resource_id=key,
        user_id=str(current_user.id),
        old_values={"value": old_value},
        new_values={"value": data.value},
        description=f"Updated setting '{key}'",
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(setting)

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        description=setting.description,
        category=setting.category,
        updated_at=setting.updated_at,
        updated_by=str(setting.updated_by) if setting.updated_by else None,
    )


@router.post("", response_model=SettingResponse)
async def create_setting(
    data: SettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Create a new system setting. Requires superadmin role."""
    # Check if setting already exists
    existing = await db.get(SystemSettings, data.key)
    if existing:
        raise HTTPException(status_code=400, detail=f"Setting '{data.key}' already exists")

    setting = SystemSettings(
        key=data.key,
        value=data.value,
        description=data.description,
        category=data.category,
        updated_by=current_user.id,
    )

    db.add(setting)

    # Audit log
    audit_log = AuditLog.create_log(
        action="settings_create",
        resource_type="settings",
        resource_id=data.key,
        user_id=str(current_user.id),
        new_values={"value": data.value, "category": data.category},
        description=f"Created setting '{data.key}'",
    )
    db.add(audit_log)

    await db.commit()
    await db.refresh(setting)

    return SettingResponse(
        key=setting.key,
        value=setting.value,
        description=setting.description,
        category=setting.category,
        updated_at=setting.updated_at,
        updated_by=str(setting.updated_by) if setting.updated_by else None,
    )


@router.delete("/{key}")
async def delete_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Delete a system setting. Requires superadmin role."""
    setting = await db.get(SystemSettings, key)

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    # Prevent deletion of core settings
    core_settings = ["lockdown_mode", "maintenance_mode", "registration_enabled"]
    if key in core_settings:
        raise HTTPException(status_code=400, detail=f"Cannot delete core setting '{key}'")

    old_value = setting.value
    await db.delete(setting)

    # Audit log
    audit_log = AuditLog.create_log(
        action="settings_delete",
        resource_type="settings",
        resource_id=key,
        user_id=str(current_user.id),
        old_values={"value": old_value},
        description=f"Deleted setting '{key}'",
    )
    db.add(audit_log)

    await db.commit()

    return {"message": f"Setting '{key}' deleted successfully"}


@router.put("/bulk", response_model=List[SettingResponse])
async def bulk_update_settings(
    data: BulkSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Update multiple settings at once. Requires superadmin role."""
    updated_settings = []

    for key, value in data.settings.items():
        setting = await db.get(SystemSettings, key)

        if not setting:
            continue  # Skip non-existent settings

        old_value = setting.value
        setting.value = value
        setting.updated_at = datetime.utcnow()
        setting.updated_by = current_user.id

        # Audit log for each change
        audit_log = AuditLog.create_log(
            action="settings_change",
            resource_type="settings",
            resource_id=key,
            user_id=str(current_user.id),
            old_values={"value": old_value},
            new_values={"value": value},
            description=f"Bulk updated setting '{key}'",
        )
        db.add(audit_log)

        updated_settings.append(setting)

    await db.commit()

    return [
        SettingResponse(
            key=s.key,
            value=s.value,
            description=s.description,
            category=s.category,
            updated_at=s.updated_at,
            updated_by=str(s.updated_by) if s.updated_by else None,
        )
        for s in updated_settings
    ]


# =============================================================================
# Emergency Controls
# =============================================================================

@router.post("/lockdown/activate")
async def activate_lockdown(
    data: LockdownRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """
    Activate emergency lockdown mode.
    This disables all non-superadmin access to the system.
    Requires superadmin role.
    """
    # Update lockdown settings
    lockdown_setting = await db.get(SystemSettings, "lockdown_mode")
    reason_setting = await db.get(SystemSettings, "lockdown_reason")

    if not lockdown_setting:
        lockdown_setting = SystemSettings(
            key="lockdown_mode",
            value=True,
            description="Emergency lockdown - disable all non-admin access",
            category="security",
            updated_by=current_user.id,
        )
        db.add(lockdown_setting)
    else:
        lockdown_setting.value = True
        lockdown_setting.updated_at = datetime.utcnow()
        lockdown_setting.updated_by = current_user.id

    if not reason_setting:
        reason_setting = SystemSettings(
            key="lockdown_reason",
            value=data.reason,
            description="Reason for emergency lockdown",
            category="security",
            updated_by=current_user.id,
        )
        db.add(reason_setting)
    else:
        reason_setting.value = data.reason
        reason_setting.updated_at = datetime.utcnow()
        reason_setting.updated_by = current_user.id

    # Audit log
    audit_log = AuditLog.create_log(
        action="emergency_lockdown",
        resource_type="system",
        resource_id="lockdown",
        user_id=str(current_user.id),
        new_values={"reason": data.reason, "activated_at": datetime.utcnow().isoformat()},
        description=f"Emergency lockdown activated: {data.reason}",
    )
    db.add(audit_log)

    await db.commit()

    return {
        "message": "Emergency lockdown activated",
        "reason": data.reason,
        "activated_at": datetime.utcnow().isoformat(),
        "activated_by": current_user.email,
    }


@router.post("/lockdown/deactivate")
async def deactivate_lockdown(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """
    Deactivate emergency lockdown mode.
    Requires superadmin role.
    """
    lockdown_setting = await db.get(SystemSettings, "lockdown_mode")

    if not lockdown_setting or not lockdown_setting.value:
        raise HTTPException(status_code=400, detail="System is not in lockdown mode")

    # Get the reason for audit purposes
    reason_setting = await db.get(SystemSettings, "lockdown_reason")
    old_reason = reason_setting.value if reason_setting else "Unknown"

    # Deactivate lockdown
    lockdown_setting.value = False
    lockdown_setting.updated_at = datetime.utcnow()
    lockdown_setting.updated_by = current_user.id

    if reason_setting:
        reason_setting.value = ""
        reason_setting.updated_at = datetime.utcnow()
        reason_setting.updated_by = current_user.id

    # Audit log
    audit_log = AuditLog.create_log(
        action="emergency_unlock",
        resource_type="system",
        resource_id="lockdown",
        user_id=str(current_user.id),
        old_values={"reason": old_reason},
        new_values={"deactivated_at": datetime.utcnow().isoformat()},
        description="Emergency lockdown deactivated",
    )
    db.add(audit_log)

    await db.commit()

    return {
        "message": "Emergency lockdown deactivated",
        "deactivated_at": datetime.utcnow().isoformat(),
        "deactivated_by": current_user.email,
    }


@router.get("/lockdown/status")
async def get_lockdown_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Get current lockdown status."""
    lockdown_setting = await db.get(SystemSettings, "lockdown_mode")
    reason_setting = await db.get(SystemSettings, "lockdown_reason")

    is_locked = lockdown_setting.value if lockdown_setting else False
    reason = reason_setting.value if reason_setting and is_locked else None

    return {
        "is_locked": is_locked,
        "reason": reason,
        "updated_at": lockdown_setting.updated_at.isoformat() if lockdown_setting else None,
    }


@router.post("/initialize")
async def initialize_default_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """
    Initialize default system settings.
    Only creates settings that don't already exist.
    Requires superadmin role.
    """
    default_settings = SystemSettings.get_default_settings()
    created = []

    for setting in default_settings:
        existing = await db.get(SystemSettings, setting.key)
        if not existing:
            setting.updated_by = current_user.id
            db.add(setting)
            created.append(setting.key)

    if created:
        # Audit log
        audit_log = AuditLog.create_log(
            action="settings_initialize",
            resource_type="settings",
            user_id=str(current_user.id),
            new_values={"created_settings": created},
            description=f"Initialized {len(created)} default settings",
        )
        db.add(audit_log)

        await db.commit()

    return {
        "message": f"Initialized {len(created)} settings",
        "created": created,
    }
