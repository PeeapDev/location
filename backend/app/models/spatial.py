"""
Spatial Hierarchy Models for Sierra Leone Postal System.

Hierarchy: Country → Region → District → Ward → Zone → Block → Address

Features:
- Geohash indexing for efficient spatial queries
- Proper containment relationships
- Spatial validation support
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Integer, Float, Boolean,
    ForeignKey, Text, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from geoalchemy2 import Geometry

from app.database import Base


class Ward(Base):
    """
    Ward - Administrative subdivision within a District.

    Sierra Leone has chiefdoms/wards within each district.
    Zones must be contained within ward boundaries.
    """
    __tablename__ = "wards"

    ward_id = Column(String(10), primary_key=True)  # e.g., "W11-001"
    ward_name = Column(String(100), nullable=False)
    ward_code = Column(String(10), nullable=False, index=True)

    # Parent hierarchy
    district_code = Column(Integer, nullable=False)
    district_name = Column(String(100), nullable=False)
    region_code = Column(Integer, nullable=False)
    region_name = Column(String(100), nullable=False)

    # Geometry
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=True)
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    geohash = Column(String(12), nullable=True, index=True)

    # Statistics
    zone_count = Column(Integer, default=0)
    address_count = Column(Integer, default=0)
    area_sqkm = Column(Float, nullable=True)

    # Metadata for search
    alternate_names = Column(ARRAY(String), nullable=True)  # Local names, variants
    landmarks = Column(ARRAY(String), nullable=True)  # Notable landmarks
    meta = Column(JSONB, nullable=True)  # Additional searchable metadata

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    blocks = relationship("Block", back_populates="ward", lazy="dynamic")

    __table_args__ = (
        Index('idx_ward_geohash', 'geohash'),
        Index('idx_ward_district', 'district_code'),
    )


class Block(Base):
    """
    Block - Smallest administrative unit containing addresses.

    A block is a contiguous area within a zone, typically bounded by streets.
    Each block has a unique identifier within its zone.
    """
    __tablename__ = "blocks"

    block_id = Column(String(20), primary_key=True)  # e.g., "1100-001-A"
    block_code = Column(String(5), nullable=False)  # e.g., "A", "B", "001"
    block_name = Column(String(100), nullable=True)

    # Parent hierarchy
    zone_code = Column(String(8), ForeignKey("postal_zones.zone_code"), nullable=False)
    ward_id = Column(String(10), ForeignKey("wards.ward_id"), nullable=True)

    # Geometry
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=True)
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    geohash = Column(String(12), nullable=True, index=True)

    # Block type
    block_type = Column(String(20), default="mixed")  # residential, commercial, industrial

    # Statistics
    address_count = Column(Integer, default=0)
    building_count = Column(Integer, default=0)

    # Metadata
    street_names = Column(ARRAY(String), nullable=True)
    landmarks = Column(ARRAY(String), nullable=True)
    meta = Column(JSONB, nullable=True)

    # Sequence for address generation
    address_sequence = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    ward = relationship("Ward", back_populates="blocks")
    addresses = relationship("Address", back_populates="block", lazy="dynamic")

    __table_args__ = (
        Index('idx_block_geohash', 'geohash'),
        Index('idx_block_zone', 'zone_code'),
    )


class SpatialValidationLog(Base):
    """
    Log of spatial validation results.

    Tracks all validation checks performed on addresses and zones.
    """
    __tablename__ = "spatial_validation_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # What was validated
    entity_type = Column(String(20), nullable=False)  # address, zone, block
    entity_id = Column(String(50), nullable=False)

    # Validation result
    validation_type = Column(String(50), nullable=False)  # land_check, zone_containment, overlap, boundary_crossing
    status = Column(String(20), nullable=False)  # passed, failed, warning
    message = Column(Text, nullable=True)

    # Details
    details = Column(JSONB, nullable=True)  # Detailed validation info

    # Location info
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geohash = Column(String(12), nullable=True)

    # Timestamps
    validated_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)

    __table_args__ = (
        Index('idx_validation_entity', 'entity_type', 'entity_id'),
        Index('idx_validation_status', 'status'),
    )


class LandBoundary(Base):
    """
    Sierra Leone land boundary for validation.

    Used to check if addresses/zones are on land vs water.
    """
    __tablename__ = "land_boundaries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)  # e.g., "Sierra Leone Mainland"
    boundary_type = Column(String(20), nullable=False)  # country, coastline, island

    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class SpatialAnomaly(Base):
    """
    Detected spatial anomalies for review.

    AI/rules-based detection of:
    - Missing coverage areas
    - Unusual patterns
    - Potential boundary issues
    """
    __tablename__ = "spatial_anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)

    anomaly_type = Column(String(50), nullable=False)  # coverage_gap, density_anomaly, boundary_issue
    severity = Column(String(20), nullable=False)  # low, medium, high, critical

    # Location
    geometry = Column(Geometry("GEOMETRY", srid=4326), nullable=True)
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    geohash = Column(String(12), nullable=True)

    # Context
    affected_zones = Column(ARRAY(String), nullable=True)
    affected_wards = Column(ARRAY(String), nullable=True)

    # Details
    description = Column(Text, nullable=False)
    details = Column(JSONB, nullable=True)
    suggested_action = Column(Text, nullable=True)

    # Status
    status = Column(String(20), default="open")  # open, investigating, resolved, dismissed

    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)


class LocationMeta(Base):
    """
    Rich metadata for location search.

    Enables searching by:
    - Alternate names (local languages, historical names)
    - Landmarks and POIs
    - Common references
    """
    __tablename__ = "location_meta"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Link to entity
    entity_type = Column(String(20), nullable=False)  # zone, ward, district, address
    entity_id = Column(String(50), nullable=False)

    # Primary info
    primary_name = Column(String(200), nullable=False)

    # Alternate names for search
    alternate_names = Column(ARRAY(String), nullable=True)
    local_names = Column(JSONB, nullable=True)  # {"krio": "name", "temne": "name"}
    historical_names = Column(ARRAY(String), nullable=True)

    # Landmarks and references
    landmarks = Column(ARRAY(String), nullable=True)
    nearby_pois = Column(ARRAY(String), nullable=True)
    common_references = Column(ARRAY(String), nullable=True)  # "near the market", "by the church"

    # Searchable text (denormalized for full-text search)
    search_text = Column(Text, nullable=True)  # Combined searchable text

    # Geolocation
    center_lat = Column(Float, nullable=True)
    center_lng = Column(Float, nullable=True)
    geohash = Column(String(12), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_meta_entity', 'entity_type', 'entity_id'),
        Index('idx_meta_geohash', 'geohash'),
        # Full-text search index created via migration
    )
