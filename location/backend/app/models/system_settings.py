"""System settings model for dynamic configuration."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class SystemSettings(Base):
    """
    System settings for dynamic configuration.

    Stores key-value pairs for system configuration that can be
    changed at runtime without redeploying the application.

    Default settings keys:
    - maintenance_mode: bool - Enable/disable maintenance mode
    - registration_enabled: bool - Allow new address registrations
    - auto_approve_threshold: float - Confidence score for auto-approval
    - max_api_requests_per_day: int - Global API rate limit
    - lockdown_mode: bool - Emergency lockdown (disable all non-admin access)
    - lockdown_reason: str - Reason for lockdown
    - postal_code_format: str - Regex pattern for postal codes
    - confidence_weights: dict - Weights for confidence scoring
    - notification_settings: dict - Email/SMS notification config
    """

    __tablename__ = "system_settings"

    # Primary key is the setting key
    key = Column(String(100), primary_key=True)

    # Setting value (stored as JSON for flexibility)
    value = Column(JSONB, nullable=False)

    # Metadata
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True, index=True)  # security, registration, api, notifications

    # Validation schema (optional JSON schema for validation)
    value_schema = Column(JSONB, nullable=True)

    # Change tracking
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    def __repr__(self):
        return f"<SystemSettings {self.key}>"

    @classmethod
    def get_default_settings(cls) -> list["SystemSettings"]:
        """Get default system settings for initial setup."""
        return [
            cls(
                key="maintenance_mode",
                value=False,
                description="Enable maintenance mode - only superadmins can access",
                category="system",
            ),
            cls(
                key="registration_enabled",
                value=True,
                description="Allow new address registrations",
                category="registration",
            ),
            cls(
                key="auto_approve_threshold",
                value=0.9,
                description="Confidence score threshold for automatic approval (0.0-1.0)",
                category="registration",
            ),
            cls(
                key="require_photo_verification",
                value=False,
                description="Require photo for address verification",
                category="registration",
            ),
            cls(
                key="max_registrations_per_day",
                value=100,
                description="Maximum new registrations per day per user",
                category="registration",
            ),
            cls(
                key="lockdown_mode",
                value=False,
                description="Emergency lockdown - disable all non-admin access",
                category="security",
            ),
            cls(
                key="lockdown_reason",
                value="",
                description="Reason for emergency lockdown",
                category="security",
            ),
            cls(
                key="max_failed_logins",
                value=5,
                description="Max failed login attempts before account lockout",
                category="security",
            ),
            cls(
                key="lockout_duration_minutes",
                value=30,
                description="Account lockout duration in minutes",
                category="security",
            ),
            cls(
                key="api_rate_limit_per_minute",
                value=60,
                description="Default API rate limit per minute",
                category="api",
            ),
            cls(
                key="api_rate_limit_per_day",
                value=10000,
                description="Default API rate limit per day",
                category="api",
            ),
            cls(
                key="confidence_weights",
                value={
                    "gps_accuracy": 0.25,
                    "address_completeness": 0.25,
                    "verification_method": 0.25,
                    "landmark_quality": 0.25,
                },
                description="Weights for confidence score calculation",
                category="scoring",
            ),
        ]
