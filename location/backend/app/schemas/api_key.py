"""Pydantic schemas for API Key management endpoints."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class APIKeyBase(BaseModel):
    """Base API key schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    scopes: List[str] = Field(default=["read"])
    rate_limit_per_minute: int = Field(60, ge=1, le=1000)
    rate_limit_per_hour: int = Field(1000, ge=10, le=100000)
    rate_limit_per_day: int = Field(10000, ge=100, le=1000000)
    allowed_endpoints: List[str] = Field(default=[])
    allowed_ips: List[str] = Field(default=[])
    expires_at: Optional[datetime] = None


class APIKeyCreate(APIKeyBase):
    """Schema for creating a new API key."""
    user_id: UUID  # The business user this key belongs to


class APIKeyResponse(BaseModel):
    """Schema for API key response (without the actual key)."""
    id: UUID
    user_id: UUID
    key_prefix: str
    name: str
    description: Optional[str]
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

    class Config:
        from_attributes = True


class APIKeyCreateResponse(APIKeyResponse):
    """Response when creating a new API key - includes the full key (shown only once)."""
    api_key: str  # Full API key, only returned at creation time


class APIKeyListResponse(BaseModel):
    """Schema for paginated API key list response."""
    api_keys: List[APIKeyResponse]
    total_count: int
    limit: int
    offset: int


class APIKeyUsageStats(BaseModel):
    """Usage statistics for an API key."""
    key_id: UUID
    key_prefix: str
    total_requests: int
    requests_today: int
    requests_this_hour: int
    requests_this_minute: int
    last_used_at: Optional[datetime]
    last_used_ip: Optional[str]
    rate_limit_remaining_minute: int
    rate_limit_remaining_hour: int
    rate_limit_remaining_day: int


class APIKeyUpdate(BaseModel):
    """Schema for updating an API key."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    scopes: Optional[List[str]] = None
    rate_limit_per_minute: Optional[int] = Field(None, ge=1, le=1000)
    rate_limit_per_hour: Optional[int] = Field(None, ge=10, le=100000)
    rate_limit_per_day: Optional[int] = Field(None, ge=100, le=1000000)
    allowed_endpoints: Optional[List[str]] = None
    allowed_ips: Optional[List[str]] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
