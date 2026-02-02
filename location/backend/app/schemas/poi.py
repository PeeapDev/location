"""Pydantic schemas for POI API endpoints."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class POIBase(BaseModel):
    """Base POI schema with common fields."""
    name: Optional[str] = Field(None, max_length=255)
    name_local: Optional[str] = Field(None, max_length=255)
    category: str = Field(..., max_length=50)
    subcategory: Optional[str] = Field(None, max_length=100)
    street_name: Optional[str] = Field(None, max_length=255)
    house_number: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=500)
    opening_hours: Optional[str] = Field(None, max_length=255)


class POICreate(POIBase):
    """Schema for creating a new POI."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    osm_id: Optional[int] = None
    osm_type: Optional[str] = Field(None, max_length=10)
    tags: Optional[Dict[str, Any]] = None


class POIResponse(POIBase):
    """Schema for POI API response."""
    id: int
    osm_id: Optional[int] = None
    osm_type: Optional[str] = None
    latitude: float
    longitude: float
    plus_code: Optional[str] = None
    plus_code_short: Optional[str] = None
    zone_code: Optional[str] = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    tags: Optional[Dict[str, Any]] = None
    # Computed fields
    display_name: Optional[str] = None
    district_name: Optional[str] = None
    region_name: Optional[str] = None

    class Config:
        from_attributes = True


class POIListResponse(BaseModel):
    """Schema for POI list response."""
    pois: List[POIResponse]
    total_count: int
    page: int
    page_size: int


class POISearchRequest(BaseModel):
    """Schema for POI search request."""
    query: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    zone_code: Optional[str] = None
    district: Optional[str] = None
    region: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class POINearbyRequest(BaseModel):
    """Schema for nearby POI request."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_m: int = Field(1000, ge=10, le=50000, description="Search radius in meters")
    category: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)


class POINearbyResult(POIResponse):
    """POI result with distance."""
    distance_m: float = Field(..., description="Distance from search point in meters")


class POINearbyResponse(BaseModel):
    """Schema for nearby POI response."""
    pois: List[POINearbyResult]
    total_count: int
    center: Dict[str, float]
    radius_m: int


class POICategoryCount(BaseModel):
    """Category with count."""
    category: str
    count: int
    subcategories: Optional[List[Dict[str, Any]]] = None


class POICategoriesResponse(BaseModel):
    """Schema for categories list response."""
    categories: List[POICategoryCount]
    total_pois: int
