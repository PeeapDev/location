"""
Spatial API for Postal Directory.

Features:
- Geohash-based spatial queries
- Spatial validation endpoints
- Meta-enhanced search (location names, landmarks)
- Coverage analysis
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from pydantic import BaseModel

from app.database import get_db
from app.models.postal_zone import PostalZone
from app.models.address import Address
from app.services import geohash as gh
from app.services.spatial_validation import (
    SpatialValidator, validate_address, ValidationStatus
)

router = APIRouter()


# ============== Request/Response Models ==============

class MetaSearchResult(BaseModel):
    """Search result with metadata."""
    zone_code: str
    zone_name: Optional[str]
    district_name: str
    region_name: str
    segment_type: Optional[str]
    plus_code: Optional[str]
    geohash: Optional[str]
    coordinates: Optional[dict]
    match_source: str  # name, alternate_name, landmark, poi, reference
    match_text: str  # What matched
    relevance_score: float


class ValidationRequest(BaseModel):
    """Request to validate an address point."""
    latitude: float
    longitude: float
    zone_code: Optional[str] = None


class ValidationResponse(BaseModel):
    """Validation result."""
    is_valid: bool
    latitude: float
    longitude: float
    geohash: str
    results: List[dict]
    suggested_zone: Optional[dict] = None


class GeohashInfo(BaseModel):
    """Geohash information."""
    geohash: str
    precision: int
    center_lat: float
    center_lng: float
    bounds: dict
    neighbors: dict
    region: Optional[str]


# ============== Meta-Enhanced Search ==============

@router.get("/meta-search", response_model=dict)
async def meta_search(
    q: str = Query(..., min_length=1, description="Search query - location name, landmark, etc."),
    limit: int = Query(30, ge=1, le=100),
    district: Optional[str] = Query(None),
    region: Optional[int] = Query(None, ge=1, le=5),
    db: AsyncSession = Depends(get_db)
):
    """
    Search zones by metadata (names, landmarks, references).

    Unlike code-based search, this finds zones by:
    - Zone name (primary and alternate)
    - Landmarks ("near the market")
    - POIs ("MTN office")
    - Common references ("opposite the church")
    - Local language names

    Perfect for users who know a location name but not the postal code.
    """
    import time
    start_time = time.time()

    query_lower = q.lower().strip()
    results = []

    # Build comprehensive search across all metadata fields
    conditions = []

    # 1. Search zone_name (primary match)
    conditions.append(PostalZone.zone_name.ilike(f"%{q}%"))

    # 2. Search district_name
    conditions.append(PostalZone.district_name.ilike(f"%{q}%"))

    # 3. Search alternate_names array
    conditions.append(
        text(f"EXISTS (SELECT 1 FROM unnest(alternate_names) AS name WHERE LOWER(name) LIKE :pattern)")
    )

    # 4. Search landmarks array
    conditions.append(
        text(f"EXISTS (SELECT 1 FROM unnest(landmarks) AS landmark WHERE LOWER(landmark) LIKE :pattern)")
    )

    # 5. Search nearby_pois array
    conditions.append(
        text(f"EXISTS (SELECT 1 FROM unnest(nearby_pois) AS poi WHERE LOWER(poi) LIKE :pattern)")
    )

    # 6. Search common_references array
    conditions.append(
        text(f"EXISTS (SELECT 1 FROM unnest(common_references) AS ref WHERE LOWER(ref) LIKE :pattern)")
    )

    # 7. Search search_text (full-text)
    conditions.append(PostalZone.search_text.ilike(f"%{q}%"))

    # 8. Search local_names JSONB
    conditions.append(
        text("search_text ILIKE :full_pattern OR zone_name ILIKE :full_pattern")
    )

    # Build the query with pattern parameter
    pattern = f"%{query_lower}%"

    # Complex query with scoring
    stmt = text("""
        WITH scored_zones AS (
            SELECT
                zone_code, zone_name, district_name, region_name, segment_type,
                plus_code, geohash, center_lat, center_lng,
                CASE
                    WHEN LOWER(zone_name) = :exact_query THEN 100
                    WHEN LOWER(zone_name) LIKE :prefix_pattern THEN 80
                    WHEN LOWER(zone_name) LIKE :pattern THEN 60
                    WHEN LOWER(district_name) LIKE :pattern THEN 50
                    WHEN search_text ILIKE :pattern THEN 40
                    WHEN EXISTS (SELECT 1 FROM unnest(alternate_names) AS n WHERE LOWER(n) LIKE :pattern) THEN 70
                    WHEN EXISTS (SELECT 1 FROM unnest(landmarks) AS l WHERE LOWER(l) LIKE :pattern) THEN 55
                    WHEN EXISTS (SELECT 1 FROM unnest(nearby_pois) AS p WHERE LOWER(p) LIKE :pattern) THEN 45
                    WHEN EXISTS (SELECT 1 FROM unnest(common_references) AS r WHERE LOWER(r) LIKE :pattern) THEN 35
                    ELSE 10
                END as score,
                CASE
                    WHEN LOWER(zone_name) LIKE :pattern THEN 'zone_name'
                    WHEN LOWER(district_name) LIKE :pattern THEN 'district'
                    WHEN EXISTS (SELECT 1 FROM unnest(alternate_names) AS n WHERE LOWER(n) LIKE :pattern) THEN 'alternate_name'
                    WHEN EXISTS (SELECT 1 FROM unnest(landmarks) AS l WHERE LOWER(l) LIKE :pattern) THEN 'landmark'
                    WHEN EXISTS (SELECT 1 FROM unnest(nearby_pois) AS p WHERE LOWER(p) LIKE :pattern) THEN 'poi'
                    WHEN EXISTS (SELECT 1 FROM unnest(common_references) AS r WHERE LOWER(r) LIKE :pattern) THEN 'reference'
                    WHEN search_text ILIKE :pattern THEN 'search_text'
                    ELSE 'unknown'
                END as match_source
            FROM postal_zones
            WHERE (
                zone_name ILIKE :pattern
                OR district_name ILIKE :pattern
                OR search_text ILIKE :pattern
                OR EXISTS (SELECT 1 FROM unnest(alternate_names) AS n WHERE LOWER(n) LIKE :pattern)
                OR EXISTS (SELECT 1 FROM unnest(landmarks) AS l WHERE LOWER(l) LIKE :pattern)
                OR EXISTS (SELECT 1 FROM unnest(nearby_pois) AS p WHERE LOWER(p) LIKE :pattern)
                OR EXISTS (SELECT 1 FROM unnest(common_references) AS r WHERE LOWER(r) LIKE :pattern)
            )
        )
        SELECT * FROM scored_zones
        WHERE 1=1
        """ + (f"AND district_name = :district" if district else "") + """
        """ + (f"AND region_code = :region" if region else "") + """
        ORDER BY score DESC, zone_name
        LIMIT :limit
    """)

    params = {
        "exact_query": query_lower,
        "prefix_pattern": f"{query_lower}%",
        "pattern": pattern,
        "limit": limit
    }
    if district:
        params["district"] = district
    if region:
        params["region"] = region

    result = await db.execute(stmt, params)
    rows = result.fetchall()

    results = []
    for row in rows:
        results.append({
            "zone_code": row[0],
            "zone_name": row[1] or "",
            "district_name": row[2],
            "region_name": row[3],
            "segment_type": row[4] or "mixed",
            "plus_code": row[5],
            "geohash": row[6],
            "coordinates": {"latitude": row[7], "longitude": row[8]} if row[7] else None,
            "relevance_score": row[9] / 100.0,
            "match_source": row[10]
        })

    search_time = (time.time() - start_time) * 1000

    return {
        "query": q,
        "results": results,
        "total_count": len(results),
        "search_time_ms": round(search_time, 2),
        "search_type": "metadata"
    }


# ============== Geohash Endpoints ==============

@router.get("/geohash/encode")
async def encode_geohash(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    precision: int = Query(9, ge=1, le=12)
):
    """
    Encode coordinates to geohash.

    Precision levels:
    - 4: ~39km (regional)
    - 5: ~5km (district)
    - 6: ~1.2km (ward)
    - 7: ~150m (zone)
    - 8: ~38m (block)
    - 9: ~5m (address)
    """
    geohash = gh.encode(lat, lng, precision)
    bounds = gh.bounding_box(geohash)
    neighbors = gh.neighbors(geohash)

    return GeohashInfo(
        geohash=geohash,
        precision=precision,
        center_lat=bounds['center_lat'],
        center_lng=bounds['center_lng'],
        bounds=bounds,
        neighbors=neighbors,
        region=gh.get_region_from_geohash(geohash)
    )


@router.get("/geohash/decode")
async def decode_geohash(geohash: str = Query(..., min_length=1, max_length=12)):
    """Decode geohash to coordinates and bounds."""
    center = gh.decode_center(geohash)
    bounds = gh.bounding_box(geohash)

    return {
        "geohash": geohash,
        "precision": len(geohash),
        "center": {"latitude": center[0], "longitude": center[1]},
        "bounds": bounds,
        "region": gh.get_region_from_geohash(geohash)
    }


@router.get("/geohash/nearby")
async def nearby_by_geohash(
    geohash: str = Query(..., min_length=4, max_length=12),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Find zones near a geohash using spatial index.

    This is faster than coordinate-based queries for repeated searches.
    """
    # Get all neighboring geohashes
    search_hashes = gh.expand(geohash)

    # Use geohash prefix matching for efficient search
    prefix = geohash[:4]  # Use first 4 chars for broad match

    stmt = text("""
        SELECT zone_code, zone_name, district_name, region_name,
               segment_type, plus_code, geohash, center_lat, center_lng
        FROM postal_zones
        WHERE geohash LIKE :prefix
        ORDER BY geohash
        LIMIT :limit
    """)

    result = await db.execute(stmt, {"prefix": f"{prefix}%", "limit": limit})
    rows = result.fetchall()

    center = gh.decode_center(geohash)

    return {
        "query_geohash": geohash,
        "query_center": {"latitude": center[0], "longitude": center[1]},
        "search_prefix": prefix,
        "results": [
            {
                "zone_code": row[0],
                "zone_name": row[1],
                "district_name": row[2],
                "region_name": row[3],
                "segment_type": row[4],
                "plus_code": row[5],
                "geohash": row[6],
                "coordinates": {"latitude": row[7], "longitude": row[8]} if row[7] else None,
                "distance_meters": gh.distance_meters(center[0], center[1], row[7], row[8]) if row[7] else None
            }
            for row in rows
        ],
        "count": len(rows)
    }


# ============== Spatial Validation Endpoints ==============

@router.post("/validate/address", response_model=ValidationResponse)
async def validate_address_point(
    request: ValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate an address point against spatial rules.

    Checks:
    1. Within Sierra Leone bounds
    2. On land (not water)
    3. Inside a postal zone
    4. Geohash consistency
    """
    is_valid, results = await validate_address(
        db,
        request.latitude,
        request.longitude,
        request.zone_code
    )

    # Generate geohash
    geohash = gh.encode(request.latitude, request.longitude, 9)

    # Get suggested zone if not valid
    suggested_zone = None
    if not is_valid:
        validator = SpatialValidator(db)
        suggested_zone = await validator.find_nearest_zone(
            request.latitude,
            request.longitude
        )

    return ValidationResponse(
        is_valid=is_valid,
        latitude=request.latitude,
        longitude=request.longitude,
        geohash=geohash,
        results=[
            {
                "type": r.validation_type.value,
                "status": r.status.value,
                "message": r.message,
                "details": r.details
            }
            for r in results
        ],
        suggested_zone=suggested_zone
    )


@router.get("/validate/zone/{zone_code}")
async def validate_zone(
    zone_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a zone's geometry against spatial rules.

    Checks:
    1. Geometry is valid
    2. No overlap with other zones
    3. Ward boundary crossing (warning)
    """
    # Get zone geometry
    stmt = select(PostalZone).where(PostalZone.zone_code == zone_code)
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if not zone.geometry:
        return {
            "zone_code": zone_code,
            "is_valid": False,
            "message": "Zone has no geometry defined",
            "results": []
        }

    # Get WKT for validation
    stmt = text("SELECT ST_AsText(geometry) FROM postal_zones WHERE zone_code = :code")
    result = await db.execute(stmt, {"code": zone_code})
    wkt = result.scalar()

    validator = SpatialValidator(db)
    results = await validator.validate_zone_geometry(zone_code, wkt)

    is_valid = not any(r.status == ValidationStatus.FAILED for r in results)

    return {
        "zone_code": zone_code,
        "zone_name": zone.zone_name,
        "is_valid": is_valid,
        "results": [
            {
                "type": r.validation_type.value,
                "status": r.status.value,
                "message": r.message,
                "details": r.details
            }
            for r in results
        ]
    }


# ============== Coverage Analysis ==============

@router.get("/coverage/gaps")
async def find_coverage_gaps(
    district: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Find areas with missing zone coverage.

    Useful for identifying where new zones need to be created.
    """
    validator = SpatialValidator(db)
    gaps = await validator.detect_coverage_gaps(district)

    return {
        "district": district,
        "gaps_found": len(gaps),
        "gaps": gaps[:50]  # Limit to 50 for performance
    }


@router.get("/coverage/stats")
async def coverage_statistics(
    db: AsyncSession = Depends(get_db)
):
    """Get spatial coverage statistics."""
    # Zone count by validation status
    stmt = text("""
        SELECT validation_status, COUNT(*) as count
        FROM postal_zones
        GROUP BY validation_status
    """)
    result = await db.execute(stmt)
    status_counts = {row[0] or 'pending': row[1] for row in result.fetchall()}

    # Zones with geometry
    stmt = text("SELECT COUNT(*) FROM postal_zones WHERE geometry IS NOT NULL")
    result = await db.execute(stmt)
    with_geometry = result.scalar()

    # Zones with geohash
    stmt = text("SELECT COUNT(*) FROM postal_zones WHERE geohash IS NOT NULL")
    result = await db.execute(stmt)
    with_geohash = result.scalar()

    # Zones with metadata
    stmt = text("""
        SELECT COUNT(*) FROM postal_zones
        WHERE alternate_names IS NOT NULL
           OR landmarks IS NOT NULL
           OR search_text IS NOT NULL
    """)
    result = await db.execute(stmt)
    with_metadata = result.scalar()

    # Total zones
    stmt = text("SELECT COUNT(*) FROM postal_zones")
    result = await db.execute(stmt)
    total = result.scalar()

    return {
        "total_zones": total,
        "with_geometry": with_geometry,
        "with_geohash": with_geohash,
        "with_metadata": with_metadata,
        "validation_status": status_counts,
        "coverage_percentage": round((with_geometry / total * 100) if total > 0 else 0, 1)
    }


# ============== Hierarchy Navigation ==============

@router.get("/hierarchy")
async def get_spatial_hierarchy(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    geohash: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the full spatial hierarchy for a location.

    Returns: Region → District → Ward → Zone → Block
    """
    if geohash:
        lat, lng = gh.decode_center(geohash)
    elif lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Provide lat/lng or geohash")

    # Generate geohash if not provided
    if not geohash:
        geohash = gh.encode(lat, lng, 9)

    # Find containing zone
    stmt = text("""
        SELECT zone_code, zone_name, district_code, district_name,
               region_code, region_name, ward_id, segment_type, plus_code
        FROM postal_zones
        WHERE geometry IS NOT NULL
        AND ST_Contains(geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        LIMIT 1
    """)

    result = await db.execute(stmt, {"lat": lat, "lng": lng})
    row = result.fetchone()

    if not row:
        # Find nearest zone
        stmt = text("""
            SELECT zone_code, zone_name, district_code, district_name,
                   region_code, region_name, ward_id, segment_type, plus_code,
                   ST_Distance(
                       geometry::geography,
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                   ) as distance
            FROM postal_zones
            WHERE geometry IS NOT NULL
            ORDER BY geometry <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
            LIMIT 1
        """)
        result = await db.execute(stmt, {"lat": lat, "lng": lng})
        row = result.fetchone()

        if not row:
            return {
                "location": {"latitude": lat, "longitude": lng, "geohash": geohash},
                "hierarchy": None,
                "message": "No zone found for this location"
            }

        return {
            "location": {"latitude": lat, "longitude": lng, "geohash": geohash},
            "hierarchy": {
                "region": {"code": row[4], "name": row[5]},
                "district": {"code": row[2], "name": row[3]},
                "ward": {"id": row[6]} if row[6] else None,
                "zone": {
                    "code": row[0],
                    "name": row[1],
                    "type": row[7],
                    "plus_code": row[8]
                }
            },
            "in_zone": False,
            "distance_to_zone_meters": row[9] if len(row) > 9 else None
        }

    return {
        "location": {"latitude": lat, "longitude": lng, "geohash": geohash},
        "hierarchy": {
            "region": {"code": row[4], "name": row[5]},
            "district": {"code": row[2], "name": row[3]},
            "ward": {"id": row[6]} if row[6] else None,
            "zone": {
                "code": row[0],
                "name": row[1],
                "type": row[7],
                "plus_code": row[8]
            }
        },
        "in_zone": True
    }
