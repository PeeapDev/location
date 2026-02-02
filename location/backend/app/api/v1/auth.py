"""Authentication API endpoints."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserStatus
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordChangeRequest,
)
from app.schemas.user import UserResponse, CurrentUserResponse
from app.services.security import SecurityService
from app.services.audit import AuditService
from app.api.deps import get_current_user, get_current_active_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    request_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with email and password.

    Returns access and refresh tokens on success.
    """
    # Find user by email
    stmt = select(User).where(User.email == request_data.email.lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        # Log failed attempt (no user_id available)
        await AuditService.log(
            db=db,
            action="login_failed",
            resource_type="session",
            description=f"Login failed: User not found ({request_data.email})",
            request=request,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        await AuditService.log_login(
            db=db,
            user_id=user.id,
            success=False,
            request=request,
            failure_reason="Account is locked",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is temporarily locked due to too many failed login attempts",
        )

    # Verify password
    if not SecurityService.verify_password(request_data.password, user.hashed_password):
        # Increment failed login attempts
        user.failed_login_attempts += 1

        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)

        await AuditService.log_login(
            db=db,
            user_id=user.id,
            success=False,
            request=request,
            failure_reason="Invalid password",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check account status
    if user.status == UserStatus.SUSPENDED.value:
        await AuditService.log_login(
            db=db,
            user_id=user.id,
            success=False,
            request=request,
            failure_reason="Account suspended",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )

    if user.status == UserStatus.PENDING.value:
        await AuditService.log_login(
            db=db,
            user_id=user.id,
            success=False,
            request=request,
            failure_reason="Account pending approval",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending approval",
        )

    # Reset failed login attempts on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    # Generate tokens
    access_token = SecurityService.create_access_token(
        user_id=str(user.id),
        role=user.role,
        email=user.email,
    )
    refresh_token = SecurityService.create_refresh_token(user_id=str(user.id))

    # Log successful login
    await AuditService.log_login(
        db=db,
        user_id=user.id,
        success=True,
        request=request,
    )

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=SecurityService.get_access_token_expire_seconds(),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh access token using refresh token.

    Returns new access and refresh tokens.
    """
    # Verify refresh token
    user_id = SecurityService.verify_refresh_token(request_data.refresh_token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Fetch user
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    # Generate new tokens
    access_token = SecurityService.create_access_token(
        user_id=str(user.id),
        role=user.role,
        email=user.email,
    )
    new_refresh_token = SecurityService.create_refresh_token(user_id=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=SecurityService.get_access_token_expire_seconds(),
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout current user.

    Note: With JWT, we can't truly invalidate tokens server-side without
    maintaining a blacklist. This endpoint logs the logout event.
    Client should discard tokens.
    """
    await AuditService.log_logout(
        db=db,
        user_id=current_user.id,
        request=request,
    )
    await db.commit()

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """Get current authenticated user's information."""
    # Build permissions list based on role
    permissions = _get_permissions_for_role(current_user.role)

    return CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role,
        status=current_user.status,
        assigned_region=current_user.assigned_region,
        assigned_district=current_user.assigned_district,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login,
        is_superadmin=current_user.is_superadmin,
        is_admin_or_above=current_user.is_admin_or_above,
        permissions=permissions,
    )


@router.put("/me/password")
async def change_password(
    request_data: PasswordChangeRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    # Verify current password
    if not SecurityService.verify_password(request_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash new password
    current_user.hashed_password = SecurityService.hash_password(request_data.new_password)

    # Log the password change
    await AuditService.log(
        db=db,
        action="password_change",
        resource_type="user",
        resource_id=str(current_user.id),
        user_id=current_user.id,
        description="User changed their password",
        request=request,
    )

    await db.commit()

    return {"message": "Password changed successfully"}


def _get_permissions_for_role(role: str) -> list[str]:
    """Get list of permissions for a given role."""
    base_permissions = ["address:read", "address:search"]

    role_permissions = {
        "superadmin": [
            *base_permissions,
            "address:create", "address:update", "address:delete",
            "address:approve", "address:reject",
            "user:read", "user:create", "user:update", "user:delete",
            "user:suspend", "user:activate",
            "api_key:read", "api_key:create", "api_key:revoke",
            "zone:read", "zone:create", "zone:update",
            "audit:read",
            "settings:read", "settings:update",
            "security:lockdown", "security:unlock",
        ],
        "admin": [
            *base_permissions,
            "address:create", "address:update",
            "address:approve", "address:reject",
            "user:read", "user:create", "user:update",
            "api_key:read", "api_key:create", "api_key:revoke",
            "zone:read",
            "audit:read",
        ],
        "business": [
            *base_permissions,
            "address:create",
            "api_key:read",
        ],
        "delivery_agent": [
            *base_permissions,
            "address:verify",
        ],
        "data_collector": [
            *base_permissions,
            "address:create",
        ],
    }

    return role_permissions.get(role, base_permissions)
