"""Pydantic schemas for geographic entities (Region, District, Zone)."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# Region Schemas
# =============================================================================

class RegionCreate(BaseModel):
    """Schema for creating a new region."""
    name: str = Field(..., min_length=2, max_length=100, description="Region name")
    short_code: str = Field(..., min_length=1, max_length=5, description="Short code (e.g., WA, NW)")
    description: Optional[str] = Field(None, max_length=500)


class RegionUpdate(BaseModel):
    """Schema for updating a region (only if not locked)."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    short_code: Optional[str] = Field(None, min_length=1, max_length=5)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class RegionResponse(BaseModel):
    """Schema for region response."""
    id: int
    code: str
    name: str
    short_code: str
    description: Optional[str]
    is_active: bool
    is_locked: bool
    district_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]

    class Config:
        from_attributes = True


class RegionListResponse(BaseModel):
    """Schema for paginated region list."""
    items: List[RegionResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# District Schemas
# =============================================================================

class DistrictCreate(BaseModel):
    """Schema for creating a new district."""
    region_id: int = Field(..., description="ID of the parent region")
    name: str = Field(..., min_length=2, max_length=100, description="District name")
    short_code: str = Field(..., min_length=1, max_length=5, description="Short code (e.g., BO, FT)")
    capital: Optional[str] = Field(None, max_length=100, description="District capital")
    description: Optional[str] = Field(None, max_length=500)
    population: Optional[int] = Field(None, ge=0)
    area_sq_km: Optional[int] = Field(None, ge=0)


class DistrictUpdate(BaseModel):
    """Schema for updating a district (only if not locked)."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    short_code: Optional[str] = Field(None, min_length=1, max_length=5)
    capital: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    population: Optional[int] = Field(None, ge=0)
    area_sq_km: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class DistrictResponse(BaseModel):
    """Schema for district response."""
    id: int
    region_id: int
    code: str
    full_code: str
    name: str
    short_code: str
    capital: Optional[str]
    description: Optional[str]
    population: Optional[int]
    area_sq_km: Optional[int]
    is_active: bool
    is_locked: bool
    zone_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]
    # Include region info
    region_name: Optional[str] = None
    region_code: Optional[str] = None

    class Config:
        from_attributes = True


class DistrictListResponse(BaseModel):
    """Schema for paginated district list."""
    items: List[DistrictResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Zone Schemas
# =============================================================================

class ZoneCreate(BaseModel):
    """Schema for creating a new zone (typically from map drawing)."""
    district_id: int = Field(..., description="ID of the parent district")
    name: Optional[str] = Field(None, max_length=100, description="Zone name")
    description: Optional[str] = Field(None, max_length=500)
    zone_type: str = Field("mixed", description="Zone type")
    ward: Optional[str] = Field(None, max_length=50, description="Ward name for Freetown zones")
    geometry: Optional[dict] = Field(None, description="GeoJSON polygon geometry")
    center_lat: Optional[str] = None
    center_lng: Optional[str] = None


class ZoneUpdate(BaseModel):
    """Schema for updating a zone."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    zone_type: Optional[str] = None
    geometry: Optional[dict] = Field(None, description="GeoJSON polygon geometry")
    center_lat: Optional[str] = None
    center_lng: Optional[str] = None
    is_active: Optional[bool] = None


class ZoneResponse(BaseModel):
    """Schema for zone response."""
    id: int
    district_id: int
    zone_number: str
    primary_code: str
    name: Optional[str]
    description: Optional[str]
    zone_type: str
    ward: Optional[str] = None
    center_lat: Optional[str]
    center_lng: Optional[str]
    is_active: bool
    is_locked: bool
    address_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]
    # Include hierarchy info
    district_name: Optional[str] = None
    district_code: Optional[str] = None
    region_name: Optional[str] = None
    region_code: Optional[str] = None
    # GeoJSON for frontend
    geometry: Optional[dict] = None

    class Config:
        from_attributes = True


class ZoneListResponse(BaseModel):
    """Schema for paginated zone list."""
    items: List[ZoneResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Summary/Stats Schemas
# =============================================================================

class GeographyStats(BaseModel):
    """Summary statistics for geography."""
    total_regions: int
    total_districts: int
    total_zones: int
    total_addresses: int
    active_regions: int
    active_districts: int
    active_zones: int
