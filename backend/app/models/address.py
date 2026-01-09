"""Address model for registered locations with PDA-IDs."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, ForeignKey, Integer, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
import enum

from app.database import Base


class AddressType(str, enum.Enum):
    """Types of addresses."""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    GOVERNMENT = "government"
    INSTITUTIONAL = "institutional"
    MIXED = "mixed"


class VerificationStatus(str, enum.Enum):
    """Address verification status."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    DEPRECATED = "deprecated"


class Address(Base):
    """
    Address represents a registered physical location with a unique PDA-ID.

    PDA-ID Format: SL-XXXX-YYY-NNNNNN-C
    - SL: Country prefix (Sierra Leone)
    - XXXX-YYY: Postal zone code
    - NNNNNN: Sequential number within zone (6 digits)
    - C: Check digit (Luhn algorithm)

    Example: SL-2310-047-000142-7
    """

    __tablename__ = "addresses"

    # Primary key: PDA-ID
    pda_id = Column(String(21), primary_key=True)

    # Foreign key to postal zone
    zone_code = Column(String(8), ForeignKey("postal_zones.zone_code"), nullable=False, index=True)

    # Geographic location (point)
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_m = Column(Float, nullable=True)  # GPS accuracy in meters

    # Address components
    street_name = Column(String(200), nullable=True, index=True)
    block = Column(String(50), nullable=True)
    house_number = Column(String(20), nullable=True)
    building_name = Column(String(200), nullable=True)
    floor = Column(String(20), nullable=True)
    unit = Column(String(50), nullable=True)

    # Context and landmarks
    landmark_primary = Column(Text, nullable=True)
    landmark_secondary = Column(Text, nullable=True)
    delivery_instructions = Column(Text, nullable=True)
    access_notes = Column(Text, nullable=True)

    # Classification
    address_type = Column(String(20), default="residential")
    subtype = Column(String(50), nullable=True)

    # Verification
    verification_status = Column(String(20), default="pending", index=True)
    confidence_score = Column(Float, default=0.5)  # 0.0 to 1.0
    verification_method = Column(String(50), nullable=True)  # field_survey, photo_verified, user_submitted, crowdsourced
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(String(100), nullable=True)

    # Registration info
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), nullable=True)

    # Contact (optional)
    contact_phone = Column(String(20), nullable=True)

    # Additional data
    extra_data = Column(JSONB, default=dict)

    # Relationships
    zone = relationship("PostalZone", back_populates="addresses")
    history = relationship("AddressHistory", back_populates="address", lazy="dynamic")

    __table_args__ = (
        CheckConstraint("pda_id ~ '^SL-[0-9]{4}-[0-9]{3}-[0-9]{6}-[0-9]$'", name="valid_pda_id_format"),
        CheckConstraint("confidence_score BETWEEN 0 AND 1", name="valid_confidence_score"),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="valid_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="valid_longitude"),
    )

    def __repr__(self):
        return f"<Address {self.pda_id}>"

    @property
    def display_address(self) -> str:
        """Human-readable address string."""
        parts = []
        if self.street_name:
            parts.append(self.street_name)
        if self.block:
            parts.append(f"Block {self.block}")
        if self.house_number:
            parts.append(f"No. {self.house_number}")
        if self.building_name:
            parts.append(self.building_name)
        return ", ".join(parts) if parts else f"Location {self.pda_id}"

    @property
    def postal_code(self) -> str:
        """Extract postal code from PDA-ID."""
        return self.zone_code


class AddressHistory(Base):
    """
    Audit trail for address changes.
    Immutable record of all modifications.
    """

    __tablename__ = "address_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pda_id = Column(String(21), ForeignKey("addresses.pda_id"), nullable=False, index=True)

    # Change details
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by = Column(String(100), nullable=True)
    change_type = Column(String(20), nullable=False)  # create, update, verify, deprecate

    # Before and after values
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)

    # Request context
    request_ip = Column(String(45), nullable=True)
    request_user_agent = Column(String(500), nullable=True)

    # Relationships
    address = relationship("Address", back_populates="history")

    def __repr__(self):
        return f"<AddressHistory {self.id} - {self.pda_id} - {self.change_type}>"
