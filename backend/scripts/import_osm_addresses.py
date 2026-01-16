#!/usr/bin/env python3
"""
Import addresses from OpenStreetMap for Sierra Leone.

Uses Overpass API to fetch:
- Named buildings
- Businesses/shops
- Schools, hospitals, government buildings
- Hotels, restaurants
- Banks, ATMs
- Religious buildings
- Other POIs with addresses

These become searchable addresses in the postal system.
"""

import asyncio
import httpx
import json
from datetime import datetime
from typing import List, Dict, Any
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, AsyncSessionLocal
from app.services.plus_code import PlusCodeService

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Sierra Leone bounding box
SL_BBOX = {
    "south": 6.85,
    "west": -13.5,
    "north": 10.0,
    "east": -10.25
}

# Freetown area (priority - more detailed)
FREETOWN_BBOX = {
    "south": 8.4,
    "west": -13.35,
    "north": 8.55,
    "east": -13.15
}

# Categories to fetch
CATEGORIES = [
    # Commercial
    {"tag": "shop", "category": "shop", "segment": "commercial"},
    {"tag": "amenity=bank", "category": "bank", "segment": "commercial"},
    {"tag": "amenity=atm", "category": "atm", "segment": "commercial"},
    {"tag": "amenity=restaurant", "category": "restaurant", "segment": "commercial"},
    {"tag": "amenity=cafe", "category": "cafe", "segment": "commercial"},
    {"tag": "amenity=pharmacy", "category": "pharmacy", "segment": "commercial"},
    {"tag": "amenity=fuel", "category": "fuel_station", "segment": "commercial"},
    {"tag": "tourism=hotel", "category": "hotel", "segment": "commercial"},
    {"tag": "tourism=guest_house", "category": "guest_house", "segment": "commercial"},

    # Government/Institutional
    {"tag": "amenity=hospital", "category": "hospital", "segment": "government"},
    {"tag": "amenity=clinic", "category": "clinic", "segment": "government"},
    {"tag": "amenity=school", "category": "school", "segment": "institutional"},
    {"tag": "amenity=university", "category": "university", "segment": "institutional"},
    {"tag": "amenity=police", "category": "police", "segment": "government"},
    {"tag": "amenity=fire_station", "category": "fire_station", "segment": "government"},
    {"tag": "amenity=post_office", "category": "post_office", "segment": "government"},
    {"tag": "office=government", "category": "government_office", "segment": "government"},
    {"tag": "amenity=courthouse", "category": "courthouse", "segment": "government"},

    # Religious
    {"tag": "amenity=place_of_worship", "category": "worship", "segment": "institutional"},

    # Transport
    {"tag": "amenity=bus_station", "category": "bus_station", "segment": "commercial"},
    {"tag": "aeroway=aerodrome", "category": "airport", "segment": "government"},

    # Other
    {"tag": "amenity=marketplace", "category": "market", "segment": "commercial"},
    {"tag": "amenity=community_centre", "category": "community_center", "segment": "institutional"},
    {"tag": "leisure=stadium", "category": "stadium", "segment": "institutional"},
]


def build_overpass_query(bbox: Dict, category: Dict) -> str:
    """Build Overpass QL query for a category."""
    south, west, north, east = bbox["south"], bbox["west"], bbox["north"], bbox["east"]
    tag = category["tag"]

    if "=" in tag:
        key, value = tag.split("=")
        tag_filter = f'["{key}"="{value}"]'
    else:
        tag_filter = f'["{tag}"]'

    query = f"""
    [out:json][timeout:60];
    (
      node{tag_filter}["name"]({south},{west},{north},{east});
      way{tag_filter}["name"]({south},{west},{north},{east});
      relation{tag_filter}["name"]({south},{west},{north},{east});
    );
    out center;
    """
    return query


async def fetch_osm_data(bbox: Dict, category: Dict) -> List[Dict]:
    """Fetch data from Overpass API."""
    query = build_overpass_query(bbox, category)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(OVERPASS_URL, data={"data": query})
            response.raise_for_status()
            data = response.json()

            results = []
            for element in data.get("elements", []):
                # Get coordinates
                if element["type"] == "node":
                    lat = element.get("lat")
                    lon = element.get("lon")
                elif element["type"] in ["way", "relation"]:
                    center = element.get("center", {})
                    lat = center.get("lat")
                    lon = center.get("lon")
                else:
                    continue

                if not lat or not lon:
                    continue

                tags = element.get("tags", {})
                name = tags.get("name", "")

                if not name:
                    continue

                results.append({
                    "osm_id": element["id"],
                    "osm_type": element["type"],
                    "name": name,
                    "latitude": lat,
                    "longitude": lon,
                    "category": category["category"],
                    "segment_type": category["segment"],
                    "street": tags.get("addr:street", ""),
                    "housenumber": tags.get("addr:housenumber", ""),
                    "city": tags.get("addr:city", ""),
                    "phone": tags.get("phone", tags.get("contact:phone", "")),
                    "website": tags.get("website", tags.get("contact:website", "")),
                    "opening_hours": tags.get("opening_hours", ""),
                    "tags": tags
                })

            return results

        except Exception as e:
            print(f"  Error fetching {category['category']}: {e}")
            return []


async def find_zone_for_point(session, lat: float, lng: float) -> Dict:
    """Find the nearest postal zone for coordinates."""
    # First try geometry containment
    result = await session.execute(text("""
        SELECT zone_code, zone_name, district_name, region_name, segment_type
        FROM postal_zones
        WHERE geometry IS NOT NULL
        AND ST_Contains(geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        LIMIT 1
    """), {"lat": lat, "lng": lng})

    row = result.fetchone()
    if row:
        return {
            "zone_code": row[0],
            "zone_name": row[1],
            "district_name": row[2],
            "region_name": row[3],
            "segment_type": row[4]
        }

    # Fallback: nearest by center point
    result = await session.execute(text("""
        SELECT zone_code, zone_name, district_name, region_name, segment_type,
               (6371000 * acos(
                   cos(radians(:lat)) * cos(radians(CAST(center_lat AS FLOAT))) *
                   cos(radians(CAST(center_lng AS FLOAT)) - radians(:lng)) +
                   sin(radians(:lat)) * sin(radians(CAST(center_lat AS FLOAT)))
               )) as distance
        FROM postal_zones
        WHERE center_lat IS NOT NULL AND center_lng IS NOT NULL
        ORDER BY distance
        LIMIT 1
    """), {"lat": lat, "lng": lng})

    row = result.fetchone()
    if row:
        return {
            "zone_code": row[0],
            "zone_name": row[1],
            "district_name": row[2],
            "region_name": row[3],
            "segment_type": row[4]
        }

    return None


async def get_next_sequence(session, zone_code: str) -> int:
    """Get next sequence number for a zone."""
    result = await session.execute(text("""
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(pda_id FROM 'SL-[0-9]{4}-[0-9]{3}-([0-9]{6})-[0-9]') AS INTEGER)
        ), 0) + 1
        FROM addresses
        WHERE zone_code = :zone_code
    """), {"zone_code": zone_code})

    return result.scalar() or 1


def calculate_luhn_check(digits: str) -> str:
    """Calculate Luhn check digit."""
    total = 0
    for i, digit in enumerate(reversed(digits)):
        d = int(digit)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return str((10 - (total % 10)) % 10)


def generate_pda_id(zone_code: str, sequence: int) -> str:
    """Generate PDA-ID for an address."""
    # Format: SL-XXXX-YYY-NNNNNN-C
    parts = zone_code.split("-")
    primary = parts[0]
    segment = parts[1] if len(parts) > 1 else "000"

    base = f"{primary}{segment}{sequence:06d}"
    check = calculate_luhn_check(base.replace("-", ""))

    return f"SL-{primary}-{segment}-{sequence:06d}-{check}"


async def import_addresses(addresses: List[Dict], source: str = "osm"):
    """Import addresses to database."""
    async with AsyncSessionLocal() as session:
        imported = 0
        skipped = 0

        for addr in addresses:
            try:
                # Find zone
                zone = await find_zone_for_point(session, addr["latitude"], addr["longitude"])
                if not zone:
                    skipped += 1
                    continue

                zone_code = zone["zone_code"]

                # Check for duplicate (same OSM ID or very close location)
                result = await session.execute(text("""
                    SELECT pda_id FROM addresses
                    WHERE extra_data->>'osm_id' = :osm_id
                    OR (
                        ABS(latitude - :lat) < 0.0001 AND
                        ABS(longitude - :lng) < 0.0001 AND
                        LOWER(COALESCE(building_name, '')) = LOWER(:name)
                    )
                    LIMIT 1
                """), {
                    "osm_id": str(addr["osm_id"]),
                    "lat": addr["latitude"],
                    "lng": addr["longitude"],
                    "name": addr["name"]
                })

                if result.fetchone():
                    skipped += 1
                    continue

                # Generate PDA-ID
                sequence = await get_next_sequence(session, zone_code)
                pda_id = generate_pda_id(zone_code, sequence)

                # Generate Plus Code
                plus_code = PlusCodeService.encode(addr["latitude"], addr["longitude"], 11)
                plus_code_short = plus_code[-6:] if plus_code else None

                # Insert address
                await session.execute(text("""
                    INSERT INTO addresses (
                        pda_id, zone_code, latitude, longitude,
                        location, plus_code, plus_code_short,
                        street_name, house_number, building_name,
                        landmark_primary, address_type,
                        contact_phone, confidence_score,
                        verification_status, verification_method,
                        created_at, updated_at, extra_data
                    ) VALUES (
                        :pda_id, :zone_code, :lat, :lng,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                        :plus_code, :plus_code_short,
                        :street, :housenumber, :name,
                        :landmark, :address_type,
                        :phone, 0.7,
                        'verified', 'osm_import',
                        NOW(), NOW(), :extra_data
                    )
                """), {
                    "pda_id": pda_id,
                    "zone_code": zone_code,
                    "lat": addr["latitude"],
                    "lng": addr["longitude"],
                    "plus_code": plus_code,
                    "plus_code_short": plus_code_short,
                    "street": addr["street"] or None,
                    "housenumber": addr["housenumber"] or None,
                    "name": addr["name"],
                    "landmark": f"{addr['category'].replace('_', ' ').title()}",
                    "address_type": addr["segment_type"],
                    "phone": addr["phone"] or None,
                    "extra_data": json.dumps({
                        "osm_id": str(addr["osm_id"]),
                        "osm_type": addr["osm_type"],
                        "category": addr["category"],
                        "source": source,
                        "website": addr["website"],
                        "opening_hours": addr["opening_hours"],
                        "imported_at": datetime.utcnow().isoformat()
                    })
                })

                imported += 1

                # Commit in batches
                if imported % 100 == 0:
                    await session.commit()
                    print(f"    Imported {imported} addresses...")

            except Exception as e:
                print(f"    Error importing {addr['name']}: {e}")
                skipped += 1
                continue

        await session.commit()
        return imported, skipped


async def main():
    """Main import process."""
    print("=" * 60)
    print("OpenStreetMap Address Import for Sierra Leone")
    print("=" * 60)
    print()

    all_addresses = []

    # Fetch from Freetown first (priority area)
    print("Fetching Freetown area (priority)...")
    for category in CATEGORIES:
        print(f"  Fetching {category['category']}...")
        addresses = await fetch_osm_data(FREETOWN_BBOX, category)
        print(f"    Found {len(addresses)} items")
        all_addresses.extend(addresses)
        await asyncio.sleep(1)  # Rate limiting

    print(f"\nTotal Freetown: {len(all_addresses)} addresses")

    # Fetch rest of Sierra Leone
    print("\nFetching rest of Sierra Leone...")
    for category in CATEGORIES[:10]:  # Limit categories for full country
        print(f"  Fetching {category['category']}...")
        addresses = await fetch_osm_data(SL_BBOX, category)
        # Filter out Freetown duplicates
        new_addresses = [
            a for a in addresses
            if not (FREETOWN_BBOX["south"] <= a["latitude"] <= FREETOWN_BBOX["north"] and
                   FREETOWN_BBOX["west"] <= a["longitude"] <= FREETOWN_BBOX["east"])
        ]
        print(f"    Found {len(new_addresses)} new items")
        all_addresses.extend(new_addresses)
        await asyncio.sleep(2)  # Rate limiting

    print(f"\nTotal addresses to import: {len(all_addresses)}")

    # Import to database
    print("\nImporting to database...")
    imported, skipped = await import_addresses(all_addresses)

    print()
    print("=" * 60)
    print(f"Import Complete!")
    print(f"  Imported: {imported}")
    print(f"  Skipped:  {skipped}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
