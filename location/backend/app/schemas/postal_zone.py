"""Pydantic schemas for Postal Zone API endpoints."""

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class PostalZoneBase(BaseModel):
    """Base postal zone schema."""
    zone_code: str = Field(..., pattern=r"^\d{4}-\d{3}$")
    primary_code: str = Field(..., pattern=r"^\d{4}$")
    segment: str = Field(..., pattern=r"^\d{3}$")
    region_name: str
    district_name: str
    zone_name: Optional[str] = None
    segment_type: str = "residential"


class PostalZoneResponse(PostalZoneBase):
    """Schema for postal zone API response."""
    region_code: int
    district_code: int
    address_count: Optional[int] = None
    created_at: datetime
    geometry: Optional[Any] = None  # GeoJSON

    class Config:
        from_attributes = True


class PostalZoneListResponse(BaseModel):
    """Schema for postal zone list response."""
    zones: List[PostalZoneResponse]
    total_count: int


class PostalZoneSummary(BaseModel):
    """Simplified zone info for listings."""
    zone_code: str
    display_name: str
    district: str
    region: str
    address_count: int


class DistrictSummary(BaseModel):
    """District summary with zones."""
    district_code: int
    district_name: str
    region_name: str
    zone_count: int
    address_count: int


class RegionSummary(BaseModel):
    """Region summary."""
    region_code: int
    region_name: str
    district_count: int
    zone_count: int
    address_count: int
