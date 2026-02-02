"""Audit service for logging system changes."""

from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.models.audit_log import AuditLog


class AuditService:
    """
    Service for recording audit logs.

    Tracks all significant system actions for compliance and security monitoring.
    """

    @classmethod
    async def log(
        cls,
        db: AsyncSession,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        description: Optional[str] = None,
        request: Optional[Request] = None,
        api_key_id: Optional[UUID] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.

        Args:
            db: Database session
            action: The action performed (login, create, update, delete, approve, etc.)
            resource_type: Type of resource affected (user, address, zone, api_key, etc.)
            resource_id: ID of the specific resource (optional)
            user_id: ID of the user who performed the action (optional)
            old_values: Previous values before change (optional)
            new_values: New values after change (optional)
            description: Human-readable description (optional)
            request: FastAPI Request object for IP/user-agent extraction (optional)
            api_key_id: ID of API key used for the action (optional)

        Returns:
            The created AuditLog entry
        """
        ip_address = None
        user_agent = None

        if request:
            # Extract client IP (handles proxies)
            ip_address = request.client.host if request.client else None
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()

            user_agent = request.headers.get("User-Agent", "")[:500]

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            api_key_id=api_key_id,
        )

        db.add(audit_log)
        await db.flush()  # Get the ID without committing

        return audit_log

    @classmethod
    async def log_login(
        cls,
        db: AsyncSession,
        user_id: UUID,
        success: bool,
        request: Optional[Request] = None,
        failure_reason: Optional[str] = None,
    ) -> AuditLog:
        """Log a login attempt."""
        action = "login" if success else "login_failed"
        description = failure_reason if not success else "Successful login"

        return await cls.log(
            db=db,
            action=action,
            resource_type="session",
            user_id=user_id if success else None,
            description=description,
            request=request,
            new_values={"user_id": str(user_id)} if not success else None,
        )

    @classmethod
    async def log_logout(
        cls,
        db: AsyncSession,
        user_id: UUID,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a logout."""
        return await cls.log(
            db=db,
            action="logout",
            resource_type="session",
            user_id=user_id,
            request=request,
        )

    @classmethod
    async def log_user_action(
        cls,
        db: AsyncSession,
        action: str,
        user_id: UUID,
        target_user_id: UUID,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a user management action."""
        return await cls.log(
            db=db,
            action=action,
            resource_type="user",
            resource_id=str(target_user_id),
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            request=request,
        )

    @classmethod
    async def log_address_action(
        cls,
        db: AsyncSession,
        action: str,
        pda_id: str,
        user_id: Optional[UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
        api_key_id: Optional[UUID] = None,
    ) -> AuditLog:
        """Log an address-related action."""
        return await cls.log(
            db=db,
            action=action,
            resource_type="address",
            resource_id=pda_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            request=request,
            api_key_id=api_key_id,
        )

    @classmethod
    async def log_api_key_action(
        cls,
        db: AsyncSession,
        action: str,
        api_key_id: UUID,
        user_id: UUID,
        new_values: Optional[dict] = None,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log an API key action."""
        return await cls.log(
            db=db,
            action=action,
            resource_type="api_key",
            resource_id=str(api_key_id),
            user_id=user_id,
            new_values=new_values,
            request=request,
        )

    @classmethod
    async def log_settings_change(
        cls,
        db: AsyncSession,
        setting_key: str,
        user_id: UUID,
        old_value: any,
        new_value: any,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a system settings change."""
        return await cls.log(
            db=db,
            action="settings_change",
            resource_type="settings",
            resource_id=setting_key,
            user_id=user_id,
            old_values={"value": old_value},
            new_values={"value": new_value},
            request=request,
        )

    @classmethod
    async def log_security_event(
        cls,
        db: AsyncSession,
        action: str,
        user_id: UUID,
        description: str,
        request: Optional[Request] = None,
    ) -> AuditLog:
        """Log a security-related event (lockdown, unlock, etc.)."""
        return await cls.log(
            db=db,
            action=action,
            resource_type="security",
            user_id=user_id,
            description=description,
            request=request,
        )
