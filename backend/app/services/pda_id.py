"""
PDA-ID (Permanent Digital Address Identifier) generation service.

Format: SL-XXXX-YYY-NNNNNN-C
- SL: Country prefix (Sierra Leone)
- XXXX: Primary zone code (4 digits)
- YYY: Delivery segment (3 digits)
- NNNNNN: Sequential number within zone (6 digits, 000001-999999)
- C: Luhn check digit
"""

import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.postal_zone import PostalZone
from app.utils.luhn import calculate_luhn_check_digit, validate_pda_id_check_digit


class PDAIDService:
    """Service for generating and validating PDA-IDs."""

    # PDA-ID format regex
    PDA_ID_PATTERN = re.compile(r"^SL-\d{4}-\d{3}-\d{6}-\d$")

    # Country prefix
    COUNTRY_PREFIX = "SL"

    # Maximum addresses per zone segment
    MAX_SEQUENCE = 999999

    @classmethod
    def validate_format(cls, pda_id: str) -> bool:
        """
        Validate PDA-ID format (does not check if it exists).

        Args:
            pda_id: PDA-ID string to validate

        Returns:
            True if format is valid
        """
        if not cls.PDA_ID_PATTERN.match(pda_id):
            return False
        return validate_pda_id_check_digit(pda_id)

    @classmethod
    def parse(cls, pda_id: str) -> dict:
        """
        Parse a PDA-ID into its components.

        Args:
            pda_id: Valid PDA-ID string

        Returns:
            Dictionary with parsed components

        Raises:
            ValueError: If PDA-ID format is invalid
        """
        if not cls.validate_format(pda_id):
            raise ValueError(f"Invalid PDA-ID format: {pda_id}")

        parts = pda_id.split("-")
        return {
            "country": parts[0],
            "primary_code": parts[1],
            "segment": parts[2],
            "zone_code": f"{parts[1]}-{parts[2]}",
            "sequence": int(parts[3]),
            "check_digit": int(parts[4]),
            "full_id": pda_id
        }

    @classmethod
    def generate(cls, zone_code: str, sequence: int) -> str:
        """
        Generate a PDA-ID for a zone and sequence number.

        Args:
            zone_code: Postal zone code (e.g., "2310-047")
            sequence: Sequential number (1-999999)

        Returns:
            Full PDA-ID with check digit

        Raises:
            ValueError: If parameters are invalid
        """
        # Validate zone code format
        if not re.match(r"^\d{4}-\d{3}$", zone_code):
            raise ValueError(f"Invalid zone code format: {zone_code}")

        # Validate sequence
        if not 1 <= sequence <= cls.MAX_SEQUENCE:
            raise ValueError(f"Sequence must be between 1 and {cls.MAX_SEQUENCE}")

        # Parse zone code
        primary_code, segment = zone_code.split("-")

        # Format sequence with leading zeros
        sequence_str = str(sequence).zfill(6)

        # Calculate check digit
        numeric_part = primary_code + segment + sequence_str
        check_digit = calculate_luhn_check_digit(numeric_part)

        # Assemble PDA-ID
        return f"{cls.COUNTRY_PREFIX}-{primary_code}-{segment}-{sequence_str}-{check_digit}"

    @classmethod
    async def generate_next(cls, db: AsyncSession, zone_code: str) -> str:
        """
        Generate the next PDA-ID for a zone (thread-safe).

        Uses database-level locking to ensure unique sequential IDs.

        Args:
            db: Database session
            zone_code: Postal zone code

        Returns:
            New unique PDA-ID

        Raises:
            ValueError: If zone doesn't exist or is at capacity
        """
        # Get zone and increment sequence atomically
        stmt = (
            update(PostalZone)
            .where(PostalZone.zone_code == zone_code)
            .values(address_sequence=PostalZone.address_sequence + 1)
            .returning(PostalZone.address_sequence)
        )

        result = await db.execute(stmt)
        row = result.fetchone()

        if row is None:
            raise ValueError(f"Postal zone not found: {zone_code}")

        sequence = row[0]

        if sequence > cls.MAX_SEQUENCE:
            raise ValueError(f"Zone {zone_code} has reached maximum capacity")

        return cls.generate(zone_code, sequence)

    @classmethod
    def extract_zone_code(cls, pda_id: str) -> str:
        """
        Extract the zone code from a PDA-ID.

        Args:
            pda_id: Valid PDA-ID string

        Returns:
            Zone code (e.g., "2310-047")
        """
        parsed = cls.parse(pda_id)
        return parsed["zone_code"]

    @classmethod
    def get_region_from_zone(cls, zone_code: str) -> int:
        """
        Extract region code from zone code.

        Args:
            zone_code: Postal zone code

        Returns:
            Region code (1-5)
        """
        return int(zone_code[0])

    @classmethod
    def get_district_from_zone(cls, zone_code: str) -> int:
        """
        Extract district code from zone code.

        Args:
            zone_code: Postal zone code

        Returns:
            District code (0-9)
        """
        return int(zone_code[1])
