"""Pydantic schemas for User management endpoints."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.DATA_COLLECTOR
    assigned_region: Optional[int] = Field(None, ge=1, le=5)
    assigned_district: Optional[str] = Field(None, max_length=100)

    @field_validator("assigned_region")
    @classmethod
    def validate_region(cls, v):
        """Validate region is within Sierra Leone's 5 regions."""
        if v is not None and not (1 <= v <= 5):
            raise ValueError("Region must be between 1 and 5")
        return v


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        """Ensure password has minimum complexity."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    assigned_region: Optional[int] = Field(None, ge=1, le=5)
    assigned_district: Optional[str] = Field(None, max_length=100)


class UserResponse(BaseModel):
    """Schema for user API response."""
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    status: UserStatus
    assigned_region: Optional[int]
    assigned_district: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""
    users: List[UserResponse]
    total_count: int
    limit: int
    offset: int


class UserSummary(BaseModel):
    """Condensed user info for lists and references."""
    id: UUID
    email: str
    full_name: str
    role: UserRole
    status: UserStatus

    class Config:
        from_attributes = True


class CurrentUserResponse(UserResponse):
    """Extended response for current authenticated user."""
    is_superadmin: bool
    is_admin_or_above: bool
    permissions: List[str]  # List of permission strings

    class Config:
        from_attributes = True
