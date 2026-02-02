"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Schema for token response after login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Schema for password change request."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    """Schema for password reset request (admin initiated)."""
    new_password: str = Field(..., min_length=8, max_length=128)
