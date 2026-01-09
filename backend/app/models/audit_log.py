"""Audit log model for tracking all system changes."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    """
    Audit log for tracking all system changes.

    Provides an immutable record of all actions for compliance,
    security monitoring, and accountability.

    Actions tracked:
    - login, logout, login_failed
    - create, update, delete
    - approve, reject, verify
    - suspend, activate
    - settings_change
    - api_key_create, api_key_revoke
    - emergency_lockdown, emergency_unlock
    """

    __tablename__ = "audit_logs"

    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # Who performed the action (nullable for failed logins, system actions)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # What action was performed
    action = Column(String(50), nullable=False, index=True)

    # What type of resource was affected
    resource_type = Column(String(50), nullable=False, index=True)
    # address, user, zone, api_key, settings, session

    # Which specific resource (nullable for list/bulk operations)
    resource_id = Column(String(100), nullable=True)

    # Change details
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)

    # Additional context
    description = Column(Text, nullable=True)

    # Request context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # For tracking API key usage
    api_key_id = Column(UUID(as_uuid=True), nullable=True)

    # Timestamp (indexed for efficient time-based queries)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.id} - {self.action} on {self.resource_type}>"

    @classmethod
    def create_log(
        cls,
        action: str,
        resource_type: str,
        resource_id: str = None,
        user_id: str = None,
        old_values: dict = None,
        new_values: dict = None,
        description: str = None,
        ip_address: str = None,
        user_agent: str = None,
        api_key_id: str = None,
    ) -> "AuditLog":
        """Factory method to create an audit log entry."""
        return cls(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            api_key_id=api_key_id,
        )
