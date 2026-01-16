"""
Geocoding and reverse geocoding service.

Handles conversion between:
- Coordinates -> Address (reverse geocoding)
- Address text -> Coordinates (forward geocoding via search)
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_SetSRID, ST_MakePoint

from app.models.address import Address
from app.models.postal_zone import PostalZone
from app.config import get_settings

settings = get_settings()


class GeocoderService:
    """Service for geocoding and reverse geocoding operations."""

    @classmethod
    def validate_coordinates(cls, latitude: float, longitude: float) -> bool:
        """
        Validate that coordinates are within Sierra Leone bounds.

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees

        Returns:
            True if coordinates are valid and within bounds
        """
        bounds = settings.sl_bounds
        return (
            bounds["min_lat"] <= latitude <= bounds["max_lat"] and
            bounds["min_lon"] <= longitude <= bounds["max_lon"]
        )

    @classmethod
    async def reverse_geocode(
        cls,
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_m: float = 50.0,
        limit: int = 5
    ) -> dict:
        """
        Find addresses near a coordinate point.

        Args:
            db: Database session
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees
            radius_m: Search radius in meters
            limit: Maximum number of results

        Returns:
            Dictionary with exact match (if any) and nearby addresses
        """
        if not cls.validate_coordinates(latitude, longitude):
            return {
                "error": "Coordinates outside Sierra Leone bounds",
                "exact_match": None,
                "nearest_addresses": [],
                "zone": None
            }

        # Create point geometry
        point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

        # Find addresses within radius, ordered by distance
        stmt = (
            select(
                Address,
                func.ST_Distance(
                    Address.location,
                    point,
                    True  # Use spheroid for accurate meters
                ).label("distance_m")
            )
            .where(
                func.ST_DWithin(
                    Address.location,
                    point,
                    radius_m,
                    True
                )
            )
            .order_by("distance_m")
            .limit(limit)
        )

        result = await db.execute(stmt)
        rows = result.all()

        # Find containing zone
        zone_stmt = (
            select(PostalZone)
            .where(
                func.ST_Contains(PostalZone.geometry, point)
            )
            .limit(1)
        )
        zone_result = await db.execute(zone_stmt)
        zone = zone_result.scalar_one_or_none()

        # Build response
        exact_match = None
        nearest_addresses = []

        for address, distance in rows:
            addr_data = {
                "pda_id": address.pda_id,
                "postal_code": address.zone_code,
                "display_address": address.display_address,
                "distance_m": round(distance, 1),
                "latitude": address.latitude,
                "longitude": address.longitude,
                "confidence_score": address.confidence_score
            }

            if distance <= 5:  # Within 5 meters = exact match
                exact_match = addr_data
            else:
                nearest_addresses.append(addr_data)

        return {
            "exact_match": exact_match,
            "nearest_addresses": nearest_addresses,
            "zone": {
                "postal_code": zone.zone_code,
                "zone_name": zone.zone_name,
                "district": zone.district_name,
                "region": zone.region_name
            } if zone else None
        }

    @classmethod
    async def find_zone_for_point(
        cls,
        db: AsyncSession,
        latitude: float,
        longitude: float
    ) -> Optional[PostalZone]:
        """
        Find the postal zone containing a point.

        First tries to find by geometry containment, then falls back
        to finding the nearest zone by center point.

        Args:
            db: Database session
            latitude: Latitude
            longitude: Longitude

        Returns:
            PostalZone if found, None otherwise
        """
        if not cls.validate_coordinates(latitude, longitude):
            return None

        point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

        # First try: Find zone whose geometry contains the point
        stmt = (
            select(PostalZone)
            .where(PostalZone.geometry.isnot(None))
            .where(func.ST_Contains(PostalZone.geometry, point))
            .limit(1)
        )

        result = await db.execute(stmt)
        zone = result.scalar_one_or_none()

        if zone:
            return zone

        # Fallback: Find nearest zone by center point (within 2km)
        # This works for zones without geometry
        from sqlalchemy import cast, Float
        from math import radians, cos, sin, sqrt, atan2

        # Simple distance calculation using center_lat/center_lng
        # Using Haversine approximation via SQL
        lat_rad = func.radians(latitude)
        lng_rad = func.radians(longitude)

        zone_lat_rad = func.radians(cast(PostalZone.center_lat, Float))
        zone_lng_rad = func.radians(cast(PostalZone.center_lng, Float))

        # Haversine formula components
        dlat = zone_lat_rad - lat_rad
        dlng = zone_lng_rad - lng_rad

        a = func.power(func.sin(dlat / 2), 2) + \
            func.cos(lat_rad) * func.cos(zone_lat_rad) * \
            func.power(func.sin(dlng / 2), 2)

        # Distance in meters (Earth radius = 6371000m)
        distance = 2 * 6371000 * func.asin(func.sqrt(a))

        stmt = (
            select(PostalZone)
            .where(PostalZone.center_lat.isnot(None))
            .where(PostalZone.center_lng.isnot(None))
            .order_by(distance)
            .limit(1)
        )

        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    def calculate_bearing(
        cls,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> str:
        """
        Calculate compass bearing from point 1 to point 2.

        Returns:
            Compass direction (N, NE, E, SE, S, SW, W, NW)
        """
        import math

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        lon_diff = math.radians(lon2 - lon1)

        x = math.sin(lon_diff) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - \
            math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(lon_diff)

        bearing = math.degrees(math.atan2(x, y))
        bearing = (bearing + 360) % 360

        # Convert to compass direction
        directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        index = round(bearing / 45) % 8
        return directions[index]
