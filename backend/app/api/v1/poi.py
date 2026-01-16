"""POI (Point of Interest) API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.poi import POI
from app.models.postal_zone import PostalZone
from app.schemas.poi import (
    POIResponse,
    POIListResponse,
    POINearbyRequest,
    POINearbyResponse,
    POINearbyResult,
    POICategoryCount,
    POICategoriesResponse,
)

router = APIRouter()


def poi_to_response(poi: POI, zone: Optional[PostalZone] = None) -> POIResponse:
    """Convert POI model to response schema."""
    return POIResponse(
        id=poi.id,
        osm_id=poi.osm_id,
        osm_type=poi.osm_type,
        name=poi.name,
        name_local=poi.name_local,
        category=poi.category,
        subcategory=poi.subcategory,
        latitude=float(poi.latitude),
        longitude=float(poi.longitude),
        plus_code=poi.plus_code,
        plus_code_short=poi.plus_code_short,
        zone_code=poi.zone_code,
        street_name=poi.street_name,
        house_number=poi.house_number,
        phone=poi.phone,
        website=poi.website,
        opening_hours=poi.opening_hours,
        is_verified=poi.is_verified,
        created_at=poi.created_at,
        updated_at=poi.updated_at,
        tags=poi.tags,
        display_name=poi.display_name,
        district_name=zone.district_name if zone else None,
        region_name=zone.region_name if zone else None,
    )


@router.get("", response_model=POIListResponse)
async def list_pois(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    zone_code: Optional[str] = None,
    district: Optional[str] = None,
    region: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = Query(None, min_length=2, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    List POIs with filtering and pagination.

    Filters:
    - category: Main category (healthcare, education, shopping, etc.)
    - subcategory: Specific type (hospital, school, restaurant, etc.)
    - zone_code: Postal zone code
    - district: District name
    - region: Region code (1-5)
    - search: Search in name
    """
    stmt = select(POI).options(joinedload(POI.zone))

    # Apply filters
    if category:
        stmt = stmt.where(POI.category == category)
    if subcategory:
        stmt = stmt.where(POI.subcategory == subcategory)
    if zone_code:
        stmt = stmt.where(POI.zone_code == zone_code)
    if district:
        stmt = stmt.join(PostalZone).where(PostalZone.district_name == district)
    if region:
        if "join" not in str(stmt):
            stmt = stmt.join(PostalZone)
        stmt = stmt.where(PostalZone.region_code == region)
    if search:
        stmt = stmt.where(POI.name.ilike(f"%{search}%"))

    # Get total count
    count_stmt = select(func.count(POI.id))
    if category:
        count_stmt = count_stmt.where(POI.category == category)
    if subcategory:
        count_stmt = count_stmt.where(POI.subcategory == subcategory)
    if zone_code:
        count_stmt = count_stmt.where(POI.zone_code == zone_code)
    if district:
        count_stmt = count_stmt.join(PostalZone).where(PostalZone.district_name == district)
    if region:
        if "join" not in str(count_stmt):
            count_stmt = count_stmt.join(PostalZone)
        count_stmt = count_stmt.where(PostalZone.region_code == region)
    if search:
        count_stmt = count_stmt.where(POI.name.ilike(f"%{search}%"))

    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    stmt = stmt.order_by(POI.name).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    pois = result.scalars().unique().all()

    return POIListResponse(
        pois=[poi_to_response(poi, poi.zone) for poi in pois],
        total_count=total,
        page=page,
        page_size=page_size
    )


@router.get("/categories", response_model=POICategoriesResponse)
async def list_categories(db: AsyncSession = Depends(get_db)):
    """
    Get list of all POI categories with counts.
    """
    # Get category counts
    stmt = (
        select(
            POI.category,
            func.count(POI.id).label("count")
        )
        .group_by(POI.category)
        .order_by(func.count(POI.id).desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    categories = []
    total = 0

    for row in rows:
        # Get subcategory counts for this category
        sub_stmt = (
            select(
                POI.subcategory,
                func.count(POI.id).label("count")
            )
            .where(POI.category == row.category)
            .where(POI.subcategory.isnot(None))
            .group_by(POI.subcategory)
            .order_by(func.count(POI.id).desc())
        )
        sub_result = await db.execute(sub_stmt)
        subcategories = [
            {"subcategory": sub.subcategory, "count": sub.count}
            for sub in sub_result.all()
        ]

        categories.append(POICategoryCount(
            category=row.category,
            count=row.count,
            subcategories=subcategories if subcategories else None
        ))
        total += row.count

    return POICategoriesResponse(
        categories=categories,
        total_pois=total
    )


@router.get("/search")
async def search_pois(
    q: str = Query(..., min_length=2, max_length=200),
    category: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Search POIs by name.
    """
    stmt = (
        select(POI)
        .options(joinedload(POI.zone))
        .where(POI.name.ilike(f"%{q}%"))
    )

    if category:
        stmt = stmt.where(POI.category == category)

    stmt = stmt.order_by(POI.name).limit(limit)

    result = await db.execute(stmt)
    pois = result.scalars().unique().all()

    return {
        "query": q,
        "results": [poi_to_response(poi, poi.zone) for poi in pois],
        "count": len(pois)
    }


@router.get("/nearby", response_model=POINearbyResponse)
async def get_nearby_pois(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(1000, ge=10, le=50000),
    category: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Find POIs near a given location.

    Parameters:
    - lat, lon: Center coordinates
    - radius_m: Search radius in meters (default 1000m)
    - category: Optional category filter
    """
    # Use PostGIS for distance calculation
    query = text("""
        SELECT
            p.*,
            ST_Distance(
                ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
            ) as distance_m,
            z.district_name,
            z.region_name
        FROM pois p
        LEFT JOIN postal_zones z ON p.zone_code = z.zone_code
        WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
            :radius
        )
        AND (:category IS NULL OR p.category = :category)
        ORDER BY distance_m
        LIMIT :limit
    """)

    result = await db.execute(query, {
        "lat": lat,
        "lon": lon,
        "radius": radius_m,
        "category": category,
        "limit": limit
    })

    rows = result.fetchall()

    pois = []
    for row in rows:
        pois.append(POINearbyResult(
            id=row.id,
            osm_id=row.osm_id,
            osm_type=row.osm_type,
            name=row.name,
            name_local=row.name_local,
            category=row.category,
            subcategory=row.subcategory,
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            plus_code=row.plus_code,
            plus_code_short=row.plus_code_short,
            zone_code=row.zone_code,
            street_name=row.street_name,
            house_number=row.house_number,
            phone=row.phone,
            website=row.website,
            opening_hours=row.opening_hours,
            is_verified=row.is_verified,
            created_at=row.created_at,
            updated_at=row.updated_at,
            tags=row.tags,
            display_name=row.name or f"{row.subcategory or row.category}",
            district_name=row.district_name,
            region_name=row.region_name,
            distance_m=round(row.distance_m, 1)
        ))

    return POINearbyResponse(
        pois=pois,
        total_count=len(pois),
        center={"latitude": lat, "longitude": lon},
        radius_m=radius_m
    )


@router.get("/zone/{zone_code}")
async def get_pois_in_zone(
    zone_code: str,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all POIs in a postal zone.
    """
    # Verify zone exists
    zone_stmt = select(PostalZone).where(PostalZone.zone_code == zone_code)
    zone_result = await db.execute(zone_stmt)
    zone = zone_result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Postal zone not found")

    # Build query
    stmt = select(POI).where(POI.zone_code == zone_code)
    count_stmt = select(func.count(POI.id)).where(POI.zone_code == zone_code)

    if category:
        stmt = stmt.where(POI.category == category)
        count_stmt = count_stmt.where(POI.category == category)

    # Get total
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    stmt = stmt.order_by(POI.category, POI.name).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    pois = result.scalars().all()

    # Group by category
    categories = {}
    for poi in pois:
        if poi.category not in categories:
            categories[poi.category] = []
        categories[poi.category].append(poi_to_response(poi, zone))

    return {
        "zone_code": zone_code,
        "zone_name": zone.zone_name,
        "district": zone.district_name,
        "region": zone.region_name,
        "total_count": total,
        "page": page,
        "page_size": page_size,
        "pois_by_category": categories,
        "pois": [poi_to_response(poi, zone) for poi in pois]
    }


@router.get("/{poi_id}", response_model=POIResponse)
async def get_poi(
    poi_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get POI details by ID.
    """
    stmt = select(POI).options(joinedload(POI.zone)).where(POI.id == poi_id)
    result = await db.execute(stmt)
    poi = result.scalar_one_or_none()

    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")

    return poi_to_response(poi, poi.zone)
