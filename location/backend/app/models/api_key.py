"""API Key model for business user authentication."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class APIKey(Base):
    """
    API Key for business users to access the API programmatically.

    Keys are hashed for security - the full key is only shown once at creation.
    The key_prefix allows identifying keys without exposing the full value.
    """

    __tablename__ = "api_keys"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Owner
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Key data (hashed for security)
    key_hash = Column(String(255), nullable=False, unique=True)
    key_prefix = Column(String(12), nullable=False)  # First 12 chars for identification (xeeno_xxxxx)

    # Metadata
    name = Column(String(100), nullable=False)  # User-defined name for the key
    description = Column(String(500), nullable=True)

    # Permissions and limits
    scopes = Column(JSONB, default=["read"])  # read, write, admin
    rate_limit_per_minute = Column(Integer, default=60)
    rate_limit_per_hour = Column(Integer, default=1000)
    rate_limit_per_day = Column(Integer, default=10000)

    # Allowed endpoints (empty = all allowed for scope)
    allowed_endpoints = Column(JSONB, default=[])

    # IP restrictions (empty = no restriction)
    allowed_ips = Column(JSONB, default=[])

    # Usage tracking
    total_requests = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    last_used_ip = Column(String(45), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    expires_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_by = Column(UUID(as_uuid=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    def __repr__(self):
        return f"<APIKey {self.key_prefix}... ({self.name})>"

    @property
    def is_valid(self) -> bool:
        """Check if the API key is currently valid."""
        if not self.is_active:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    def has_scope(self, scope: str) -> bool:
        """Check if key has a specific scope."""
        if "admin" in self.scopes:
            return True  # Admin scope has all permissions
        return scope in self.scopes

    def can_access_endpoint(self, endpoint: str) -> bool:
        """Check if key can access a specific endpoint."""
        if not self.allowed_endpoints:
            return True  # No restrictions
        return any(endpoint.startswith(allowed) for allowed in self.allowed_endpoints)

    def is_ip_allowed(self, ip: str) -> bool:
        """Check if request IP is allowed."""
        if not self.allowed_ips:
            return True  # No restrictions
        return ip in self.allowed_ips

    def increment_usage(self, ip: str = None):
        """Update usage statistics."""
        self.total_requests += 1
        self.last_used_at = datetime.utcnow()
        if ip:
            self.last_used_ip = ip
