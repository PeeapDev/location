"""Pydantic schemas for Address API endpoints."""

from datetime import datetime
from typing import Optional, List, Tuple
from pydantic import BaseModel, Field, field_validator
from app.models.address import AddressType, VerificationStatus


class LocationSchema(BaseModel):
    """GPS location schema."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_m: Optional[float] = Field(None, ge=0)


class AddressBase(BaseModel):
    """Base address schema with common fields."""
    street_name: Optional[str] = Field(None, max_length=200)
    block: Optional[str] = Field(None, max_length=50)
    house_number: Optional[str] = Field(None, max_length=20)
    building_name: Optional[str] = Field(None, max_length=200)
    floor: Optional[str] = Field(None, max_length=20)
    unit: Optional[str] = Field(None, max_length=50)
    landmark_primary: Optional[str] = None
    landmark_secondary: Optional[str] = None
    delivery_instructions: Optional[str] = None
    access_notes: Optional[str] = None
    address_type: AddressType = AddressType.RESIDENTIAL
    contact_phone: Optional[str] = Field(None, max_length=20)


class AddressCreate(AddressBase):
    """Schema for creating a new address."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_m: Optional[float] = Field(None, ge=0, le=1000)

    @field_validator("latitude")
    @classmethod
    def validate_latitude_sierra_leone(cls, v):
        if not (6.85 <= v <= 10.0):
            raise ValueError("Latitude must be within Sierra Leone bounds (6.85 to 10.0)")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude_sierra_leone(cls, v):
        if not (-13.5 <= v <= -10.25):
            raise ValueError("Longitude must be within Sierra Leone bounds (-13.5 to -10.25)")
        return v


class AddressUpdate(BaseModel):
    """Schema for updating an existing address."""
    street_name: Optional[str] = Field(None, max_length=200)
    block: Optional[str] = Field(None, max_length=50)
    house_number: Optional[str] = Field(None, max_length=20)
    building_name: Optional[str] = Field(None, max_length=200)
    landmark_primary: Optional[str] = None
    landmark_secondary: Optional[str] = None
    delivery_instructions: Optional[str] = None
    access_notes: Optional[str] = None
    contact_phone: Optional[str] = Field(None, max_length=20)


class AddressResponse(AddressBase):
    """Schema for address API response."""
    pda_id: str
    zone_code: str
    latitude: float
    longitude: float
    accuracy_m: Optional[float]
    plus_code: Optional[str] = None
    plus_code_short: Optional[str] = None
    confidence_score: float
    verification_status: VerificationStatus
    created_at: datetime
    updated_at: datetime
    display_address: str

    class Config:
        from_attributes = True


class AddressSearchRequest(BaseModel):
    """Schema for address search request."""
    query: str = Field(..., min_length=2, max_length=500)
    filters: Optional[dict] = None
    location: Optional[LocationSchema] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class AddressSearchResult(BaseModel):
    """Single search result."""
    pda_id: str
    postal_code: str
    plus_code: Optional[str] = None
    display_address: str
    street_name: Optional[str]
    district: str
    region: str
    latitude: float
    longitude: float
    confidence_score: float
    distance_km: Optional[float] = None
    match_score: float


class AddressSearchResponse(BaseModel):
    """Schema for address search response."""
    results: List[AddressSearchResult]
    total_count: int
    query_time_ms: int


class AutocompleteSuggestion(BaseModel):
    """Single autocomplete suggestion."""
    display: str
    pda_id: str
    postal_code: str
    plus_code: Optional[str] = None
    district: str
    match_type: str


class AutocompleteResponse(BaseModel):
    """Schema for autocomplete response."""
    suggestions: List[AutocompleteSuggestion]
    query_time_ms: int


class AddressVerifyRequest(BaseModel):
    """Schema for address verification request."""
    pda_id: str
    provided_street: Optional[str] = None
    provided_block: Optional[str] = None
    provided_postal_code: Optional[str] = None


class MatchDetails(BaseModel):
    """Verification match details."""
    pda_id_valid: bool
    postal_code_match: Optional[bool] = None
    street_match: Optional[bool] = None
    block_match: Optional[bool] = None


class AddressVerifyResponse(BaseModel):
    """Schema for address verification response."""
    verified: bool
    match_details: MatchDetails
    confidence_score: float
    address_status: str
    last_verified: Optional[datetime]
    warnings: List[str]


class NearbyAddress(BaseModel):
    """Nearby address for reverse geocoding."""
    pda_id: str
    postal_code: str
    display_address: str
    distance_m: float
    bearing: Optional[str] = None
    latitude: float
    longitude: float


class ZoneInfo(BaseModel):
    """Zone information for reverse geocoding."""
    postal_code: str
    zone_name: Optional[str]
    district: str
    region: str


class ReverseGeocodeResponse(BaseModel):
    """Schema for reverse geocoding response."""
    exact_match: Optional[NearbyAddress]
    nearest_addresses: List[NearbyAddress]
    zone: Optional[ZoneInfo]


# ============================================================================
# Plus Code (Open Location Code) Schemas
# ============================================================================

class PlusCodeEncodeRequest(BaseModel):
    """Request schema for encoding coordinates to Plus Code."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    precision: int = Field(11, ge=10, le=12, description="Code length: 10=~14m, 11=~3m, 12=~1m")


class PlusCodeEncodeResponse(BaseModel):
    """Response schema for Plus Code encoding."""
    plus_code: str = Field(..., description="Full Plus Code (e.g., 6WQPVX22+5WX)")
    latitude: float
    longitude: float
    precision_meters: Tuple[float, float] = Field(..., description="Approximate area (width, height) in meters")


class PlusCodeDecodeRequest(BaseModel):
    """Request schema for decoding Plus Code to coordinates."""
    plus_code: str = Field(..., description="Plus Code to decode (full or short)")
    reference_latitude: Optional[float] = Field(None, ge=-90, le=90, description="Reference lat for short codes")
    reference_longitude: Optional[float] = Field(None, ge=-180, le=180, description="Reference lon for short codes")


class PlusCodeDecodeResponse(BaseModel):
    """Response schema for Plus Code decoding."""
    plus_code: str = Field(..., description="Full Plus Code")
    latitude: float = Field(..., description="Center latitude")
    longitude: float = Field(..., description="Center longitude")
    latitude_lo: float = Field(..., description="South boundary")
    latitude_hi: float = Field(..., description="North boundary")
    longitude_lo: float = Field(..., description="West boundary")
    longitude_hi: float = Field(..., description="East boundary")
    is_full: bool = Field(..., description="True if this is a full (not short) code")
    is_short: bool = Field(..., description="True if original input was a short code")
