"""
Update Zone Names from Google Places API

Updates unnamed postal zones with neighborhood/street names from Google Places.

Usage:
    python -m scripts.update_zone_names_google --dry-run
    python -m scripts.update_zone_names_google
    python -m scripts.update_zone_names_google --limit 50
"""

import argparse
import asyncio
import os
import sys
import time
import httpx

# Add parent directory to path for imports
sys.path.insert(0, '.')

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.postal_zone import PostalZone

# Google Maps API key from environment
GOOGLE_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "AIzaSyDBAd7R79ZdkOHQxWxb3W9uI_McuIth7mY")

# Rate limiting
REQUESTS_PER_SECOND = 10
REQUEST_DELAY = 1.0 / REQUESTS_PER_SECOND


async def get_place_name(lat: float, lng: float, client: httpx.AsyncClient) -> dict:
    """
    Get place name from Google Places API using reverse geocoding.

    Args:
        lat: Latitude
        lng: Longitude
        client: HTTP client

    Returns:
        Dictionary with name info or None if failed
    """
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "latlng": f"{lat},{lng}",
        "key": GOOGLE_API_KEY,
        "result_type": "route|neighborhood|sublocality|locality",
        "language": "en"
    }

    try:
        response = await client.get(url, params=params)
        data = response.json()

        if data.get("status") != "OK":
            return {"error": data.get("status"), "name": None}

        results = data.get("results", [])
        if not results:
            return {"error": "NO_RESULTS", "name": None}

        # Extract the most relevant name
        # Priority: route > neighborhood > sublocality > locality
        name = None
        name_type = None

        for result in results:
            types = result.get("types", [])
            address_components = result.get("address_components", [])

            # Try to get route (street) name first
            if "route" in types and not name:
                for comp in address_components:
                    if "route" in comp.get("types", []):
                        name = comp.get("long_name")
                        name_type = "route"
                        break

            # Then neighborhood
            if "neighborhood" in types and not name:
                for comp in address_components:
                    if "neighborhood" in comp.get("types", []):
                        name = comp.get("long_name")
                        name_type = "neighborhood"
                        break

            # Then sublocality
            if "sublocality" in types and not name:
                for comp in address_components:
                    if "sublocality" in comp.get("types", []) or "sublocality_level_1" in comp.get("types", []):
                        name = comp.get("long_name")
                        name_type = "sublocality"
                        break

        # Fallback to formatted address
        if not name and results:
            formatted = results[0].get("formatted_address", "")
            # Take first part before comma
            name = formatted.split(",")[0].strip()
            name_type = "formatted"

        return {
            "name": name,
            "type": name_type,
            "raw_results": len(results)
        }

    except Exception as e:
        return {"error": str(e), "name": None}


async def update_zone_names(
    dry_run: bool = False,
    limit: int = None,
    district: str = "Western Area Urban"
):
    """
    Update unnamed zones with names from Google Places.

    Args:
        dry_run: If True, don't actually update database
        limit: Maximum zones to process (None = all)
        district: District to update zones for
    """
    print(f"\n{'='*60}")
    print("Update Zone Names from Google Places")
    print(f"{'='*60}")
    print(f"District: {district}")
    print(f"Dry run: {dry_run}")
    print(f"Limit: {limit or 'All'}")
    print(f"API Key: {GOOGLE_API_KEY[:20]}...")
    print(f"{'='*60}\n")

    async with AsyncSessionLocal() as db:
        # Find unnamed zones with center coordinates
        stmt = (
            select(PostalZone)
            .where(PostalZone.district_name == district)
            .where(PostalZone.zone_name.like("%Unnamed%"))
            .where(PostalZone.center_lat.isnot(None))
            .where(PostalZone.center_lng.isnot(None))
            .order_by(PostalZone.zone_code)
        )

        if limit:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        zones = result.scalars().all()

        print(f"Found {len(zones)} unnamed zones to update\n")

        if not zones:
            print("No unnamed zones found!")
            return

        # Process zones
        updated = 0
        failed = 0
        skipped = 0

        async with httpx.AsyncClient(timeout=30.0) as client:
            for i, zone in enumerate(zones):
                try:
                    # Rate limiting
                    if i > 0:
                        await asyncio.sleep(REQUEST_DELAY)

                    # Get place name from Google
                    place_info = await get_place_name(zone.center_lat, zone.center_lng, client)

                    if place_info.get("error"):
                        print(f"  [{i+1}/{len(zones)}] {zone.zone_code}: ERROR - {place_info['error']}")
                        failed += 1
                        continue

                    new_name = place_info.get("name")
                    if not new_name:
                        print(f"  [{i+1}/{len(zones)}] {zone.zone_code}: No name found")
                        skipped += 1
                        continue

                    # Clean up the name
                    new_name = new_name.strip()

                    # Skip if it's just a number or too short
                    if new_name.isdigit() or len(new_name) < 3:
                        print(f"  [{i+1}/{len(zones)}] {zone.zone_code}: Invalid name '{new_name}', skipping")
                        skipped += 1
                        continue

                    print(f"  [{i+1}/{len(zones)}] {zone.zone_code}: '{zone.zone_name}' -> '{new_name}' ({place_info.get('type')})")

                    if not dry_run:
                        zone.zone_name = new_name
                        updated += 1
                    else:
                        updated += 1

                    # Commit every 50 updates
                    if not dry_run and updated > 0 and updated % 50 == 0:
                        await db.commit()
                        print(f"\n  --- Committed {updated} updates ---\n")

                except Exception as e:
                    print(f"  [{i+1}/{len(zones)}] {zone.zone_code}: EXCEPTION - {e}")
                    failed += 1

        # Final commit
        if not dry_run and updated > 0:
            await db.commit()

        print(f"\n{'='*60}")
        print("Summary")
        print(f"{'='*60}")
        print(f"Total processed: {len(zones)}")
        print(f"Updated: {updated}")
        print(f"Failed: {failed}")
        print(f"Skipped: {skipped}")

        if dry_run:
            print("\n[DRY RUN] No changes were saved. Run without --dry-run to update database.")
        else:
            print(f"\nSuccessfully updated {updated} zone names!")


def main():
    parser = argparse.ArgumentParser(
        description="Update unnamed zone names from Google Places API"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate without updating database"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum zones to process"
    )
    parser.add_argument(
        "--district",
        type=str,
        default="Western Area Urban",
        help="District to update zones for"
    )

    args = parser.parse_args()

    asyncio.run(update_zone_names(
        dry_run=args.dry_run,
        limit=args.limit,
        district=args.district
    ))


if __name__ == "__main__":
    main()
