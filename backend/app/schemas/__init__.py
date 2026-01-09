"""Pydantic schemas for API request/response validation."""

from app.schemas.address import (
    AddressCreate,
    AddressUpdate,
    AddressResponse,
    AddressSearchRequest,
    AddressSearchResponse,
    AddressVerifyRequest,
    AddressVerifyResponse,
    ReverseGeocodeResponse,
    AutocompleteResponse
)
from app.schemas.postal_zone import (
    PostalZoneResponse,
    PostalZoneListResponse
)
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
)
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserSummary,
    CurrentUserResponse,
)
from app.schemas.api_key import (
    APIKeyCreate,
    APIKeyResponse,
    APIKeyCreateResponse,
    APIKeyListResponse,
    APIKeyUsageStats,
    APIKeyUpdate,
)

__all__ = [
    # Address schemas
    "AddressCreate",
    "AddressUpdate",
    "AddressResponse",
    "AddressSearchRequest",
    "AddressSearchResponse",
    "AddressVerifyRequest",
    "AddressVerifyResponse",
    "ReverseGeocodeResponse",
    "AutocompleteResponse",
    # Postal zone schemas
    "PostalZoneResponse",
    "PostalZoneListResponse",
    # Auth schemas
    "LoginRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "PasswordChangeRequest",
    "PasswordResetRequest",
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserListResponse",
    "UserSummary",
    "CurrentUserResponse",
    # API Key schemas
    "APIKeyCreate",
    "APIKeyResponse",
    "APIKeyCreateResponse",
    "APIKeyListResponse",
    "APIKeyUsageStats",
    "APIKeyUpdate",
]
