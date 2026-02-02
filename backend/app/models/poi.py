"""POI (Point of Interest) model for imported locations from OpenStreetMap."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, BigInteger, Boolean, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base


class POICategory:
    """POI category constants."""
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    GOVERNMENT = "government"
    FINANCE = "finance"
    FOOD = "food"
    SHOPPING = "shopping"
    TOURISM = "tourism"
    TRANSPORT = "transport"
    RELIGIOUS = "religious"
    UTILITIES = "utilities"
    OTHER = "other"


class POI(Base):
    """
    Point of Interest imported from OpenStreetMap.

    POIs represent named locations like hospitals, schools, shops, etc.
    Each POI has an auto-generated Plus Code and is linked to a postal zone.
    """

    __tablename__ = "pois"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # OpenStreetMap identifiers
    osm_id = Column(BigInteger, unique=True, nullable=True, index=True)
    osm_type = Column(String(10), nullable=True)  # 'node', 'way', 'relation'

    # Name
    name = Column(String(255), nullable=True, index=True)
    name_local = Column(String(255), nullable=True)  # Local language name

    # Category
    category = Column(String(50), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True, index=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Plus Code (Open Location Code)
    plus_code = Column(String(15), nullable=True, index=True)
    plus_code_short = Column(String(10), nullable=True)

    # Postal zone reference
    zone_code = Column(String(8), ForeignKey("postal_zones.zone_code"), nullable=True, index=True)

    # Address components
    street_name = Column(String(255), nullable=True)
    house_number = Column(String(50), nullable=True)

    # Contact info
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    opening_hours = Column(String(255), nullable=True)

    # All OSM tags as JSON
    tags = Column(JSONB, default=dict)

    # Verification
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    zone = relationship("PostalZone", backref="pois")

    def __repr__(self):
        return f"<POI {self.id}: {self.name or 'Unnamed'} ({self.category})>"

    @property
    def display_name(self) -> str:
        """Human-readable name."""
        if self.name:
            return self.name
        if self.subcategory:
            return f"{self.subcategory.replace('_', ' ').title()}"
        return f"{self.category.title()} Location"
