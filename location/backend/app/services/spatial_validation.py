"""
Spatial Validation Service for Sierra Leone Postal System.

Enforces spatial rules:
1. Address point must be on land (not water/ocean)
2. Address must be inside a zone
3. Zones cannot overlap
4. Zone crossing ward boundary → warning

Provides:
- Real-time validation for new addresses/zones
- Batch validation for existing data
- Anomaly detection
"""

from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_
from geoalchemy2.functions import (
    ST_Contains, ST_Intersects, ST_Within, ST_Overlaps,
    ST_Distance, ST_Area, ST_IsValid, ST_MakeValid,
    ST_Crosses, ST_Touches, ST_Buffer
)

from app.services import geohash as gh


class ValidationStatus(Enum):
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


class ValidationType(Enum):
    LAND_CHECK = "land_check"
    ZONE_CONTAINMENT = "zone_containment"
    ZONE_OVERLAP = "zone_overlap"
    BOUNDARY_CROSSING = "boundary_crossing"
    GEOMETRY_VALID = "geometry_valid"
    COORDINATE_BOUNDS = "coordinate_bounds"
    GEOHASH_CONSISTENCY = "geohash_consistency"


@dataclass
class ValidationResult:
    """Result of a spatial validation check."""
    validation_type: ValidationType
    status: ValidationStatus
    message: str
    details: Optional[Dict[str, Any]] = None
    entity_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SpatialValidator:
    """
    Spatial validation service.

    Validates addresses and zones against spatial rules.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def validate_address_point(
        self,
        latitude: float,
        longitude: float,
        zone_code: Optional[str] = None
    ) -> List[ValidationResult]:
        """
        Validate an address point against all spatial rules.

        Returns list of validation results (one per rule).
        """
        results = []

        # 1. Check if within Sierra Leone bounds
        bounds_result = self._check_bounds(latitude, longitude)
        results.append(bounds_result)
        if bounds_result.status == ValidationStatus.FAILED:
            return results  # No point checking further

        # 2. Check if on land (not water)
        land_result = await self._check_on_land(latitude, longitude)
        results.append(land_result)

        # 3. Check if inside a zone
        zone_result = await self._check_zone_containment(latitude, longitude, zone_code)
        results.append(zone_result)

        # 4. Check geohash consistency
        geohash = gh.encode(latitude, longitude, 9)
        geohash_result = self._check_geohash_consistency(latitude, longitude, geohash)
        results.append(geohash_result)

        return results

    async def validate_zone_geometry(
        self,
        zone_code: str,
        geometry_wkt: str
    ) -> List[ValidationResult]:
        """
        Validate a zone geometry against spatial rules.

        Args:
            zone_code: Zone identifier
            geometry_wkt: Well-Known Text representation of geometry

        Returns:
            List of validation results
        """
        results = []

        # 1. Check geometry is valid
        valid_result = await self._check_geometry_valid(zone_code, geometry_wkt)
        results.append(valid_result)

        # 2. Check for overlaps with other zones
        overlap_result = await self._check_zone_overlaps(zone_code, geometry_wkt)
        results.append(overlap_result)

        # 3. Check ward boundary crossing
        boundary_result = await self._check_ward_boundary_crossing(zone_code, geometry_wkt)
        results.append(boundary_result)

        return results

    def _check_bounds(self, latitude: float, longitude: float) -> ValidationResult:
        """Check if coordinates are within Sierra Leone bounds."""
        if not gh.is_in_sierra_leone(latitude, longitude):
            return ValidationResult(
                validation_type=ValidationType.COORDINATE_BOUNDS,
                status=ValidationStatus.FAILED,
                message="Coordinates are outside Sierra Leone",
                details={
                    "latitude": latitude,
                    "longitude": longitude,
                    "bounds": gh.SIERRA_LEONE_BOUNDS
                },
                latitude=latitude,
                longitude=longitude
            )

        return ValidationResult(
            validation_type=ValidationType.COORDINATE_BOUNDS,
            status=ValidationStatus.PASSED,
            message="Coordinates within Sierra Leone bounds",
            latitude=latitude,
            longitude=longitude
        )

    async def _check_on_land(self, latitude: float, longitude: float) -> ValidationResult:
        """Check if point is on land (not water)."""
        try:
            # Check against land boundary table
            stmt = text("""
                SELECT EXISTS(
                    SELECT 1 FROM land_boundaries
                    WHERE ST_Contains(
                        geometry,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                    )
                )
            """)

            result = await self.db.execute(stmt, {"lat": latitude, "lng": longitude})
            is_on_land = result.scalar()

            if is_on_land is None:
                # No land boundary data - assume valid but warn
                return ValidationResult(
                    validation_type=ValidationType.LAND_CHECK,
                    status=ValidationStatus.WARNING,
                    message="Land boundary data not available for validation",
                    latitude=latitude,
                    longitude=longitude
                )

            if not is_on_land:
                return ValidationResult(
                    validation_type=ValidationType.LAND_CHECK,
                    status=ValidationStatus.FAILED,
                    message="Address point is not on land (possibly water/ocean)",
                    details={"latitude": latitude, "longitude": longitude},
                    latitude=latitude,
                    longitude=longitude
                )

            return ValidationResult(
                validation_type=ValidationType.LAND_CHECK,
                status=ValidationStatus.PASSED,
                message="Address point is on land",
                latitude=latitude,
                longitude=longitude
            )

        except Exception as e:
            return ValidationResult(
                validation_type=ValidationType.LAND_CHECK,
                status=ValidationStatus.WARNING,
                message=f"Could not verify land boundary: {str(e)}",
                latitude=latitude,
                longitude=longitude
            )

    async def _check_zone_containment(
        self,
        latitude: float,
        longitude: float,
        expected_zone_code: Optional[str] = None
    ) -> ValidationResult:
        """Check if point is inside a zone."""
        try:
            stmt = text("""
                SELECT zone_code, zone_name, district_name
                FROM postal_zones
                WHERE geometry IS NOT NULL
                AND ST_Contains(
                    geometry,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                )
                LIMIT 1
            """)

            result = await self.db.execute(stmt, {"lat": latitude, "lng": longitude})
            row = result.fetchone()

            if row is None:
                return ValidationResult(
                    validation_type=ValidationType.ZONE_CONTAINMENT,
                    status=ValidationStatus.FAILED,
                    message="Address point is not inside any postal zone",
                    details={"latitude": latitude, "longitude": longitude},
                    latitude=latitude,
                    longitude=longitude
                )

            found_zone = row[0]

            if expected_zone_code and found_zone != expected_zone_code:
                return ValidationResult(
                    validation_type=ValidationType.ZONE_CONTAINMENT,
                    status=ValidationStatus.WARNING,
                    message=f"Address is in zone {found_zone}, not expected zone {expected_zone_code}",
                    details={
                        "found_zone": found_zone,
                        "expected_zone": expected_zone_code,
                        "zone_name": row[1],
                        "district": row[2]
                    },
                    latitude=latitude,
                    longitude=longitude
                )

            return ValidationResult(
                validation_type=ValidationType.ZONE_CONTAINMENT,
                status=ValidationStatus.PASSED,
                message=f"Address is inside zone {found_zone}",
                details={
                    "zone_code": found_zone,
                    "zone_name": row[1],
                    "district": row[2]
                },
                latitude=latitude,
                longitude=longitude
            )

        except Exception as e:
            return ValidationResult(
                validation_type=ValidationType.ZONE_CONTAINMENT,
                status=ValidationStatus.WARNING,
                message=f"Could not verify zone containment: {str(e)}",
                latitude=latitude,
                longitude=longitude
            )

    def _check_geohash_consistency(
        self,
        latitude: float,
        longitude: float,
        geohash: str
    ) -> ValidationResult:
        """Verify geohash matches coordinates."""
        # Decode geohash back to coordinates
        decoded_lat, decoded_lng = gh.decode_center(geohash)

        # Check distance - should be very small
        distance = gh.distance_meters(latitude, longitude, decoded_lat, decoded_lng)

        if distance > 10:  # More than 10 meters off
            return ValidationResult(
                validation_type=ValidationType.GEOHASH_CONSISTENCY,
                status=ValidationStatus.WARNING,
                message=f"Geohash center is {distance:.1f}m from coordinates",
                details={
                    "geohash": geohash,
                    "original_coords": {"lat": latitude, "lng": longitude},
                    "decoded_coords": {"lat": decoded_lat, "lng": decoded_lng},
                    "distance_meters": distance
                },
                latitude=latitude,
                longitude=longitude
            )

        return ValidationResult(
            validation_type=ValidationType.GEOHASH_CONSISTENCY,
            status=ValidationStatus.PASSED,
            message="Geohash is consistent with coordinates",
            latitude=latitude,
            longitude=longitude
        )

    async def _check_geometry_valid(
        self,
        zone_code: str,
        geometry_wkt: str
    ) -> ValidationResult:
        """Check if geometry is valid."""
        try:
            stmt = text("""
                SELECT ST_IsValid(ST_GeomFromText(:wkt, 4326))
            """)

            result = await self.db.execute(stmt, {"wkt": geometry_wkt})
            is_valid = result.scalar()

            if not is_valid:
                return ValidationResult(
                    validation_type=ValidationType.GEOMETRY_VALID,
                    status=ValidationStatus.FAILED,
                    message=f"Zone {zone_code} has invalid geometry",
                    entity_id=zone_code
                )

            return ValidationResult(
                validation_type=ValidationType.GEOMETRY_VALID,
                status=ValidationStatus.PASSED,
                message="Zone geometry is valid",
                entity_id=zone_code
            )

        except Exception as e:
            return ValidationResult(
                validation_type=ValidationType.GEOMETRY_VALID,
                status=ValidationStatus.FAILED,
                message=f"Geometry validation error: {str(e)}",
                entity_id=zone_code
            )

    async def _check_zone_overlaps(
        self,
        zone_code: str,
        geometry_wkt: str
    ) -> ValidationResult:
        """Check if zone overlaps with other zones."""
        try:
            stmt = text("""
                SELECT zone_code, zone_name,
                       ST_Area(ST_Intersection(geometry, ST_GeomFromText(:wkt, 4326))::geography) as overlap_area
                FROM postal_zones
                WHERE zone_code != :zone_code
                AND geometry IS NOT NULL
                AND ST_Overlaps(geometry, ST_GeomFromText(:wkt, 4326))
                ORDER BY overlap_area DESC
                LIMIT 5
            """)

            result = await self.db.execute(stmt, {
                "wkt": geometry_wkt,
                "zone_code": zone_code
            })
            overlaps = result.fetchall()

            if overlaps:
                overlap_details = [
                    {"zone_code": r[0], "zone_name": r[1], "overlap_sqm": r[2]}
                    for r in overlaps
                ]
                return ValidationResult(
                    validation_type=ValidationType.ZONE_OVERLAP,
                    status=ValidationStatus.FAILED,
                    message=f"Zone overlaps with {len(overlaps)} other zone(s)",
                    details={"overlapping_zones": overlap_details},
                    entity_id=zone_code
                )

            return ValidationResult(
                validation_type=ValidationType.ZONE_OVERLAP,
                status=ValidationStatus.PASSED,
                message="Zone does not overlap other zones",
                entity_id=zone_code
            )

        except Exception as e:
            return ValidationResult(
                validation_type=ValidationType.ZONE_OVERLAP,
                status=ValidationStatus.WARNING,
                message=f"Could not check zone overlaps: {str(e)}",
                entity_id=zone_code
            )

    async def _check_ward_boundary_crossing(
        self,
        zone_code: str,
        geometry_wkt: str
    ) -> ValidationResult:
        """Check if zone crosses ward boundaries (warning, not error)."""
        try:
            stmt = text("""
                SELECT w.ward_id, w.ward_name
                FROM wards w
                WHERE w.geometry IS NOT NULL
                AND ST_Crosses(w.geometry, ST_GeomFromText(:wkt, 4326))
            """)

            result = await self.db.execute(stmt, {"wkt": geometry_wkt})
            crossed_wards = result.fetchall()

            if crossed_wards:
                ward_details = [
                    {"ward_id": r[0], "ward_name": r[1]}
                    for r in crossed_wards
                ]
                return ValidationResult(
                    validation_type=ValidationType.BOUNDARY_CROSSING,
                    status=ValidationStatus.WARNING,
                    message=f"Zone crosses {len(crossed_wards)} ward boundary(ies)",
                    details={"crossed_wards": ward_details},
                    entity_id=zone_code
                )

            return ValidationResult(
                validation_type=ValidationType.BOUNDARY_CROSSING,
                status=ValidationStatus.PASSED,
                message="Zone does not cross ward boundaries",
                entity_id=zone_code
            )

        except Exception as e:
            # Wards table might not exist yet
            return ValidationResult(
                validation_type=ValidationType.BOUNDARY_CROSSING,
                status=ValidationStatus.WARNING,
                message=f"Ward boundary check unavailable: {str(e)}",
                entity_id=zone_code
            )

    async def find_nearest_zone(
        self,
        latitude: float,
        longitude: float,
        max_distance_meters: float = 5000
    ) -> Optional[Dict[str, Any]]:
        """
        Find the nearest zone to a point.

        Useful for suggesting corrections when a point is outside all zones.
        """
        try:
            stmt = text("""
                SELECT zone_code, zone_name, district_name,
                       ST_Distance(
                           geometry::geography,
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                       ) as distance_meters
                FROM postal_zones
                WHERE geometry IS NOT NULL
                ORDER BY geometry <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                LIMIT 1
            """)

            result = await self.db.execute(stmt, {"lat": latitude, "lng": longitude})
            row = result.fetchone()

            if row and row[3] <= max_distance_meters:
                return {
                    "zone_code": row[0],
                    "zone_name": row[1],
                    "district_name": row[2],
                    "distance_meters": row[3]
                }

            return None

        except Exception:
            return None

    async def detect_coverage_gaps(
        self,
        district_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect areas with missing zone coverage.

        Uses geohash grid to find gaps.
        """
        gaps = []

        try:
            # Get bounding box for district or country
            if district_name:
                stmt = text("""
                    SELECT ST_XMin(ST_Collect(geometry)), ST_YMin(ST_Collect(geometry)),
                           ST_XMax(ST_Collect(geometry)), ST_YMax(ST_Collect(geometry))
                    FROM postal_zones
                    WHERE district_name = :district
                    AND geometry IS NOT NULL
                """)
                result = await self.db.execute(stmt, {"district": district_name})
            else:
                stmt = text("""
                    SELECT ST_XMin(ST_Collect(geometry)), ST_YMin(ST_Collect(geometry)),
                           ST_XMax(ST_Collect(geometry)), ST_YMax(ST_Collect(geometry))
                    FROM postal_zones
                    WHERE geometry IS NOT NULL
                """)
                result = await self.db.execute(stmt)

            bounds = result.fetchone()
            if not bounds or not all(bounds):
                return gaps

            min_lng, min_lat, max_lng, max_lat = bounds

            # Generate geohash grid (precision 6 for ~1km cells)
            precision = 6
            checked = set()

            lat = min_lat
            while lat <= max_lat:
                lng = min_lng
                while lng <= max_lng:
                    hash_val = gh.encode(lat, lng, precision)
                    if hash_val not in checked:
                        checked.add(hash_val)

                        # Check if this cell has zone coverage
                        center_lat, center_lng = gh.decode_center(hash_val)
                        stmt = text("""
                            SELECT COUNT(*) FROM postal_zones
                            WHERE geometry IS NOT NULL
                            AND ST_Intersects(
                                geometry,
                                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                            )
                        """)
                        result = await self.db.execute(stmt, {"lat": center_lat, "lng": center_lng})
                        count = result.scalar()

                        if count == 0:
                            gaps.append({
                                "geohash": hash_val,
                                "center_lat": center_lat,
                                "center_lng": center_lng,
                                "bounds": gh.bounding_box(hash_val)
                            })

                    lng += 0.01  # ~1km step
                lat += 0.01

        except Exception as e:
            print(f"Error detecting coverage gaps: {e}")

        return gaps


async def validate_address(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    zone_code: Optional[str] = None
) -> Tuple[bool, List[ValidationResult]]:
    """
    Convenience function to validate an address.

    Returns:
        Tuple of (is_valid, list_of_results)
    """
    validator = SpatialValidator(db)
    results = await validator.validate_address_point(latitude, longitude, zone_code)

    # Address is valid if no FAILED results
    is_valid = not any(r.status == ValidationStatus.FAILED for r in results)

    return is_valid, results
