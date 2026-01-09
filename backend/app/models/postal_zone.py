"""Postal Zone model for geographic postal code regions."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, CheckConstraint
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class PostalZone(Base):
    """
    Postal Zone represents a geographic area with a unique postal code.

    Format: XXXX-YYY
    - XXXX: Primary zone code (region + district + zone)
    - YYY: Delivery segment

    Example: 2310-047 (Bo District, Zone 10, Segment 047)
    """

    __tablename__ = "postal_zones"

    # Primary key: Full postal code (e.g., "2310-047")
    zone_code = Column(String(8), primary_key=True)

    # Parsed components
    primary_code = Column(String(4), nullable=False, index=True)
    segment = Column(String(3), nullable=False)

    # Geographic boundary (polygon)
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=True)

    # Administrative hierarchy
    region_code = Column(Integer, nullable=False)  # 1-5
    region_name = Column(String(100), nullable=False)
    district_code = Column(Integer, nullable=False)  # 0-9
    district_name = Column(String(100), nullable=False)
    zone_name = Column(String(100), nullable=True)

    # Segment type
    segment_type = Column(String(20), default="residential")  # residential, commercial, industrial, government, special

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Sequence counter for PDA-ID generation
    address_sequence = Column(Integer, default=0, nullable=False)

    # Relationships
    addresses = relationship("Address", back_populates="zone", lazy="dynamic")

    __table_args__ = (
        CheckConstraint("zone_code ~ '^[0-9]{4}-[0-9]{3}$'", name="check_zone_code_format"),
        CheckConstraint("region_code BETWEEN 1 AND 5", name="valid_region_code"),
        CheckConstraint("district_code BETWEEN 0 AND 9", name="valid_district_code"),
    )

    def __repr__(self):
        return f"<PostalZone {self.zone_code} ({self.district_name})>"

    @property
    def display_name(self) -> str:
        """Human-readable zone name."""
        if self.zone_name:
            return f"{self.zone_name}, {self.district_name}"
        return f"Zone {self.zone_code}, {self.district_name}"


# Region codes mapping
REGIONS = {
    1: "Western Area",
    2: "North West",
    3: "North East",
    4: "South",
    5: "East"
}

# Segment type ranges
SEGMENT_TYPES = {
    "residential": (1, 499),
    "commercial": (500, 699),
    "industrial": (700, 849),
    "government": (850, 899),
    "reserved": (900, 949),
    "special": (950, 999)
}
