"""FastAPI dependencies for authentication and authorization."""

from typing import Optional, List
from uuid import UUID
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.api_key import APIKey
from app.services.security import SecurityService

# Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate JWT token and return the current user.

    This dependency extracts the JWT from the Authorization header,
    validates it, and returns the associated user.

    Raises:
        HTTPException: If token is missing, invalid, or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = SecurityService.verify_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
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

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Ensure the current user is active.

    Raises:
        HTTPException: If user is suspended or pending
    """
    if current_user.status == UserStatus.SUSPENDED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )

    if current_user.status == UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending approval",
        )

    return current_user


def require_roles(*allowed_roles: UserRole):
    """
    Create a dependency that requires specific roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_roles(UserRole.ADMIN))])
        async def admin_endpoint():
            ...

    Or as a parameter dependency:
        async def endpoint(user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERADMIN))):
            ...
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        # Convert role strings to values for comparison
        allowed_role_values = [role.value for role in allowed_roles]

        if current_user.role not in allowed_role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_role_values)}",
            )

        return current_user

    return role_checker


# Convenience dependencies for common role checks
get_superadmin = require_roles(UserRole.SUPERADMIN)
get_admin_or_above = require_roles(UserRole.SUPERADMIN, UserRole.ADMIN)
get_staff = require_roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.DELIVERY_AGENT, UserRole.DATA_COLLECTOR)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.

    Useful for endpoints that behave differently for authenticated vs anonymous users.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = SecurityService.verify_access_token(token)

    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_api_key_user(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate API key and return the associated user.

    Used for business user authentication via API key.

    Raises:
        HTTPException: If API key is missing, invalid, or associated user not found
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # Hash the provided key
    key_hash = SecurityService.hash_api_key(x_api_key)

    # Look up the API key
    stmt = select(APIKey).where(APIKey.key_hash == key_hash)
    result = await db.execute(stmt)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if not api_key.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is expired or revoked",
        )

    # Fetch the associated user
    stmt = select(User).where(User.id == api_key.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key owner not found",
        )

    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active",
        )

    return user


async def get_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> APIKey:
    """
    Validate and return the API key object.

    Useful when you need access to the API key itself (for rate limiting, usage tracking, etc.)
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
        )

    key_hash = SecurityService.hash_api_key(x_api_key)

    stmt = select(APIKey).where(APIKey.key_hash == key_hash)
    result = await db.execute(stmt)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if not api_key.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is expired or revoked",
        )

    return api_key


async def get_user_or_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authenticate via either JWT token or API key.

    Useful for endpoints that support both internal users and business API access.
    """
    # Try JWT first
    if credentials:
        token = credentials.credentials
        payload = SecurityService.verify_access_token(token)

        if payload:
            user_id = payload.get("sub")
            if user_id:
                try:
                    user_uuid = UUID(user_id)
                    stmt = select(User).where(User.id == user_uuid)
                    result = await db.execute(stmt)
                    user = result.scalar_one_or_none()
                    if user and user.status == UserStatus.ACTIVE.value:
                        return user
                except ValueError:
                    pass

    # Try API key
    if x_api_key:
        key_hash = SecurityService.hash_api_key(x_api_key)
        stmt = select(APIKey).where(APIKey.key_hash == key_hash)
        result = await db.execute(stmt)
        api_key = result.scalar_one_or_none()

        if api_key and api_key.is_valid:
            stmt = select(User).where(User.id == api_key.user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if user and user.status == UserStatus.ACTIVE.value:
                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required (JWT or API key)",
    )
