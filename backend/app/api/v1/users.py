"""User management API endpoints."""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
)
from app.schemas.auth import PasswordResetRequest
from app.services.security import SecurityService
from app.services.audit import AuditService
from app.api.deps import get_current_active_user, get_admin_or_above, get_superadmin

router = APIRouter()


@router.get("", response_model=UserListResponse)
async def list_users(
    role: Optional[UserRole] = None,
    status_filter: Optional[UserStatus] = Query(None, alias="status"),
    region: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users with optional filters.

    Accessible by Admin and Superadmin.
    Admins can only see users in their assigned region.
    """
    stmt = select(User)

    # Admins can only see users in their region (unless superadmin)
    if not current_user.is_superadmin and current_user.assigned_region:
        stmt = stmt.where(User.assigned_region == current_user.assigned_region)

    # Apply filters
    if role:
        stmt = stmt.where(User.role == role.value)

    if status_filter:
        stmt = stmt.where(User.status == status_filter.value)

    if region:
        stmt = stmt.where(User.assigned_region == region)

    if search:
        search_pattern = f"%{search.lower()}%"
        stmt = stmt.where(
            (func.lower(User.email).like(search_pattern)) |
            (func.lower(User.full_name).like(search_pattern))
        )

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    # Apply pagination and ordering
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    users = result.scalars().all()

    return UserListResponse(
        users=[UserResponse.model_validate(user) for user in users],
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user.

    Only Superadmin can create users.
    """
    # Check if email already exists
    stmt = select(User).where(User.email == user_data.email.lower())
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    new_user = User(
        email=user_data.email.lower(),
        hashed_password=SecurityService.hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role.value,
        status=UserStatus.ACTIVE.value,  # Superadmin-created users are active by default
        assigned_region=user_data.assigned_region,
        assigned_district=user_data.assigned_district,
    )

    db.add(new_user)
    await db.flush()  # Get the ID

    # Log the action
    await AuditService.log_user_action(
        db=db,
        action="create",
        user_id=current_user.id,
        target_user_id=new_user.id,
        new_values={
            "email": new_user.email,
            "role": new_user.role,
            "assigned_region": new_user.assigned_region,
        },
        request=request,
    )

    await db.commit()
    await db.refresh(new_user)

    return UserResponse.model_validate(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user details by ID.

    Admins can only view users in their region.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Admins can only view users in their region
    if not current_user.is_superadmin and current_user.assigned_region:
        if user.assigned_region != current_user.assigned_region:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view users outside your region",
            )

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user details.

    Only Superadmin can update users.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent superadmin from demoting themselves
    if user.id == current_user.id and user_data.role and user_data.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )

    # Store old values for audit
    old_values = {
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "status": user.status,
        "assigned_region": user.assigned_region,
        "assigned_district": user.assigned_district,
    }

    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "role" and value:
            setattr(user, field, value.value)
        elif field == "status" and value:
            setattr(user, field, value.value)
        else:
            setattr(user, field, value)

    # Log the action
    new_values = {k: getattr(user, k) for k in old_values.keys()}
    await AuditService.log_user_action(
        db=db,
        action="update",
        user_id=current_user.id,
        target_user_id=user.id,
        old_values=old_values,
        new_values=new_values,
        request=request,
    )

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Suspend a user account.

    Only Superadmin can suspend users.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Cannot suspend yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own account",
        )

    # Cannot suspend another superadmin
    if user.role == UserRole.SUPERADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend a superadmin",
        )

    old_status = user.status
    user.status = UserStatus.SUSPENDED.value

    # Log the action
    await AuditService.log_user_action(
        db=db,
        action="suspend",
        user_id=current_user.id,
        target_user_id=user.id,
        old_values={"status": old_status},
        new_values={"status": user.status},
        request=request,
    )

    await db.commit()

    return {"message": f"User {user.email} has been suspended"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate a suspended or pending user account.

    Only Superadmin can activate users.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_status = user.status
    user.status = UserStatus.ACTIVE.value
    user.failed_login_attempts = 0
    user.locked_until = None

    # Log the action
    await AuditService.log_user_action(
        db=db,
        action="activate",
        user_id=current_user.id,
        target_user_id=user.id,
        old_values={"status": old_status},
        new_values={"status": user.status},
        request=request,
    )

    await db.commit()

    return {"message": f"User {user.email} has been activated"}


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: UUID,
    password_data: PasswordResetRequest,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Reset a user's password (admin action).

    Only Superadmin can reset passwords.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Hash and set new password
    user.hashed_password = SecurityService.hash_password(password_data.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None

    # Log the action
    await AuditService.log_user_action(
        db=db,
        action="password_reset",
        user_id=current_user.id,
        target_user_id=user.id,
        new_values={"password_reset": True},
        request=request,
    )

    await db.commit()

    return {"message": f"Password reset for user {user.email}"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    request: Request,
    current_user: User = Depends(get_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a user account.

    Only Superadmin can delete users.
    Use with caution - this is permanent.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Cannot delete yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    # Cannot delete superadmins
    if user.role == UserRole.SUPERADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a superadmin account",
        )

    # Log the action before deletion
    await AuditService.log_user_action(
        db=db,
        action="delete",
        user_id=current_user.id,
        target_user_id=user.id,
        old_values={
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
        },
        request=request,
    )

    await db.delete(user)
    await db.commit()
