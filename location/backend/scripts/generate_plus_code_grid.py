"""
Plus Code Grid Generation Script

Generates addresses from a Plus Code grid for the Freetown metropolitan area,
covering Waterloo to Central Freetown with configurable spacing.

Usage:
    python -m scripts.generate_plus_code_grid --spacing 75 --dry-run
    python -m scripts.generate_plus_code_grid --spacing 75

Coverage Area:
    - Waterloo (SW corner): 8.332°N, -13.062°W
    - Central Freetown (NE corner): 8.466°N, -13.232°W

Zone Assignment:
    - 10xx: Rural areas (latitude < 8.42)
    - 11xx: Urban areas (latitude >= 8.42)
"""

import argparse
import asyncio
import math
import sys
from datetime import datetime
from typing import List, Tuple, Optional

# Add parent directory to path for imports
sys.path.insert(0, '.')

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.address import Address
from app.models.postal_zone import PostalZone
from app.services.plus_code import PlusCodeService
from app.services.pda_id import PDAIDService


# Coverage area boundaries (Waterloo to Central Freetown)
# Note: In Freetown, longitude is negative (West)
BOUNDS = {
    "lat_min": 8.332,   # Waterloo (southern)
    "lat_max": 8.466,   # Central Freetown (northern)
    "lon_min": -13.232, # Central Freetown (western)
    "lon_max": -13.062, # Waterloo (eastern)
}

# Urban/Rural boundary latitude
URBAN_BOUNDARY_LAT = 8.42

# Zone code prefixes
RURAL_PREFIX = "10"  # 10xx zones
URBAN_PREFIX = "11"  # 11xx zones


def meters_to_degrees_lat(meters: float) -> float:
    """Convert meters to degrees latitude (approximately constant everywhere)."""
    # 1 degree latitude ≈ 111,320 meters
    return meters / 111320


def meters_to_degrees_lon(meters: float, latitude: float) -> float:
    """Convert meters to degrees longitude (varies with latitude)."""
    # 1 degree longitude = 111,320 * cos(latitude) meters
    return meters / (111320 * math.cos(math.radians(latitude)))


def generate_grid_points(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    spacing_m: float
) -> List[Tuple[float, float]]:
    """
    Generate a grid of points within the bounding box.

    Args:
        lat_min: Minimum latitude
        lat_max: Maximum latitude
        lon_min: Minimum longitude
        lon_max: Maximum longitude
        spacing_m: Spacing between points in meters

    Returns:
        List of (latitude, longitude) tuples
    """
    points = []

    # Start from the minimum latitude
    current_lat = lat_min

    while current_lat <= lat_max:
        # Calculate longitude step for this latitude
        lon_step = meters_to_degrees_lon(spacing_m, current_lat)
        current_lon = lon_min

        while current_lon <= lon_max:
            points.append((current_lat, current_lon))
            current_lon += lon_step

        # Move to next latitude row
        current_lat += meters_to_degrees_lat(spacing_m)

    return points


def get_zone_assignment(latitude: float) -> str:
    """
    Determine zone prefix based on latitude.

    Args:
        latitude: Point latitude

    Returns:
        Zone prefix (e.g., "10" for rural, "11" for urban)
    """
    if latitude >= URBAN_BOUNDARY_LAT:
        return URBAN_PREFIX
    return RURAL_PREFIX


async def find_or_create_zone(
    db: AsyncSession,
    zone_prefix: str,
    latitude: float,
    longitude: float
) -> Optional[PostalZone]:
    """
    Find existing zone for coordinates or return None.

    In a production system, this would use spatial queries to find
    the correct zone based on geometry. For now, we look for zones
    matching the prefix.
    """
    # Try to find a zone with the prefix
    stmt = select(PostalZone).where(
        PostalZone.primary_code.like(f"{zone_prefix}%")
    ).limit(1)

    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    return zone


async def create_grid_address(
    db: AsyncSession,
    zone: PostalZone,
    latitude: float,
    longitude: float,
    dry_run: bool = False
) -> Optional[str]:
    """
    Create a grid-generated address.

    Args:
        db: Database session
        zone: Postal zone for the address
        latitude: Address latitude
        longitude: Address longitude
        dry_run: If True, don't actually create the address

    Returns:
        PDA-ID of created address, or None if dry run
    """
    # Generate Plus Code
    plus_code = PlusCodeService.encode(latitude, longitude, code_length=11)
    plus_code_short = plus_code[-6:] if plus_code else None
    plus_code_local = PlusCodeService.extract_local_code(plus_code)

    if dry_run:
        return f"[DRY-RUN] Would create: {plus_code} -> {plus_code_local} in {zone.zone_code}"

    # Check if address already exists at this Plus Code
    existing_stmt = select(Address).where(Address.plus_code == plus_code)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        return None  # Skip duplicate

    # Generate PDA-ID
    pda_id = await PDAIDService.generate_next(db, zone.zone_code)

    # Create address
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point

    location = from_shape(Point(longitude, latitude), srid=4326)

    address = Address(
        pda_id=pda_id,
        zone_code=zone.zone_code,
        location=location,
        latitude=latitude,
        longitude=longitude,
        accuracy_m=3.0,  # Plus Code 11-char precision
        plus_code=plus_code,
        plus_code_short=plus_code_short,
        plus_code_local=plus_code_local,
        verification_status="verified",
        verification_method="grid_generated",
        confidence_score=0.9,
        address_type="residential"
    )

    db.add(address)

    return pda_id


async def run_grid_generation(
    spacing_m: float = 75,
    dry_run: bool = False,
    batch_size: int = 100,
    max_points: Optional[int] = None
):
    """
    Run the grid generation process.

    Args:
        spacing_m: Grid spacing in meters
        dry_run: If True, only simulate without creating records
        batch_size: Number of records to commit per batch
        max_points: Maximum points to process (for testing)
    """
    print(f"\n{'='*60}")
    print("Plus Code Grid Generation")
    print(f"{'='*60}")
    print(f"Spacing: {spacing_m}m")
    print(f"Area: Waterloo ({BOUNDS['lat_min']}°N, {BOUNDS['lon_max']}°E) to")
    print(f"      Central Freetown ({BOUNDS['lat_max']}°N, {BOUNDS['lon_min']}°E)")
    print(f"Dry run: {dry_run}")
    print(f"{'='*60}\n")

    # Generate grid points
    print("Generating grid points...")
    points = generate_grid_points(
        BOUNDS["lat_min"],
        BOUNDS["lat_max"],
        BOUNDS["lon_min"],
        BOUNDS["lon_max"],
        spacing_m
    )

    if max_points:
        points = points[:max_points]

    print(f"Generated {len(points)} grid points\n")

    # Process points
    async with AsyncSessionLocal() as db:
        created_count = 0
        skipped_count = 0
        error_count = 0

        # Group points by zone prefix for efficiency
        rural_count = sum(1 for lat, _ in points if lat < URBAN_BOUNDARY_LAT)
        urban_count = len(points) - rural_count

        print(f"Rural points (10xx): {rural_count}")
        print(f"Urban points (11xx): {urban_count}\n")

        # Find zones for each prefix
        zones_cache = {}

        for i, (lat, lon) in enumerate(points):
            try:
                zone_prefix = get_zone_assignment(lat)

                # Get or cache zone
                if zone_prefix not in zones_cache:
                    zone = await find_or_create_zone(db, zone_prefix, lat, lon)
                    if zone:
                        zones_cache[zone_prefix] = zone
                        print(f"Using zone {zone.zone_code} for {zone_prefix}xx addresses")
                    else:
                        print(f"WARNING: No zone found for prefix {zone_prefix}xx")
                        continue

                zone = zones_cache.get(zone_prefix)
                if not zone:
                    skipped_count += 1
                    continue

                # Create address
                result = await create_grid_address(db, zone, lat, lon, dry_run)

                if result:
                    if dry_run:
                        if created_count < 5:  # Show first 5 examples
                            print(f"  {result}")
                    created_count += 1
                else:
                    skipped_count += 1

                # Commit in batches
                if not dry_run and (i + 1) % batch_size == 0:
                    await db.commit()
                    print(f"Progress: {i + 1}/{len(points)} ({created_count} created, {skipped_count} skipped)")

            except Exception as e:
                error_count += 1
                if error_count <= 5:
                    print(f"Error at ({lat}, {lon}): {e}")

        # Final commit
        if not dry_run:
            await db.commit()

        print(f"\n{'='*60}")
        print("Summary")
        print(f"{'='*60}")
        print(f"Total grid points: {len(points)}")
        print(f"Created: {created_count}")
        print(f"Skipped (duplicates): {skipped_count}")
        print(f"Errors: {error_count}")

        if dry_run:
            print("\n[DRY RUN] No records were created. Run without --dry-run to create addresses.")


def main():
    parser = argparse.ArgumentParser(
        description="Generate addresses from Plus Code grid for Freetown area"
    )
    parser.add_argument(
        "--spacing",
        type=float,
        default=75,
        help="Grid spacing in meters (default: 75)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate without creating records"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Records per commit batch (default: 100)"
    )
    parser.add_argument(
        "--max-points",
        type=int,
        default=None,
        help="Maximum points to process (for testing)"
    )

    args = parser.parse_args()

    asyncio.run(run_grid_generation(
        spacing_m=args.spacing,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        max_points=args.max_points
    ))


if __name__ == "__main__":
    main()
