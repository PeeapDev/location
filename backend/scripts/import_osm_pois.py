"""
Script to import Points of Interest from OpenStreetMap using Overpass API.

This script fetches POIs for Sierra Leone and imports them into the database
with auto-generated Plus Codes and postal zone assignments.

Usage: python -m scripts.import_osm_pois
"""

import asyncio
import time
import requests
from typing import Dict, List, Any, Optional
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

from app.models.poi import POI
from app.services.plus_code import PlusCodeService
from app.config import get_settings

settings = get_settings()

# Sierra Leone bounding box
SL_BOUNDS = "6.85,-13.5,10.0,-10.25"  # south,west,north,east

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Category mappings for OSM tags
CATEGORY_MAPPINGS = {
    # Healthcare
    "hospital": ("healthcare", "hospital"),
    "clinic": ("healthcare", "clinic"),
    "pharmacy": ("healthcare", "pharmacy"),
    "doctors": ("healthcare", "doctors"),
    "dentist": ("healthcare", "dentist"),
    "health_centre": ("healthcare", "health_centre"),
    # Education
    "school": ("education", "school"),
    "university": ("education", "university"),
    "college": ("education", "college"),
    "kindergarten": ("education", "kindergarten"),
    "library": ("education", "library"),
    # Government
    "townhall": ("government", "townhall"),
    "police": ("government", "police"),
    "courthouse": ("government", "courthouse"),
    "embassy": ("government", "embassy"),
    "post_office": ("government", "post_office"),
    "community_centre": ("government", "community_centre"),
    # Finance
    "bank": ("finance", "bank"),
    "atm": ("finance", "atm"),
    "money_transfer": ("finance", "money_transfer"),
    "bureau_de_change": ("finance", "bureau_de_change"),
    # Food & Drink
    "restaurant": ("food", "restaurant"),
    "cafe": ("food", "cafe"),
    "bar": ("food", "bar"),
    "fast_food": ("food", "fast_food"),
    "food_court": ("food", "food_court"),
    "pub": ("food", "pub"),
    # Transport
    "bus_station": ("transport", "bus_station"),
    "fuel": ("transport", "fuel"),
    "parking": ("transport", "parking"),
    "taxi": ("transport", "taxi"),
    "car_wash": ("transport", "car_wash"),
    "car_rental": ("transport", "car_rental"),
    # Tourism
    "hotel": ("tourism", "hotel"),
    "guest_house": ("tourism", "guest_house"),
    "hostel": ("tourism", "hostel"),
    "motel": ("tourism", "motel"),
    "attraction": ("tourism", "attraction"),
    "museum": ("tourism", "museum"),
    "viewpoint": ("tourism", "viewpoint"),
    # Religious
    "place_of_worship": ("religious", "place_of_worship"),
    "mosque": ("religious", "mosque"),
    "church": ("religious", "church"),
    # Utilities
    "marketplace": ("shopping", "marketplace"),
    "supermarket": ("shopping", "supermarket"),
    "convenience": ("shopping", "convenience"),
    "mall": ("shopping", "mall"),
}

# Queries for different categories
OVERPASS_QUERIES = [
    # Healthcare facilities
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"hospital|clinic|pharmacy|doctors|dentist"]({SL_BOUNDS});
      way["amenity"~"hospital|clinic|pharmacy"]({SL_BOUNDS});
    );
    out center;
    """,
    # Education
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"school|university|college|kindergarten|library"]({SL_BOUNDS});
      way["amenity"~"school|university|college"]({SL_BOUNDS});
    );
    out center;
    """,
    # Government & services
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"townhall|police|courthouse|embassy|post_office|community_centre"]({SL_BOUNDS});
      way["amenity"~"townhall|police|courthouse"]({SL_BOUNDS});
    );
    out center;
    """,
    # Finance
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"bank|atm|money_transfer|bureau_de_change"]({SL_BOUNDS});
    );
    out center;
    """,
    # Food & Drink
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"restaurant|cafe|bar|fast_food|pub"]({SL_BOUNDS});
    );
    out center;
    """,
    # Transport
    f"""
    [out:json][timeout:120];
    (
      node["amenity"~"bus_station|fuel|parking|taxi|car_wash|car_rental"]({SL_BOUNDS});
      way["amenity"="fuel"]({SL_BOUNDS});
    );
    out center;
    """,
    # Tourism
    f"""
    [out:json][timeout:120];
    (
      node["tourism"~"hotel|guest_house|hostel|motel|attraction|museum|viewpoint"]({SL_BOUNDS});
      way["tourism"~"hotel|guest_house"]({SL_BOUNDS});
    );
    out center;
    """,
    # Religious
    f"""
    [out:json][timeout:120];
    (
      node["amenity"="place_of_worship"]({SL_BOUNDS});
      way["amenity"="place_of_worship"]({SL_BOUNDS});
    );
    out center;
    """,
    # Shopping - main markets and supermarkets
    f"""
    [out:json][timeout:120];
    (
      node["shop"~"supermarket|mall|marketplace"]({SL_BOUNDS});
      node["amenity"="marketplace"]({SL_BOUNDS});
      way["shop"~"supermarket|mall"]({SL_BOUNDS});
    );
    out center;
    """,
    # Named places with addresses
    f"""
    [out:json][timeout:120];
    (
      node["name"]["addr:street"]({SL_BOUNDS});
    );
    out center;
    """,
]


def fetch_overpass_data(query: str) -> List[Dict[str, Any]]:
    """Fetch data from Overpass API."""
    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            timeout=180
        )
        response.raise_for_status()
        data = response.json()
        return data.get("elements", [])
    except Exception as e:
        print(f"Error fetching from Overpass: {e}")
        return []


def extract_category(tags: Dict[str, str]) -> tuple:
    """Extract category and subcategory from OSM tags."""
    # Check amenity tag first
    if "amenity" in tags:
        amenity = tags["amenity"]
        if amenity in CATEGORY_MAPPINGS:
            return CATEGORY_MAPPINGS[amenity]
        return ("other", amenity)

    # Check tourism tag
    if "tourism" in tags:
        tourism = tags["tourism"]
        if tourism in CATEGORY_MAPPINGS:
            return CATEGORY_MAPPINGS[tourism]
        return ("tourism", tourism)

    # Check shop tag
    if "shop" in tags:
        shop = tags["shop"]
        if shop in CATEGORY_MAPPINGS:
            return CATEGORY_MAPPINGS[shop]
        return ("shopping", shop)

    # Check building with name
    if "building" in tags and "name" in tags:
        return ("other", tags.get("building", "building"))

    return ("other", "unknown")


def process_element(element: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Process a single OSM element into POI data."""
    tags = element.get("tags", {})

    # Skip elements without a name
    if not tags.get("name"):
        return None

    # Get coordinates
    if element["type"] == "node":
        lat = element["lat"]
        lon = element["lon"]
    elif element["type"] == "way" and "center" in element:
        lat = element["center"]["lat"]
        lon = element["center"]["lon"]
    else:
        return None

    # Extract category
    category, subcategory = extract_category(tags)

    # Generate Plus Code
    plus_code = PlusCodeService.encode(lat, lon, code_length=11)

    return {
        "osm_id": element["id"],
        "osm_type": element["type"],
        "name": tags.get("name"),
        "name_local": tags.get("name:kri") or tags.get("name:en"),
        "category": category,
        "subcategory": subcategory,
        "latitude": lat,
        "longitude": lon,
        "plus_code": plus_code,
        "plus_code_short": plus_code[-6:] if plus_code else None,
        "street_name": tags.get("addr:street"),
        "house_number": tags.get("addr:housenumber"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "website": tags.get("website") or tags.get("contact:website"),
        "opening_hours": tags.get("opening_hours"),
        "tags": tags,
    }


async def find_zone_for_poi(db: AsyncSession, lat: float, lon: float) -> Optional[str]:
    """Find the postal zone that contains the given coordinates."""
    query = text("""
        SELECT zone_code
        FROM postal_zones
        WHERE ST_Contains(
            geometry,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        )
        LIMIT 1
    """)
    result = await db.execute(query, {"lat": lat, "lon": lon})
    row = result.first()
    return row[0] if row else None


async def import_pois():
    """Main import function."""
    print("=" * 60)
    print("OpenStreetMap POI Import for Sierra Leone")
    print("=" * 60)

    # Create engine and session
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    all_pois = []
    seen_osm_ids = set()

    # Fetch from each query
    for i, query in enumerate(OVERPASS_QUERIES, 1):
        print(f"\nFetching query {i}/{len(OVERPASS_QUERIES)}...")
        elements = fetch_overpass_data(query)
        print(f"  Found {len(elements)} elements")

        for element in elements:
            osm_id = element["id"]
            if osm_id in seen_osm_ids:
                continue
            seen_osm_ids.add(osm_id)

            poi_data = process_element(element)
            if poi_data:
                all_pois.append(poi_data)

        # Rate limiting - be nice to Overpass API
        time.sleep(5)

    print(f"\n{'=' * 60}")
    print(f"Total unique POIs to import: {len(all_pois)}")
    print(f"{'=' * 60}")

    if not all_pois:
        print("No POIs found. Exiting.")
        await engine.dispose()
        return

    # Import to database
    async with async_session() as db:
        imported = 0
        errors = 0
        zone_assigned = 0

        for poi_data in all_pois:
            try:
                # Find postal zone
                zone_code = await find_zone_for_poi(
                    db,
                    poi_data["latitude"],
                    poi_data["longitude"]
                )
                poi_data["zone_code"] = zone_code
                if zone_code:
                    zone_assigned += 1

                # Upsert POI
                stmt = insert(POI).values(**poi_data)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["osm_id"],
                    set_={
                        "name": poi_data["name"],
                        "name_local": poi_data["name_local"],
                        "category": poi_data["category"],
                        "subcategory": poi_data["subcategory"],
                        "latitude": poi_data["latitude"],
                        "longitude": poi_data["longitude"],
                        "plus_code": poi_data["plus_code"],
                        "plus_code_short": poi_data["plus_code_short"],
                        "zone_code": poi_data["zone_code"],
                        "street_name": poi_data["street_name"],
                        "house_number": poi_data["house_number"],
                        "phone": poi_data["phone"],
                        "website": poi_data["website"],
                        "opening_hours": poi_data["opening_hours"],
                        "tags": poi_data["tags"],
                    }
                )
                await db.execute(stmt)
                imported += 1

                if imported % 50 == 0:
                    await db.commit()
                    print(f"  Imported {imported}/{len(all_pois)} POIs...")

            except Exception as e:
                errors += 1
                print(f"Error importing {poi_data.get('name')}: {e}")

        await db.commit()

    # Print summary
    print(f"\n{'=' * 60}")
    print("IMPORT COMPLETE")
    print(f"{'=' * 60}")
    print(f"Total POIs imported: {imported}")
    print(f"POIs with zone assigned: {zone_assigned}")
    print(f"Errors: {errors}")

    # Category breakdown
    categories = {}
    for poi in all_pois:
        cat = poi["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\nCategory breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(import_pois())
