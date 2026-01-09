"""Address API endpoints for search, registration, and verification."""

import time
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_Distance
from pydantic import BaseModel

from app.database import get_db
from app.models.address import Address, AddressHistory, VerificationStatus
from app.models.postal_zone import PostalZone
from app.models.user import User
from app.schemas.address import (
    AddressCreate,
    AddressUpdate,
    AddressResponse,
    AddressSearchRequest,
    AddressSearchResponse,
    AddressSearchResult,
    AddressVerifyRequest,
    AddressVerifyResponse,
    MatchDetails,
    AutocompleteResponse,
    AutocompleteSuggestion,
    ReverseGeocodeResponse,
    NearbyAddress,
    ZoneInfo
)
from app.services.pda_id import PDAIDService
from app.services.confidence import ConfidenceScorer
from app.services.geocoder import GeocoderService
from app.api.deps import get_current_active_user, get_admin_or_above

router = APIRouter()


# =============================================================================
# Schemas for pending addresses
# =============================================================================

class PendingAddressItem(BaseModel):
    pda_id: str
    zone_code: str
    latitude: float
    longitude: float
    street_name: Optional[str]
    building_name: Optional[str]
    landmark_primary: Optional[str]
    address_type: str
    verification_status: str
    confidence_score: float
    created_at: datetime
    created_by: Optional[str]


class PendingAddressListResponse(BaseModel):
    items: List[PendingAddressItem]
    total: int
    page: int
    page_size: int


class ApproveRejectRequest(BaseModel):
    reason: Optional[str] = None


# =============================================================================
# Pending Address Endpoints (Admin)
# =============================================================================

@router.get("/pending", response_model=PendingAddressListResponse)
async def list_pending_addresses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """List all pending addresses for verification (Admin only)."""
    query = select(Address).where(Address.verification_status == "pending")
    query = query.order_by(Address.created_at.desc())

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    addresses = result.scalars().all()

    items = [
        PendingAddressItem(
            pda_id=addr.pda_id,
            zone_code=addr.zone_code,
            latitude=addr.latitude,
            longitude=addr.longitude,
            street_name=addr.street_name,
            building_name=addr.building_name,
            landmark_primary=addr.landmark_primary,
            address_type=addr.address_type,
            verification_status=addr.verification_status,
            confidence_score=addr.confidence_score,
            created_at=addr.created_at,
            created_by=addr.created_by,
        )
        for addr in addresses
    ]

    return PendingAddressListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{pda_id}/approve", response_model=AddressResponse)
async def approve_address(
    pda_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Approve a pending address (Admin only)."""
    # Validate PDA-ID format
    if not PDAIDService.validate_format(pda_id):
        raise HTTPException(status_code=400, detail="Invalid PDA-ID format")

    # Fetch address
    stmt = select(Address).where(Address.pda_id == pda_id)
    result = await db.execute(stmt)
    address = result.scalar_one_or_none()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if address.verification_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Address is already {address.verification_status}"
        )

    # Update status
    address.verification_status = "verified"
    address.verified_at = datetime.utcnow()
    address.verified_by = current_user.email

    # Create audit record
    history = AddressHistory(
        pda_id=pda_id,
        change_type="verify",
        changed_by=current_user.email,
        old_values={"verification_status": "pending"},
        new_values={"verification_status": "verified"},
    )
    db.add(history)

    await db.commit()
    await db.refresh(address)

    return AddressResponse(
        pda_id=address.pda_id,
        zone_code=address.zone_code,
        street_name=address.street_name,
        block=address.block,
        house_number=address.house_number,
        building_name=address.building_name,
        floor=address.floor,
        unit=address.unit,
        landmark_primary=address.landmark_primary,
        landmark_secondary=address.landmark_secondary,
        delivery_instructions=address.delivery_instructions,
        access_notes=address.access_notes,
        address_type=address.address_type,
        contact_phone=address.contact_phone,
        latitude=address.latitude,
        longitude=address.longitude,
        accuracy_m=address.accuracy_m,
        confidence_score=address.confidence_score,
        verification_status=address.verification_status,
        created_at=address.created_at,
        updated_at=address.updated_at,
        display_address=address.display_address
    )


@router.post("/{pda_id}/reject")
async def reject_address(
    pda_id: str,
    request: ApproveRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Reject a pending address (Admin only)."""
    # Validate PDA-ID format
    if not PDAIDService.validate_format(pda_id):
        raise HTTPException(status_code=400, detail="Invalid PDA-ID format")

    # Fetch address
    stmt = select(Address).where(Address.pda_id == pda_id)
    result = await db.execute(stmt)
    address = result.scalar_one_or_none()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    if address.verification_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Address is already {address.verification_status}"
        )

    # Update status
    address.verification_status = "rejected"
    address.verified_at = datetime.utcnow()
    address.verified_by = current_user.email

    # Create audit record with rejection reason
    history = AddressHistory(
        pda_id=pda_id,
        change_type="reject",
        changed_by=current_user.email,
        old_values={"verification_status": "pending"},
        new_values={
            "verification_status": "rejected",
            "rejection_reason": request.reason,
        },
    )
    db.add(history)

    await db.commit()

    return {"message": "Address rejected", "pda_id": pda_id}


@router.post("/search", response_model=AddressSearchResponse)
async def search_addresses(
    request: AddressSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Search for addresses by text query.

    Supports:
    - Street names
    - Building names
    - Landmarks
    - Postal codes
    - PDA-IDs
    """
    start_time = time.time()

    query_text = request.query.lower().strip()

    # Check if query is a PDA-ID
    if PDAIDService.validate_format(request.query.upper().replace(" ", "-")):
        pda_id = request.query.upper().replace(" ", "-")
        stmt = select(Address).where(Address.pda_id == pda_id)
        result = await db.execute(stmt)
        address = result.scalar_one_or_none()

        if address:
            zone = await db.get(PostalZone, address.zone_code)
            results = [AddressSearchResult(
                pda_id=address.pda_id,
                postal_code=address.zone_code,
                display_address=address.display_address,
                street_name=address.street_name,
                district=zone.district_name if zone else "",
                region=zone.region_name if zone else "",
                latitude=address.latitude,
                longitude=address.longitude,
                confidence_score=address.confidence_score,
                match_score=1.0
            )]
            return AddressSearchResponse(
                results=results,
                total_count=1,
                query_time_ms=int((time.time() - start_time) * 1000)
            )

    # Text search on multiple fields
    search_pattern = f"%{query_text}%"

    stmt = (
        select(Address, PostalZone)
        .join(PostalZone, Address.zone_code == PostalZone.zone_code)
        .where(
            or_(
                func.lower(Address.street_name).like(search_pattern),
                func.lower(Address.building_name).like(search_pattern),
                func.lower(Address.landmark_primary).like(search_pattern),
                func.lower(Address.landmark_secondary).like(search_pattern),
                Address.zone_code.like(f"{query_text}%")
            )
        )
        .where(Address.verification_status != "rejected")
    )

    # Apply filters
    if request.filters:
        if "district" in request.filters:
            stmt = stmt.where(PostalZone.district_name == request.filters["district"])
        if "region" in request.filters:
            stmt = stmt.where(PostalZone.region_name == request.filters["region"])
        if "address_type" in request.filters:
            stmt = stmt.where(Address.address_type.in_(request.filters["address_type"]))
        if "min_confidence" in request.filters:
            stmt = stmt.where(Address.confidence_score >= request.filters["min_confidence"])

    # Add distance calculation if location provided
    if request.location:
        point = ST_SetSRID(
            ST_MakePoint(request.location.longitude, request.location.latitude),
            4326
        )
        stmt = stmt.add_columns(
            ST_Distance(Address.location, point, True).label("distance_m")
        ).order_by("distance_m")
    else:
        stmt = stmt.order_by(Address.confidence_score.desc())

    # Pagination
    stmt = stmt.offset(request.offset).limit(request.limit)

    result = await db.execute(stmt)
    rows = result.all()

    # Count total
    count_stmt = (
        select(func.count(Address.pda_id))
        .join(PostalZone, Address.zone_code == PostalZone.zone_code)
        .where(
            or_(
                func.lower(Address.street_name).like(search_pattern),
                func.lower(Address.building_name).like(search_pattern),
                func.lower(Address.landmark_primary).like(search_pattern)
            )
        )
    )
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    # Build results
    results = []
    for row in rows:
        if request.location:
            address, zone, distance_m = row
            distance_km = round(distance_m / 1000, 2) if distance_m else None
        else:
            address, zone = row
            distance_km = None

        results.append(AddressSearchResult(
            pda_id=address.pda_id,
            postal_code=address.zone_code,
            display_address=address.display_address,
            street_name=address.street_name,
            district=zone.district_name,
            region=zone.region_name,
            latitude=address.latitude,
            longitude=address.longitude,
            confidence_score=address.confidence_score,
            distance_km=distance_km,
            match_score=0.8  # Simplified scoring
        ))

    return AddressSearchResponse(
        results=results,
        total_count=total_count,
        query_time_ms=int((time.time() - start_time) * 1000)
    )


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(
    q: str = Query(..., min_length=3, max_length=100),
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db)
):
    """
    Get address suggestions for autocomplete.

    Returns quick suggestions based on prefix matching.
    """
    start_time = time.time()
    query_text = q.lower().strip()
    search_pattern = f"{query_text}%"

    stmt = (
        select(Address, PostalZone)
        .join(PostalZone, Address.zone_code == PostalZone.zone_code)
        .where(
            or_(
                func.lower(Address.street_name).like(search_pattern),
                func.lower(Address.building_name).like(search_pattern),
                Address.zone_code.like(search_pattern)
            )
        )
        .where(Address.verification_status == "verified")
        .order_by(Address.confidence_score.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    suggestions = []
    for address, zone in rows:
        # Determine match type
        if address.street_name and address.street_name.lower().startswith(query_text):
            match_type = "street_name"
        elif address.building_name and address.building_name.lower().startswith(query_text):
            match_type = "building_name"
        else:
            match_type = "postal_code"

        suggestions.append(AutocompleteSuggestion(
            display=f"{address.display_address}, {zone.district_name}",
            pda_id=address.pda_id,
            postal_code=address.zone_code,
            district=zone.district_name,
            match_type=match_type
        ))

    return AutocompleteResponse(
        suggestions=suggestions,
        query_time_ms=int((time.time() - start_time) * 1000)
    )


@router.get("/{pda_id}", response_model=AddressResponse)
async def get_address(
    pda_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get address details by PDA-ID."""
    if not PDAIDService.validate_format(pda_id):
        raise HTTPException(status_code=400, detail="Invalid PDA-ID format")

    stmt = select(Address).where(Address.pda_id == pda_id)
    result = await db.execute(stmt)
    address = result.scalar_one_or_none()

    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    return AddressResponse(
        pda_id=address.pda_id,
        zone_code=address.zone_code,
        street_name=address.street_name,
        block=address.block,
        house_number=address.house_number,
        building_name=address.building_name,
        floor=address.floor,
        unit=address.unit,
        landmark_primary=address.landmark_primary,
        landmark_secondary=address.landmark_secondary,
        delivery_instructions=address.delivery_instructions,
        access_notes=address.access_notes,
        address_type=address.address_type,
        contact_phone=address.contact_phone,
        latitude=address.latitude,
        longitude=address.longitude,
        accuracy_m=address.accuracy_m,
        confidence_score=address.confidence_score,
        verification_status=address.verification_status,
        created_at=address.created_at,
        updated_at=address.updated_at,
        display_address=address.display_address
    )


@router.post("/register", response_model=AddressResponse)
async def register_address(
    data: AddressCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new address.

    The address will be assigned a PDA-ID and placed in pending verification status.
    """
    # Find zone for coordinates
    zone = await GeocoderService.find_zone_for_point(db, data.latitude, data.longitude)

    if not zone:
        raise HTTPException(
            status_code=400,
            detail="No postal zone found for these coordinates. Location may be outside covered areas."
        )

    # Generate PDA-ID
    try:
        pda_id = await PDAIDService.generate_next(db, zone.zone_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Calculate confidence score
    confidence, _ = ConfidenceScorer.calculate(
        accuracy_m=data.accuracy_m,
        verification_method="user_submitted",
        street_name=data.street_name,
        block=data.block,
        house_number=data.house_number,
        building_name=data.building_name,
        landmark_primary=data.landmark_primary,
        delivery_instructions=data.delivery_instructions
    )

    # Create address
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point

    location = from_shape(Point(data.longitude, data.latitude), srid=4326)

    address = Address(
        pda_id=pda_id,
        zone_code=zone.zone_code,
        location=location,
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy_m=data.accuracy_m,
        street_name=data.street_name,
        block=data.block,
        house_number=data.house_number,
        building_name=data.building_name,
        floor=data.floor,
        unit=data.unit,
        landmark_primary=data.landmark_primary,
        landmark_secondary=data.landmark_secondary,
        delivery_instructions=data.delivery_instructions,
        access_notes=data.access_notes,
        address_type=data.address_type,
        contact_phone=data.contact_phone,
        confidence_score=confidence,
        verification_status="pending",
        verification_method="user_submitted"
    )

    db.add(address)

    # Create audit record
    history = AddressHistory(
        pda_id=pda_id,
        change_type="create",
        new_values={
            "zone_code": zone.zone_code,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "street_name": data.street_name
        }
    )
    db.add(history)

    await db.commit()
    await db.refresh(address)

    return AddressResponse(
        pda_id=address.pda_id,
        zone_code=address.zone_code,
        street_name=address.street_name,
        block=address.block,
        house_number=address.house_number,
        building_name=address.building_name,
        floor=address.floor,
        unit=address.unit,
        landmark_primary=address.landmark_primary,
        landmark_secondary=address.landmark_secondary,
        delivery_instructions=address.delivery_instructions,
        access_notes=address.access_notes,
        address_type=address.address_type,
        contact_phone=address.contact_phone,
        latitude=address.latitude,
        longitude=address.longitude,
        accuracy_m=address.accuracy_m,
        confidence_score=address.confidence_score,
        verification_status=address.verification_status,
        created_at=address.created_at,
        updated_at=address.updated_at,
        display_address=address.display_address
    )


@router.post("/verify", response_model=AddressVerifyResponse)
async def verify_address(
    request: AddressVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify an address against provided data.

    Used for payment verification (AVS-like functionality).
    """
    warnings = []

    # Validate PDA-ID format
    if not PDAIDService.validate_format(request.pda_id):
        return AddressVerifyResponse(
            verified=False,
            match_details=MatchDetails(pda_id_valid=False),
            confidence_score=0.0,
            address_status="invalid",
            last_verified=None,
            warnings=["Invalid PDA-ID format"]
        )

    # Fetch address
    stmt = select(Address).where(Address.pda_id == request.pda_id)
    result = await db.execute(stmt)
    address = result.scalar_one_or_none()

    if not address:
        return AddressVerifyResponse(
            verified=False,
            match_details=MatchDetails(pda_id_valid=False),
            confidence_score=0.0,
            address_status="not_found",
            last_verified=None,
            warnings=["Address not found"]
        )

    # Check matches
    postal_match = None
    street_match = None
    block_match = None

    if request.provided_postal_code:
        postal_match = request.provided_postal_code == address.zone_code

    if request.provided_street and address.street_name:
        street_match = request.provided_street.lower() in address.street_name.lower()

    if request.provided_block and address.block:
        block_match = request.provided_block.lower() == address.block.lower()

    # Determine verification result
    verified = True
    if postal_match is False:
        verified = False
        warnings.append("Postal code mismatch")
    if street_match is False:
        verified = False
        warnings.append("Street name mismatch")
    if block_match is False:
        warnings.append("Block mismatch (partial)")

    # Check address status
    if address.verification_status == "deprecated":
        verified = False
        warnings.append("Address has been deprecated")
    elif address.verification_status == "rejected":
        verified = False
        warnings.append("Address was rejected")
    elif address.verification_status == "pending":
        warnings.append("Address pending verification")

    # Low confidence warning
    if address.confidence_score < 0.5:
        warnings.append("Low confidence address")

    return AddressVerifyResponse(
        verified=verified,
        match_details=MatchDetails(
            pda_id_valid=True,
            postal_code_match=postal_match,
            street_match=street_match,
            block_match=block_match
        ),
        confidence_score=address.confidence_score,
        address_status=address.verification_status.value,
        last_verified=address.verified_at,
        warnings=warnings
    )


@router.get("/location/resolve", response_model=ReverseGeocodeResponse)
async def resolve_location(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius: float = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    Reverse geocode: find addresses near coordinates.

    Returns nearest addresses within the specified radius.
    """
    result = await GeocoderService.reverse_geocode(db, lat, lon, radius)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Convert to response format
    exact = None
    if result["exact_match"]:
        m = result["exact_match"]
        exact = NearbyAddress(
            pda_id=m["pda_id"],
            postal_code=m["postal_code"],
            display_address=m["display_address"],
            distance_m=m["distance_m"],
            latitude=m["latitude"],
            longitude=m["longitude"]
        )

    nearest = [
        NearbyAddress(
            pda_id=a["pda_id"],
            postal_code=a["postal_code"],
            display_address=a["display_address"],
            distance_m=a["distance_m"],
            latitude=a["latitude"],
            longitude=a["longitude"],
            bearing=GeocoderService.calculate_bearing(lat, lon, a["latitude"], a["longitude"])
        )
        for a in result["nearest_addresses"]
    ]

    zone = None
    if result["zone"]:
        z = result["zone"]
        zone = ZoneInfo(
            postal_code=z["postal_code"],
            zone_name=z["zone_name"],
            district=z["district"],
            region=z["region"]
        )

    return ReverseGeocodeResponse(
        exact_match=exact,
        nearest_addresses=nearest,
        zone=zone
    )
