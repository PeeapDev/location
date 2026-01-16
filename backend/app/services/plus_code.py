"""
Plus Code (Open Location Code) service.

Handles encoding, decoding, and validation of Plus Codes.
Uses the openlocationcode library (Google's open-source implementation).

Plus Codes are a universal location identifier that can be derived
algorithmically from coordinates without any API calls.

Format examples:
- Full code: 6WQPVX22+5WX (works globally)
- Short code: VX22+5WX (needs locality context like "Freetown")
"""

import re
from typing import Optional, Tuple, Dict
from openlocationcode import openlocationcode as olc


class PlusCodeService:
    """Service for Plus Code operations."""

    # Plus Code character set (excludes 0, 1, A, E, I, L, O, U to avoid confusion)
    VALID_CHARS = "23456789CFGHJMPQRVWX"

    # Precision levels and their approximate area coverage
    PRECISION_LEVELS = {
        10: "~14m x 14m area",
        11: "~3m x 3m area",
        12: "~1m x 1m area"
    }

    # Default reference point for Sierra Leone (Freetown center)
    DEFAULT_REF_LAT = 8.4657
    DEFAULT_REF_LON = -13.2317

    @classmethod
    def encode(
        cls,
        latitude: float,
        longitude: float,
        code_length: int = 11
    ) -> str:
        """
        Encode coordinates to a Plus Code.

        Args:
            latitude: Latitude in decimal degrees (-90 to 90)
            longitude: Longitude in decimal degrees (-180 to 180)
            code_length: Code length (10=~14m, 11=~3m, 12=~1m precision)

        Returns:
            Full Plus Code string (e.g., "6WQPVX22+5WX")

        Raises:
            ValueError: If coordinates are invalid or code_length not in [10,11,12]
        """
        if not (-90 <= latitude <= 90):
            raise ValueError(f"Invalid latitude: {latitude}. Must be between -90 and 90.")
        if not (-180 <= longitude <= 180):
            raise ValueError(f"Invalid longitude: {longitude}. Must be between -180 and 180.")
        if code_length not in (10, 11, 12):
            raise ValueError(f"Invalid code length: {code_length}. Use 10, 11, or 12.")

        return olc.encode(latitude, longitude, code_length)

    @classmethod
    def decode(cls, plus_code: str) -> Dict:
        """
        Decode a Plus Code to coordinates.

        Args:
            plus_code: Full Plus Code string (e.g., "6WQPVX22+5WX")

        Returns:
            Dictionary with:
                - latitude: Center latitude
                - longitude: Center longitude
                - latitude_lo: South boundary
                - latitude_hi: North boundary
                - longitude_lo: West boundary
                - longitude_hi: East boundary
                - code_length: Number of significant characters

        Raises:
            ValueError: If Plus Code is invalid
        """
        if not cls.is_valid(plus_code):
            raise ValueError(f"Invalid Plus Code: {plus_code}")

        decoded = olc.decode(plus_code)

        return {
            "latitude": decoded.latitudeCenter,
            "longitude": decoded.longitudeCenter,
            "latitude_lo": decoded.latitudeLo,
            "latitude_hi": decoded.latitudeHi,
            "longitude_lo": decoded.longitudeLo,
            "longitude_hi": decoded.longitudeHi,
            "code_length": len(plus_code.replace("+", ""))
        }

    @classmethod
    def is_valid(cls, plus_code: str) -> bool:
        """
        Validate a Plus Code format.

        Args:
            plus_code: Plus Code string to validate

        Returns:
            True if valid (full or short), False otherwise
        """
        if not plus_code:
            return False
        return olc.isValid(plus_code.upper().strip())

    @classmethod
    def is_full(cls, plus_code: str) -> bool:
        """
        Check if Plus Code is a full code (not short).

        A full code can be used globally without any reference location.

        Args:
            plus_code: Plus Code to check

        Returns:
            True if full code, False if short or invalid
        """
        if not plus_code:
            return False
        return olc.isFull(plus_code.upper().strip())

    @classmethod
    def is_short(cls, plus_code: str) -> bool:
        """
        Check if Plus Code is a short code (needs locality context).

        A short code needs a reference location to recover the full code.

        Args:
            plus_code: Plus Code to check

        Returns:
            True if short code, False otherwise
        """
        if not plus_code:
            return False
        return olc.isShort(plus_code.upper().strip())

    @classmethod
    def shorten(
        cls,
        plus_code: str,
        reference_latitude: float,
        reference_longitude: float
    ) -> str:
        """
        Shorten a Plus Code relative to a reference point.

        The reference point is typically the zone center or city center.
        The shortened code can only be recovered with the same reference.

        Args:
            plus_code: Full Plus Code to shorten
            reference_latitude: Reference point latitude
            reference_longitude: Reference point longitude

        Returns:
            Shortened Plus Code (e.g., "VX22+5WX")

        Raises:
            ValueError: If plus_code is not a full code
        """
        normalized = plus_code.upper().strip()
        if not cls.is_full(normalized):
            raise ValueError(f"Cannot shorten non-full code: {plus_code}")

        return olc.shorten(normalized, reference_latitude, reference_longitude)

    @classmethod
    def recover_nearest(
        cls,
        short_code: str,
        reference_latitude: float,
        reference_longitude: float
    ) -> str:
        """
        Recover full Plus Code from short code using reference location.

        Args:
            short_code: Short Plus Code (e.g., "VX22+5WX")
            reference_latitude: Reference point latitude
            reference_longitude: Reference point longitude

        Returns:
            Full Plus Code (e.g., "6WQPVX22+5WX")
        """
        normalized = short_code.upper().strip()
        if cls.is_full(normalized):
            return normalized

        return olc.recoverNearest(normalized, reference_latitude, reference_longitude)

    @classmethod
    def get_precision_meters(cls, code_length: int) -> Tuple[float, float]:
        """
        Get approximate precision in meters for a code length.

        Args:
            code_length: Plus Code length (10, 11, or 12)

        Returns:
            Tuple of (width_meters, height_meters) for the code's area
        """
        precisions = {
            10: (13.9, 13.9),   # ~14m x 14m
            11: (2.8, 3.5),     # ~3m x 3.5m
            12: (0.6, 0.9)      # ~0.6m x 0.9m
        }
        return precisions.get(code_length, (13.9, 13.9))

    @classmethod
    def normalize(cls, plus_code: str) -> str:
        """
        Normalize a Plus Code (uppercase, trimmed).

        Args:
            plus_code: Plus Code to normalize

        Returns:
            Normalized Plus Code
        """
        if not plus_code:
            return ""
        return plus_code.upper().strip()

    @classmethod
    def format_for_display(
        cls,
        plus_code: str,
        locality_name: Optional[str] = None
    ) -> str:
        """
        Format Plus Code for human-readable display.

        Args:
            plus_code: Plus Code (full or short)
            locality_name: Optional locality name for context (e.g., "Freetown")

        Returns:
            Formatted string (e.g., "VX22+5WX Freetown" or "6WQPVX22+5WX")
        """
        normalized = cls.normalize(plus_code)

        if locality_name and cls.is_short(normalized):
            return f"{normalized} {locality_name}"

        return normalized

    @classmethod
    def extract_prefix(cls, plus_code: str, chars: int = 4) -> str:
        """
        Extract the first N characters of a Plus Code (before the +).

        Useful for grouping codes by area.

        Args:
            plus_code: Full Plus Code
            chars: Number of characters to extract (2, 4, 6, or 8)

        Returns:
            Plus Code prefix (e.g., "6WQP" from "6WQPVX22+5WX")
        """
        normalized = cls.normalize(plus_code)
        if '+' in normalized:
            before_plus = normalized.split('+')[0]
            return before_plus[:chars]
        return normalized[:chars]

    @classmethod
    def get_area_code(cls, plus_code: str) -> str:
        """
        Get the area code (first 4 characters) representing ~100km x 100km.

        Args:
            plus_code: Full Plus Code

        Returns:
            Area code (e.g., "6WQP" for Sierra Leone)
        """
        return cls.extract_prefix(plus_code, 4)

    @classmethod
    def codes_in_same_area(cls, code1: str, code2: str, precision: int = 4) -> bool:
        """
        Check if two Plus Codes are in the same area.

        Args:
            code1: First Plus Code
            code2: Second Plus Code
            precision: Number of prefix characters to compare (2, 4, 6)

        Returns:
            True if codes share the same prefix
        """
        prefix1 = cls.extract_prefix(code1, precision)
        prefix2 = cls.extract_prefix(code2, precision)
        return prefix1 == prefix2
