"""
Robust Search API for Postal Directory.

Features:
- Real-time AJAX search with debouncing support
- Multi-criteria search (zone code, name, Plus Code, coordinates)
- Fuzzy matching with relevance scoring
- Filter by district, region, segment type
- GPS coordinate-based search
- Autocomplete suggestions
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, case, text
from pydantic import BaseModel

from app.database import get_db
from app.models.postal_zone import PostalZone
from app.models.address import Address

router = APIRouter()


class SearchResult(BaseModel):
    """Search result item."""
    zone_code: str
    zone_name: str
    district_name: str
    region_name: str
    segment_type: str
    plus_code: Optional[str]
    coordinates: Optional[dict]
    address_count: int
    relevance_score: float
    match_type: str  # exact, prefix, contains, fuzzy


class SearchResponse(BaseModel):
    """Search response."""
    query: str
    results: List[SearchResult]
    total_count: int
    suggestions: List[str]
    search_time_ms: float


class AutocompleteResponse(BaseModel):
    """Autocomplete response."""
    query: str
    suggestions: List[dict]


@router.get("/quick", response_model=SearchResponse)
async def quick_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    district: Optional[str] = Query(None, description="Filter by district name"),
    region: Optional[int] = Query(None, ge=1, le=5, description="Filter by region code"),
    segment_type: Optional[str] = Query(None, description="Filter by segment type"),
    db: AsyncSession = Depends(get_db)
):
    """
    Quick search across all zones.

    Searches zone codes, names, Plus Codes, and district names.
    Returns results ranked by relevance.
    """
    import time
    start_time = time.time()

    query_lower = q.lower().strip()
    query_upper = q.upper().strip()

    # Build search conditions with relevance scoring
    # Priority: exact match > prefix match > contains match

    conditions = []

    # Exact matches (highest priority)
    exact_conditions = or_(
        PostalZone.zone_code == query_upper,
        PostalZone.plus_code == query_upper,
        func.lower(PostalZone.zone_name) == query_lower,
    )

    # Prefix matches
    prefix_conditions = or_(
        PostalZone.zone_code.startswith(query_upper),
        PostalZone.primary_code.startswith(query_upper),
        PostalZone.plus_code.startswith(query_upper),
        func.lower(PostalZone.zone_name).startswith(query_lower),
    )

    # Contains matches
    contains_conditions = or_(
        PostalZone.zone_code.contains(query_upper),
        PostalZone.zone_name.ilike(f"%{q}%"),
        PostalZone.district_name.ilike(f"%{q}%"),
        PostalZone.plus_code.ilike(f"%{q}%"),
    )

    # Combine all search conditions
    search_condition = or_(exact_conditions, prefix_conditions, contains_conditions)

    # Build query
    stmt = select(PostalZone).where(search_condition)

    # Apply filters
    if district:
        stmt = stmt.where(PostalZone.district_name == district)
    if region:
        stmt = stmt.where(PostalZone.region_code == region)
    if segment_type:
        stmt = stmt.where(PostalZone.segment_type == segment_type)

    # Order by relevance (exact matches first, then prefix, then contains)
    stmt = stmt.order_by(
        # Exact matches first
        case(
            (PostalZone.zone_code == query_upper, 0),
            (PostalZone.plus_code == query_upper, 0),
            (func.lower(PostalZone.zone_name) == query_lower, 0),
            # Prefix matches second
            (PostalZone.zone_code.startswith(query_upper), 1),
            (PostalZone.primary_code.startswith(query_upper), 1),
            (func.lower(PostalZone.zone_name).startswith(query_lower), 1),
            # Contains matches last
            else_=2
        ),
        PostalZone.zone_code
    ).limit(limit)

    result = await db.execute(stmt)
    zones = result.scalars().all()

    # Get address counts
    results = []
    for zone in zones:
        # Calculate relevance score
        relevance = 0.0
        match_type = "contains"

        if zone.zone_code == query_upper or zone.plus_code == query_upper:
            relevance = 1.0
            match_type = "exact"
        elif zone.zone_name and zone.zone_name.lower() == query_lower:
            relevance = 1.0
            match_type = "exact"
        elif (zone.zone_code.startswith(query_upper) or
              zone.primary_code.startswith(query_upper) or
              (zone.zone_name and zone.zone_name.lower().startswith(query_lower))):
            relevance = 0.8
            match_type = "prefix"
        else:
            relevance = 0.5
            match_type = "contains"

        # Get address count
        addr_stmt = select(func.count(Address.pda_id)).where(Address.zone_code == zone.zone_code)
        addr_result = await db.execute(addr_stmt)
        addr_count = addr_result.scalar() or 0

        results.append(SearchResult(
            zone_code=zone.zone_code,
            zone_name=zone.zone_name or "",
            district_name=zone.district_name,
            region_name=zone.region_name,
            segment_type=zone.segment_type or "mixed",
            plus_code=zone.plus_code,
            coordinates={"latitude": zone.center_lat, "longitude": zone.center_lng} if zone.center_lat else None,
            address_count=addr_count,
            relevance_score=relevance,
            match_type=match_type
        ))

    # Get total count
    count_stmt = select(func.count(PostalZone.zone_code)).where(search_condition)
    if district:
        count_stmt = count_stmt.where(PostalZone.district_name == district)
    if region:
        count_stmt = count_stmt.where(PostalZone.region_code == region)
    if segment_type:
        count_stmt = count_stmt.where(PostalZone.segment_type == segment_type)

    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0

    # Generate suggestions for related searches
    suggestions = []
    if len(results) > 0:
        # Get unique district names from results
        districts = list(set(r.district_name for r in results[:5]))
        suggestions = [f"in {d}" for d in districts[:3]]

    search_time = (time.time() - start_time) * 1000

    return SearchResponse(
        query=q,
        results=results,
        total_count=total_count,
        suggestions=suggestions,
        search_time_ms=round(search_time, 2)
    )


@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """
    Fast autocomplete suggestions.

    Returns quick suggestions as user types.
    Optimized for speed with minimal data.
    """
    query_lower = q.lower().strip()
    query_upper = q.upper().strip()

    # Search for matching zones
    stmt = select(
        PostalZone.zone_code,
        PostalZone.zone_name,
        PostalZone.district_name,
        PostalZone.plus_code
    ).where(
        or_(
            PostalZone.zone_code.startswith(query_upper),
            PostalZone.zone_name.ilike(f"{q}%"),
            PostalZone.zone_name.ilike(f"% {q}%"),
            PostalZone.plus_code.startswith(query_upper),
        )
    ).order_by(
        case(
            (PostalZone.zone_code.startswith(query_upper), 0),
            (PostalZone.zone_name.ilike(f"{q}%"), 1),
            else_=2
        )
    ).limit(limit)

    result = await db.execute(stmt)
    rows = result.fetchall()

    suggestions = [
        {
            "zone_code": row[0],
            "zone_name": row[1] or "",
            "district_name": row[2],
            "plus_code": row[3],
            "display": f"{row[0]} - {row[1] or 'Zone'} ({row[2]})"
        }
        for row in rows
    ]

    return {
        "query": q,
        "suggestions": suggestions
    }


@router.get("/nearby")
async def search_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(1000, ge=100, le=10000),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search zones near GPS coordinates.

    Returns zones within specified radius, sorted by distance.
    Useful for driver navigation and location-based search.
    """
    stmt = text("""
        SELECT
            zone_code, zone_name, district_name, region_name,
            segment_type, plus_code, center_lat, center_lng,
            ST_Distance(
                geometry::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) as distance_meters
        FROM postal_zones
        WHERE geometry IS NOT NULL
        AND ST_DWithin(
            geometry::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        ORDER BY distance_meters
        LIMIT :limit
    """)

    result = await db.execute(stmt, {
        "lat": lat,
        "lng": lng,
        "radius": radius_meters,
        "limit": limit
    })
    zones = result.fetchall()

    return {
        "query_location": {"latitude": lat, "longitude": lng},
        "radius_meters": radius_meters,
        "results": [
            {
                "zone_code": z[0],
                "zone_name": z[1],
                "district_name": z[2],
                "region_name": z[3],
                "segment_type": z[4],
                "plus_code": z[5],
                "coordinates": {"latitude": z[6], "longitude": z[7]},
                "distance_meters": round(z[8], 2) if z[8] else None
            }
            for z in zones
        ],
        "count": len(zones)
    }


@router.get("/advanced")
async def advanced_search(
    zone_code: Optional[str] = Query(None, description="Zone code (exact or prefix)"),
    zone_name: Optional[str] = Query(None, description="Zone name (partial match)"),
    plus_code: Optional[str] = Query(None, description="Plus Code (exact or prefix)"),
    district: Optional[str] = Query(None, description="District name"),
    region: Optional[int] = Query(None, ge=1, le=5, description="Region code (1-5)"),
    segment_type: Optional[str] = Query(None, description="Segment type"),
    has_addresses: Optional[bool] = Query(None, description="Only zones with addresses"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced search with multiple filters.

    All filters are optional and can be combined.
    """
    stmt = select(PostalZone)
    count_stmt = select(func.count(PostalZone.zone_code))

    conditions = []

    if zone_code:
        conditions.append(
            or_(
                PostalZone.zone_code == zone_code.upper(),
                PostalZone.zone_code.startswith(zone_code.upper()),
                PostalZone.primary_code == zone_code.upper()
            )
        )

    if zone_name:
        conditions.append(PostalZone.zone_name.ilike(f"%{zone_name}%"))

    if plus_code:
        conditions.append(
            or_(
                PostalZone.plus_code == plus_code.upper(),
                PostalZone.plus_code.startswith(plus_code.upper())
            )
        )

    if district:
        conditions.append(PostalZone.district_name.ilike(f"%{district}%"))

    if region:
        conditions.append(PostalZone.region_code == region)

    if segment_type:
        conditions.append(PostalZone.segment_type == segment_type)

    if conditions:
        stmt = stmt.where(and_(*conditions))
        count_stmt = count_stmt.where(and_(*conditions))

    # Get total count
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Apply pagination
    stmt = stmt.order_by(PostalZone.zone_code).offset(offset).limit(limit)

    result = await db.execute(stmt)
    zones = result.scalars().all()

    # Filter by has_addresses if specified
    results = []
    for zone in zones:
        addr_stmt = select(func.count(Address.pda_id)).where(Address.zone_code == zone.zone_code)
        addr_result = await db.execute(addr_stmt)
        addr_count = addr_result.scalar() or 0

        if has_addresses is not None:
            if has_addresses and addr_count == 0:
                continue
            if not has_addresses and addr_count > 0:
                continue

        results.append({
            "zone_code": zone.zone_code,
            "zone_name": zone.zone_name,
            "district_name": zone.district_name,
            "region_name": zone.region_name,
            "segment_type": zone.segment_type,
            "plus_code": zone.plus_code,
            "coordinates": {"latitude": zone.center_lat, "longitude": zone.center_lng} if zone.center_lat else None,
            "address_count": addr_count
        })

    return {
        "filters": {
            "zone_code": zone_code,
            "zone_name": zone_name,
            "plus_code": plus_code,
            "district": district,
            "region": region,
            "segment_type": segment_type,
            "has_addresses": has_addresses
        },
        "results": results,
        "total_count": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/districts")
async def get_districts_for_filter(
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of all districts for filter dropdown.
    """
    stmt = select(
        PostalZone.district_name,
        PostalZone.region_name,
        func.count(PostalZone.zone_code).label("zone_count")
    ).group_by(
        PostalZone.district_name,
        PostalZone.region_name
    ).order_by(PostalZone.region_name, PostalZone.district_name)

    result = await db.execute(stmt)
    rows = result.fetchall()

    return [
        {
            "district_name": row[0],
            "region_name": row[1],
            "zone_count": row[2]
        }
        for row in rows
    ]


@router.get("/segment-types")
async def get_segment_types(
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of all segment types for filter dropdown.
    """
    stmt = select(
        PostalZone.segment_type,
        func.count(PostalZone.zone_code).label("count")
    ).where(
        PostalZone.segment_type.isnot(None)
    ).group_by(
        PostalZone.segment_type
    ).order_by(func.count(PostalZone.zone_code).desc())

    result = await db.execute(stmt)
    rows = result.fetchall()

    return [
        {"type": row[0], "count": row[1]}
        for row in rows
    ]
