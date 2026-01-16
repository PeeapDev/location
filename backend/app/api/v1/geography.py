"""API routes for geographic hierarchy management (Regions, Districts, Zones)."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import json

from app.database import get_db
from app.models.user import User
from app.models.region import Region
from app.models.district import District
from app.models.zone import Zone
from app.api.deps import get_superadmin, get_admin_or_above, get_current_active_user
from app.schemas.geography import (
    RegionCreate, RegionUpdate, RegionResponse, RegionListResponse,
    DistrictCreate, DistrictUpdate, DistrictResponse, DistrictListResponse,
    ZoneCreate, ZoneUpdate, ZoneResponse, ZoneListResponse,
    GeographyStats,
)

router = APIRouter()


# =============================================================================
# Region Endpoints (Superadmin only)
# =============================================================================

@router.get("/regions", response_model=RegionListResponse)
async def list_regions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all regions with pagination."""
    query = select(Region)

    if is_active is not None:
        query = query.where(Region.is_active == is_active)

    query = query.order_by(Region.code)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    regions = result.scalars().all()

    # Build response with district counts
    items = []
    for region in regions:
        count_stmt = select(func.count()).select_from(District).where(District.region_id == region.id)
        count_result = await db.execute(count_stmt)
        district_count = count_result.scalar()

        items.append(RegionResponse(
            id=region.id,
            code=region.code,
            name=region.name,
            short_code=region.short_code,
            description=region.description,
            is_active=region.is_active,
            is_locked=region.is_locked,
            district_count=district_count,
            created_at=region.created_at,
            updated_at=region.updated_at,
            created_by=region.created_by,
        ))

    return RegionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/regions", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
async def create_region(
    region_data: RegionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Create a new region (Superadmin only)."""
    # Check for duplicate name
    stmt = select(Region).where(Region.name == region_data.name)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Region with name '{region_data.name}' already exists",
        )

    # Check for duplicate short_code
    stmt = select(Region).where(Region.short_code == region_data.short_code.upper())
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Region with short code '{region_data.short_code}' already exists",
        )

    # Generate next region code (1-9)
    stmt = select(func.max(func.cast(Region.code, Integer)))
    result = await db.execute(stmt)
    max_code = result.scalar() or 0
    next_code = str(max_code + 1)

    if int(next_code) > 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of regions (9) reached",
        )

    region = Region(
        code=next_code,
        name=region_data.name,
        short_code=region_data.short_code.upper(),
        description=region_data.description,
        created_by=current_user.email,
    )

    db.add(region)
    await db.commit()
    await db.refresh(region)

    return RegionResponse(
        id=region.id,
        code=region.code,
        name=region.name,
        short_code=region.short_code,
        description=region.description,
        is_active=region.is_active,
        is_locked=region.is_locked,
        district_count=0,
        created_at=region.created_at,
        updated_at=region.updated_at,
        created_by=region.created_by,
    )


@router.get("/regions/{region_id}", response_model=RegionResponse)
async def get_region(
    region_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific region by ID."""
    stmt = select(Region).where(Region.id == region_id)
    result = await db.execute(stmt)
    region = result.scalar_one_or_none()

    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found",
        )

    # Get district count
    count_stmt = select(func.count()).select_from(District).where(District.region_id == region.id)
    count_result = await db.execute(count_stmt)
    district_count = count_result.scalar()

    return RegionResponse(
        id=region.id,
        code=region.code,
        name=region.name,
        short_code=region.short_code,
        description=region.description,
        is_active=region.is_active,
        is_locked=region.is_locked,
        district_count=district_count,
        created_at=region.created_at,
        updated_at=region.updated_at,
        created_by=region.created_by,
    )


@router.put("/regions/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: int,
    region_data: RegionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Update a region (Superadmin only). Cannot edit locked regions."""
    stmt = select(Region).where(Region.id == region_id)
    result = await db.execute(stmt)
    region = result.scalar_one_or_none()

    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found",
        )

    if region.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a locked region (has districts)",
        )

    # Update fields
    if region_data.name is not None:
        # Check for duplicate
        stmt = select(Region).where(Region.name == region_data.name, Region.id != region_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Region with name '{region_data.name}' already exists",
            )
        region.name = region_data.name

    if region_data.short_code is not None:
        stmt = select(Region).where(Region.short_code == region_data.short_code.upper(), Region.id != region_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Region with short code '{region_data.short_code}' already exists",
            )
        region.short_code = region_data.short_code.upper()

    if region_data.description is not None:
        region.description = region_data.description

    if region_data.is_active is not None:
        region.is_active = region_data.is_active

    await db.commit()
    await db.refresh(region)

    # Get district count
    count_stmt = select(func.count()).select_from(District).where(District.region_id == region.id)
    count_result = await db.execute(count_stmt)
    district_count = count_result.scalar()

    return RegionResponse(
        id=region.id,
        code=region.code,
        name=region.name,
        short_code=region.short_code,
        description=region.description,
        is_active=region.is_active,
        is_locked=region.is_locked,
        district_count=district_count,
        created_at=region.created_at,
        updated_at=region.updated_at,
        created_by=region.created_by,
    )


@router.delete("/regions/{region_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_region(
    region_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Delete a region (Superadmin only). Cannot delete locked regions."""
    stmt = select(Region).where(Region.id == region_id)
    result = await db.execute(stmt)
    region = result.scalar_one_or_none()

    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found",
        )

    if region.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a locked region (has districts)",
        )

    await db.delete(region)
    await db.commit()


# =============================================================================
# District Endpoints (Superadmin only for create/update)
# =============================================================================

@router.get("/districts", response_model=DistrictListResponse)
async def list_districts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    region_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all districts with pagination."""
    query = select(District).options(selectinload(District.region))

    if region_id is not None:
        query = query.where(District.region_id == region_id)

    if is_active is not None:
        query = query.where(District.is_active == is_active)

    query = query.order_by(District.full_code)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    districts = result.scalars().all()

    # Build response with zone counts
    items = []
    for district in districts:
        count_stmt = select(func.count()).select_from(Zone).where(Zone.district_id == district.id)
        count_result = await db.execute(count_stmt)
        zone_count = count_result.scalar()

        items.append(DistrictResponse(
            id=district.id,
            region_id=district.region_id,
            code=district.code,
            full_code=district.full_code,
            name=district.name,
            short_code=district.short_code,
            capital=district.capital,
            description=district.description,
            population=district.population,
            area_sq_km=district.area_sq_km,
            is_active=district.is_active,
            is_locked=district.is_locked,
            zone_count=zone_count,
            created_at=district.created_at,
            updated_at=district.updated_at,
            created_by=district.created_by,
            region_name=district.region.name if district.region else None,
            region_code=district.region.code if district.region else None,
        ))

    return DistrictListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/districts", response_model=DistrictResponse, status_code=status.HTTP_201_CREATED)
async def create_district(
    district_data: DistrictCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Create a new district (Superadmin only)."""
    # Get the parent region
    stmt = select(Region).where(Region.id == district_data.region_id)
    result = await db.execute(stmt)
    region = result.scalar_one_or_none()

    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent region not found",
        )

    # Generate next district code (0-9 within region)
    stmt = select(func.max(func.cast(District.code, Integer))).where(
        District.region_id == district_data.region_id
    )
    result = await db.execute(stmt)
    max_code = result.scalar()
    next_code = str((max_code or -1) + 1)

    if int(next_code) > 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of districts (10) reached for this region",
        )

    full_code = f"{region.code}{next_code}"

    district = District(
        region_id=district_data.region_id,
        code=next_code,
        full_code=full_code,
        name=district_data.name,
        short_code=district_data.short_code.upper(),
        capital=district_data.capital,
        description=district_data.description,
        population=district_data.population,
        area_sq_km=district_data.area_sq_km,
        created_by=current_user.email,
    )

    # Lock the parent region
    region.is_locked = True

    db.add(district)
    await db.commit()
    await db.refresh(district)

    return DistrictResponse(
        id=district.id,
        region_id=district.region_id,
        code=district.code,
        full_code=district.full_code,
        name=district.name,
        short_code=district.short_code,
        capital=district.capital,
        description=district.description,
        population=district.population,
        area_sq_km=district.area_sq_km,
        is_active=district.is_active,
        is_locked=district.is_locked,
        zone_count=0,
        created_at=district.created_at,
        updated_at=district.updated_at,
        created_by=district.created_by,
        region_name=region.name,
        region_code=region.code,
    )


@router.get("/districts/{district_id}", response_model=DistrictResponse)
async def get_district(
    district_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific district by ID."""
    stmt = select(District).options(selectinload(District.region)).where(District.id == district_id)
    result = await db.execute(stmt)
    district = result.scalar_one_or_none()

    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="District not found",
        )

    # Get zone count
    count_stmt = select(func.count()).select_from(Zone).where(Zone.district_id == district.id)
    count_result = await db.execute(count_stmt)
    zone_count = count_result.scalar()

    return DistrictResponse(
        id=district.id,
        region_id=district.region_id,
        code=district.code,
        full_code=district.full_code,
        name=district.name,
        short_code=district.short_code,
        capital=district.capital,
        description=district.description,
        population=district.population,
        area_sq_km=district.area_sq_km,
        is_active=district.is_active,
        is_locked=district.is_locked,
        zone_count=zone_count,
        created_at=district.created_at,
        updated_at=district.updated_at,
        created_by=district.created_by,
        region_name=district.region.name if district.region else None,
        region_code=district.region.code if district.region else None,
    )


@router.put("/districts/{district_id}", response_model=DistrictResponse)
async def update_district(
    district_id: int,
    district_data: DistrictUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Update a district (Superadmin only). Cannot edit locked districts."""
    stmt = select(District).options(selectinload(District.region)).where(District.id == district_id)
    result = await db.execute(stmt)
    district = result.scalar_one_or_none()

    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="District not found",
        )

    if district.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a locked district (has zones)",
        )

    # Update fields
    if district_data.name is not None:
        district.name = district_data.name

    if district_data.short_code is not None:
        district.short_code = district_data.short_code.upper()

    if district_data.capital is not None:
        district.capital = district_data.capital

    if district_data.description is not None:
        district.description = district_data.description

    if district_data.population is not None:
        district.population = district_data.population

    if district_data.area_sq_km is not None:
        district.area_sq_km = district_data.area_sq_km

    if district_data.is_active is not None:
        district.is_active = district_data.is_active

    await db.commit()
    await db.refresh(district)

    # Get zone count
    count_stmt = select(func.count()).select_from(Zone).where(Zone.district_id == district.id)
    count_result = await db.execute(count_stmt)
    zone_count = count_result.scalar()

    return DistrictResponse(
        id=district.id,
        region_id=district.region_id,
        code=district.code,
        full_code=district.full_code,
        name=district.name,
        short_code=district.short_code,
        capital=district.capital,
        description=district.description,
        population=district.population,
        area_sq_km=district.area_sq_km,
        is_active=district.is_active,
        is_locked=district.is_locked,
        zone_count=zone_count,
        created_at=district.created_at,
        updated_at=district.updated_at,
        created_by=district.created_by,
        region_name=district.region.name if district.region else None,
        region_code=district.region.code if district.region else None,
    )


@router.delete("/districts/{district_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_district(
    district_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Delete a district (Superadmin only). Cannot delete locked districts."""
    stmt = select(District).where(District.id == district_id)
    result = await db.execute(stmt)
    district = result.scalar_one_or_none()

    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="District not found",
        )

    if district.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a locked district (has zones)",
        )

    await db.delete(district)
    await db.commit()


# =============================================================================
# Zone Endpoints (Admin or above for create/update)
# =============================================================================

# IMPORTANT: This endpoint must be defined BEFORE /zones/{zone_id} to avoid route matching issues
@router.get("/zones/geojson")
async def get_zones_geojson(
    district_id: Optional[int] = None,
    region_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all zones as GeoJSON FeatureCollection (for map display). Public endpoint."""
    query = select(Zone).options(
        selectinload(Zone.district).selectinload(District.region)
    ).where(Zone.is_active == True, Zone.geometry.isnot(None))

    if district_id is not None:
        query = query.where(Zone.district_id == district_id)

    if region_id is not None:
        query = query.join(District).where(District.region_id == region_id)

    result = await db.execute(query)
    zones = result.scalars().all()

    # Use raw SQL to get GeoJSON directly from PostGIS for better compatibility
    from sqlalchemy import text
    import json

    # Build the zone IDs to query
    zone_ids = [z.id for z in zones]

    if not zone_ids:
        return {"type": "FeatureCollection", "features": []}

    # Get geometry as GeoJSON directly from PostGIS
    geojson_query = text("""
        SELECT id, ST_AsGeoJSON(geometry) as geojson
        FROM zones
        WHERE id = ANY(:zone_ids) AND geometry IS NOT NULL
    """)
    geojson_result = await db.execute(geojson_query, {"zone_ids": zone_ids})
    geojson_map = {row.id: json.loads(row.geojson) for row in geojson_result if row.geojson}

    features = []
    for zone in zones:
        if zone.id in geojson_map:
            features.append({
                "type": "Feature",
                "geometry": geojson_map[zone.id],
                "properties": {
                    "id": zone.id,
                    "primary_code": zone.primary_code,
                    "name": zone.name or f"Zone {zone.primary_code}",
                    "zone_type": zone.zone_type,
                    "district_name": zone.district.name if zone.district else None,
                    "region_name": zone.district.region.name if zone.district and zone.district.region else None,
                    "address_count": zone.address_count,
                },
            })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/zones", response_model=ZoneListResponse)
async def list_zones(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    district_id: Optional[int] = None,
    region_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all zones with pagination."""
    query = select(Zone).options(
        selectinload(Zone.district).selectinload(District.region)
    )

    if district_id is not None:
        query = query.where(Zone.district_id == district_id)

    if region_id is not None:
        query = query.join(District).where(District.region_id == region_id)

    if is_active is not None:
        query = query.where(Zone.is_active == is_active)

    query = query.order_by(Zone.primary_code)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    zones = result.scalars().all()

    items = []
    for zone in zones:
        items.append(ZoneResponse(
            id=zone.id,
            district_id=zone.district_id,
            zone_number=zone.zone_number,
            primary_code=zone.primary_code,
            name=zone.name,
            description=zone.description,
            zone_type=zone.zone_type,
            ward=zone.ward,
            center_lat=zone.center_lat,
            center_lng=zone.center_lng,
            is_active=zone.is_active,
            is_locked=zone.is_locked,
            address_count=zone.address_count,
            created_at=zone.created_at,
            updated_at=zone.updated_at,
            created_by=zone.created_by,
            district_name=zone.district.name if zone.district else None,
            district_code=zone.district.full_code if zone.district else None,
            region_name=zone.district.region.name if zone.district and zone.district.region else None,
            region_code=zone.district.region.code if zone.district and zone.district.region else None,
            geometry=None,  # Don't include geometry in list view
        ))

    return ZoneListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/zones", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: ZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Create a new zone (Admin or above). Typically drawn on a map."""
    # Get the parent district
    stmt = select(District).options(selectinload(District.region)).where(District.id == zone_data.district_id)
    result = await db.execute(stmt)
    district = result.scalar_one_or_none()

    if not district:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent district not found",
        )

    # Generate next zone number (00-99 within district)
    stmt = select(func.max(func.cast(Zone.zone_number, Integer))).where(
        Zone.district_id == zone_data.district_id
    )
    result = await db.execute(stmt)
    max_num = result.scalar()
    next_num = (max_num or -1) + 1

    if next_num > 99:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of zones (100) reached for this district",
        )

    zone_number = f"{next_num:03d}"

    # Generate numeric postal code (New Zealand style)
    # Format: XYZZ where X=region, Y=district, ZZ=zone
    if district.numeric_code:
        # Use the district's numeric code (e.g., "11" for Western Urban)
        primary_code = f"{district.numeric_code}{next_num:02d}"
    else:
        # Fallback: Calculate from region and district codes
        # Region code (1-5) + District code (0-9) + Zone number (00-99)
        region_num = 1  # Default to Western Area
        if district.region:
            region_map = {"W": 1, "N": 2, "NW": 3, "S": 4, "E": 5}
            region_num = region_map.get(district.region.code, 1)
        district_num = int(district.code) if district.code.isdigit() else 0
        primary_code = f"{region_num}{district_num}{next_num:02d}"

    # Handle geometry if provided
    geometry = None
    if zone_data.geometry:
        from geoalchemy2 import WKTElement
        from shapely.geometry import shape
        geom_shape = shape(zone_data.geometry)
        geometry = WKTElement(geom_shape.wkt, srid=4326)

    zone = Zone(
        district_id=zone_data.district_id,
        zone_number=zone_number,
        primary_code=primary_code,
        name=zone_data.name,
        description=zone_data.description,
        zone_type=zone_data.zone_type,
        ward=zone_data.ward,
        geometry=geometry,
        center_lat=zone_data.center_lat,
        center_lng=zone_data.center_lng,
        created_by=current_user.email,
    )

    # Lock the parent district
    district.is_locked = True

    db.add(zone)
    await db.commit()
    await db.refresh(zone)

    return ZoneResponse(
        id=zone.id,
        district_id=zone.district_id,
        zone_number=zone.zone_number,
        primary_code=zone.primary_code,
        name=zone.name,
        description=zone.description,
        zone_type=zone.zone_type,
        ward=zone.ward,
        center_lat=zone.center_lat,
        center_lng=zone.center_lng,
        is_active=zone.is_active,
        is_locked=zone.is_locked,
        address_count=0,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        created_by=zone.created_by,
        district_name=district.name,
        district_code=district.full_code,
        region_name=district.region.name if district.region else None,
        region_code=district.region.code if district.region else None,
        geometry=zone_data.geometry,
    )


@router.get("/zones/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific zone by ID (includes geometry)."""
    stmt = select(Zone).options(
        selectinload(Zone.district).selectinload(District.region)
    ).where(Zone.id == zone_id)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )

    # Convert geometry to GeoJSON
    geometry_geojson = None
    if zone.geometry is not None:
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping
        try:
            geom_shape = to_shape(zone.geometry)
            geometry_geojson = mapping(geom_shape)
        except Exception:
            pass

    return ZoneResponse(
        id=zone.id,
        district_id=zone.district_id,
        zone_number=zone.zone_number,
        primary_code=zone.primary_code,
        name=zone.name,
        description=zone.description,
        zone_type=zone.zone_type,
        ward=zone.ward,
        center_lat=zone.center_lat,
        center_lng=zone.center_lng,
        is_active=zone.is_active,
        is_locked=zone.is_locked,
        address_count=zone.address_count,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        created_by=zone.created_by,
        district_name=zone.district.name if zone.district else None,
        district_code=zone.district.full_code if zone.district else None,
        region_name=zone.district.region.name if zone.district and zone.district.region else None,
        region_code=zone.district.region.code if zone.district and zone.district.region else None,
        geometry=geometry_geojson,
    )


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: int,
    zone_data: ZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Update a zone (Admin or above). Geometry can be updated even if locked."""
    stmt = select(Zone).options(
        selectinload(Zone.district).selectinload(District.region)
    ).where(Zone.id == zone_id)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )

    # Update fields
    if zone_data.name is not None:
        zone.name = zone_data.name

    if zone_data.description is not None:
        zone.description = zone_data.description

    if zone_data.zone_type is not None:
        zone.zone_type = zone_data.zone_type

    if zone_data.center_lat is not None:
        zone.center_lat = zone_data.center_lat

    if zone_data.center_lng is not None:
        zone.center_lng = zone_data.center_lng

    if zone_data.is_active is not None:
        zone.is_active = zone_data.is_active

    # Update geometry if provided
    if zone_data.geometry is not None:
        from geoalchemy2 import WKTElement
        from shapely.geometry import shape
        geom_shape = shape(zone_data.geometry)
        zone.geometry = WKTElement(geom_shape.wkt, srid=4326)

    await db.commit()
    await db.refresh(zone)

    # Convert geometry to GeoJSON for response
    geometry_geojson = None
    if zone.geometry is not None:
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping
        try:
            geom_shape = to_shape(zone.geometry)
            geometry_geojson = mapping(geom_shape)
        except Exception:
            pass

    return ZoneResponse(
        id=zone.id,
        district_id=zone.district_id,
        zone_number=zone.zone_number,
        primary_code=zone.primary_code,
        name=zone.name,
        description=zone.description,
        zone_type=zone.zone_type,
        ward=zone.ward,
        center_lat=zone.center_lat,
        center_lng=zone.center_lng,
        is_active=zone.is_active,
        is_locked=zone.is_locked,
        address_count=zone.address_count,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
        created_by=zone.created_by,
        district_name=zone.district.name if zone.district else None,
        district_code=zone.district.full_code if zone.district else None,
        region_name=zone.district.region.name if zone.district and zone.district.region else None,
        region_code=zone.district.region.code if zone.district and zone.district.region else None,
        geometry=geometry_geojson,
    )


@router.delete("/zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_superadmin),
):
    """Delete a zone (Superadmin only). Cannot delete locked zones."""
    stmt = select(Zone).where(Zone.id == zone_id)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )

    if zone.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a locked zone (has addresses)",
        )

    await db.delete(zone)
    await db.commit()


@router.put("/zones/{zone_id}/geometry")
async def update_zone_geometry(
    zone_id: int,
    geometry_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_or_above),
):
    """Update only the geometry of a zone (for drag-and-drop editing)."""
    stmt = select(Zone).where(Zone.id == zone_id)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found",
        )

    geometry = geometry_data.get("geometry")
    if geometry:
        from geoalchemy2 import WKTElement
        from shapely.geometry import shape
        geom_shape = shape(geometry)
        zone.geometry = WKTElement(geom_shape.wkt, srid=4326)

        # Update center coordinates
        centroid = geom_shape.centroid
        zone.center_lat = str(centroid.y)
        zone.center_lng = str(centroid.x)

    await db.commit()

    return {"status": "success", "zone_id": zone_id}


# =============================================================================
# Statistics
# =============================================================================

@router.get("/stats", response_model=GeographyStats)
async def get_geography_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get geography statistics."""
    # Total counts
    region_count = await db.execute(select(func.count()).select_from(Region))
    district_count = await db.execute(select(func.count()).select_from(District))
    zone_count = await db.execute(select(func.count()).select_from(Zone))

    # Active counts
    active_regions = await db.execute(
        select(func.count()).select_from(Region).where(Region.is_active == True)
    )
    active_districts = await db.execute(
        select(func.count()).select_from(District).where(District.is_active == True)
    )
    active_zones = await db.execute(
        select(func.count()).select_from(Zone).where(Zone.is_active == True)
    )

    # Address count (sum from zones)
    address_count = await db.execute(
        select(func.coalesce(func.sum(Zone.address_count), 0))
    )

    return GeographyStats(
        total_regions=region_count.scalar(),
        total_districts=district_count.scalar(),
        total_zones=zone_count.scalar(),
        total_addresses=address_count.scalar(),
        active_regions=active_regions.scalar(),
        active_districts=active_districts.scalar(),
        active_zones=active_zones.scalar(),
    )


