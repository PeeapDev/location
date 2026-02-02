"""
Google Geocoding API Service.

Handles:
- Forward geocoding (address to coordinates)
- Reverse geocoding (coordinates to address)
- Address validation and normalization
- Plus Code integration

Environment variables required:
    GOOGLE_MAPS_API_KEY: Your Google Cloud API key with Geocoding API enabled
"""

import os
from typing import Optional, Dict, List, Any
from dataclasses import dataclass

import googlemaps
from googlemaps.exceptions import ApiError

from .plus_code import PlusCodeService


@dataclass
class GeocodingResult:
    """Result from geocoding operation."""
    latitude: float
    longitude: float
    formatted_address: str
    plus_code: str
    plus_code_short: str
    street_name: Optional[str] = None
    street_number: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    country: str = "Sierra Leone"
    place_id: Optional[str] = None
    location_type: Optional[str] = None
    confidence: Optional[str] = None


class GeocodingService:
    """Service for geocoding operations using Google Geocoding API."""

    # Sierra Leone bounding box for biasing results
    SL_BOUNDS = {
        "southwest": {"lat": 6.85, "lng": -13.5},
        "northeast": {"lat": 10.0, "lng": -10.25}
    }

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the geocoding service.

        Args:
            api_key: Google Maps API key. If not provided, reads from environment.
        """
        self.api_key = api_key or os.getenv("GOOGLE_MAPS_API_KEY")
        self._client: Optional[googlemaps.Client] = None

    @property
    def client(self) -> googlemaps.Client:
        """Get or create the Google Maps client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "Google Maps API key not configured. "
                    "Set GOOGLE_MAPS_API_KEY environment variable."
                )
            self._client = googlemaps.Client(key=self.api_key)
        return self._client

    def geocode(
        self,
        address: str,
        region: str = "sl",
        bias_to_sierra_leone: bool = True
    ) -> Optional[GeocodingResult]:
        """
        Convert an address to coordinates (forward geocoding).

        Args:
            address: Address string to geocode
            region: Region code for biasing (default: "sl" for Sierra Leone)
            bias_to_sierra_leone: Whether to bias results to Sierra Leone bounds

        Returns:
            GeocodingResult with coordinates and address details, or None if not found
        """
        try:
            # Add country context if not present
            if "sierra leone" not in address.lower() and "sl" not in address.lower():
                address = f"{address}, Sierra Leone"

            # Geocode with region bias
            results = self.client.geocode(
                address,
                region=region,
                bounds=self.SL_BOUNDS if bias_to_sierra_leone else None
            )

            if not results:
                return None

            result = results[0]
            return self._parse_geocode_result(result)

        except ApiError as e:
            print(f"Geocoding API error: {e}")
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None

    def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[GeocodingResult]:
        """
        Convert coordinates to an address (reverse geocoding).

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees

        Returns:
            GeocodingResult with address details, or None if not found
        """
        try:
            results = self.client.reverse_geocode((latitude, longitude))

            if not results:
                return None

            # Find the most specific result (usually first)
            result = results[0]
            return self._parse_geocode_result(result)

        except ApiError as e:
            print(f"Reverse geocoding API error: {e}")
            return None
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return None

    def validate_address(
        self,
        address: str
    ) -> Dict[str, Any]:
        """
        Validate an address and return confidence information.

        Args:
            address: Address string to validate

        Returns:
            Dictionary with validation status and details
        """
        result = self.geocode(address)

        if not result:
            return {
                "valid": False,
                "reason": "Address not found",
                "suggestions": []
            }

        # Check if result is within Sierra Leone
        if not self._is_in_sierra_leone(result.latitude, result.longitude):
            return {
                "valid": False,
                "reason": "Address is outside Sierra Leone",
                "result": result
            }

        # Determine confidence based on location_type
        confidence_map = {
            "ROOFTOP": "high",
            "RANGE_INTERPOLATED": "medium",
            "GEOMETRIC_CENTER": "medium",
            "APPROXIMATE": "low"
        }

        return {
            "valid": True,
            "confidence": confidence_map.get(result.location_type, "unknown"),
            "result": result,
            "formatted_address": result.formatted_address,
            "plus_code": result.plus_code,
            "coordinates": {
                "latitude": result.latitude,
                "longitude": result.longitude
            }
        }

    def batch_geocode(
        self,
        addresses: List[str],
        delay: float = 0.1
    ) -> List[Optional[GeocodingResult]]:
        """
        Geocode multiple addresses.

        Args:
            addresses: List of address strings
            delay: Delay between requests in seconds (for rate limiting)

        Returns:
            List of GeocodingResult objects (None for failed geocodes)
        """
        import time
        results = []

        for address in addresses:
            result = self.geocode(address)
            results.append(result)
            time.sleep(delay)

        return results

    def get_address_components(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """
        Get detailed address components for coordinates.

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees

        Returns:
            Dictionary with all address components
        """
        try:
            results = self.client.reverse_geocode((latitude, longitude))

            if not results:
                return {}

            result = results[0]
            components = {}

            for component in result.get("address_components", []):
                types = component.get("types", [])
                name = component.get("long_name")

                if "street_number" in types:
                    components["street_number"] = name
                elif "route" in types:
                    components["street_name"] = name
                elif "neighborhood" in types:
                    components["neighborhood"] = name
                elif "sublocality" in types:
                    components["sublocality"] = name
                elif "locality" in types:
                    components["city"] = name
                elif "administrative_area_level_2" in types:
                    components["district"] = name
                elif "administrative_area_level_1" in types:
                    components["region"] = name
                elif "country" in types:
                    components["country"] = name
                elif "postal_code" in types:
                    components["postal_code"] = name

            # Add Plus Code
            plus_code = PlusCodeService.encode(latitude, longitude)
            components["plus_code"] = plus_code
            components["plus_code_short"] = plus_code[-6:] if plus_code else None

            return components

        except Exception as e:
            print(f"Error getting address components: {e}")
            return {}

    def _parse_geocode_result(self, result: Dict[str, Any]) -> GeocodingResult:
        """Parse a Google geocoding result into our format."""
        geometry = result.get("geometry", {})
        location = geometry.get("location", {})
        lat = location.get("lat", 0)
        lng = location.get("lng", 0)

        # Extract address components
        components = {}
        for component in result.get("address_components", []):
            types = component.get("types", [])
            name = component.get("long_name")

            if "street_number" in types:
                components["street_number"] = name
            elif "route" in types:
                components["street_name"] = name
            elif "neighborhood" in types:
                components["neighborhood"] = name
            elif "locality" in types:
                components["city"] = name
            elif "administrative_area_level_2" in types:
                components["district"] = name

        # Generate Plus Code
        plus_code = PlusCodeService.encode(lat, lng)

        return GeocodingResult(
            latitude=lat,
            longitude=lng,
            formatted_address=result.get("formatted_address", ""),
            plus_code=plus_code,
            plus_code_short=plus_code[-6:] if plus_code else "",
            street_name=components.get("street_name"),
            street_number=components.get("street_number"),
            neighborhood=components.get("neighborhood"),
            city=components.get("city"),
            district=components.get("district"),
            place_id=result.get("place_id"),
            location_type=geometry.get("location_type")
        )

    def _is_in_sierra_leone(self, lat: float, lng: float) -> bool:
        """Check if coordinates are within Sierra Leone bounds."""
        return (
            self.SL_BOUNDS["southwest"]["lat"] <= lat <= self.SL_BOUNDS["northeast"]["lat"] and
            self.SL_BOUNDS["southwest"]["lng"] <= lng <= self.SL_BOUNDS["northeast"]["lng"]
        )


# Singleton instance
_geocoding_service: Optional[GeocodingService] = None


def get_geocoding_service() -> GeocodingService:
    """Get or create the singleton geocoding service instance."""
    global _geocoding_service
    if _geocoding_service is None:
        _geocoding_service = GeocodingService()
    return _geocoding_service
