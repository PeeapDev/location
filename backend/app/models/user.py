"""User model for authentication and authorization."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User role hierarchy."""
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    BUSINESS = "business"
    DELIVERY_AGENT = "delivery_agent"
    DATA_COLLECTOR = "data_collector"


class UserStatus(str, enum.Enum):
    """User account status."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(Base):
    """
    User model for system authentication and authorization.

    Role Hierarchy:
    - superadmin: Full system control, manage all users and data
    - admin: Regional/city-level management
    - business: API access for their addresses
    - delivery_agent: View/verify delivery points
    - data_collector: Submit geolocations for approval
    """

    __tablename__ = "users"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)

    # Role and status
    role = Column(String(20), nullable=False, default=UserRole.DATA_COLLECTOR.value, index=True)
    status = Column(String(20), nullable=False, default=UserStatus.PENDING.value, index=True)

    # Regional assignment (for Admin/Agent/Collector roles)
    assigned_region = Column(Integer, nullable=True)  # 1-5 (Sierra Leone regions)
    assigned_district = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Security
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

    # Relationships
    api_keys = relationship("APIKey", back_populates="user", lazy="dynamic")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"

    @property
    def is_active(self) -> bool:
        """Check if user account is active."""
        return self.status == UserStatus.ACTIVE.value

    @property
    def is_superadmin(self) -> bool:
        """Check if user is superadmin."""
        return self.role == UserRole.SUPERADMIN.value

    @property
    def is_admin_or_above(self) -> bool:
        """Check if user is admin or superadmin."""
        return self.role in [UserRole.SUPERADMIN.value, UserRole.ADMIN.value]

    def can_manage_region(self, region_code: int) -> bool:
        """Check if user can manage a specific region."""
        if self.is_superadmin:
            return True
        if self.role == UserRole.ADMIN.value:
            return self.assigned_region is None or self.assigned_region == region_code
        return False
