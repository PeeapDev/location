"""
Google Places API Scraper for Sierra Leone.

This script uses Google Places API to collect:
- Businesses and establishments
- Points of interest
- Streets and addresses

Usage:
    python -m scripts.scrape_google_places

Environment variables required:
    GOOGLE_MAPS_API_KEY: Your Google Cloud API key with Places API enabled

Note: Google Places API has usage limits and costs. Monitor your usage in Google Cloud Console.
"""

import os
import json
import time
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

import googlemaps
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert
from dotenv import load_dotenv

from app.models.poi import POI
from app.services.plus_code import PlusCodeService
from app.config import get_settings

# Load environment variables
load_dotenv()

settings = get_settings()

# Google Maps client
GOOGLE_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

# Sierra Leone regions to search
SIERRA_LEONE_REGIONS = [
    # Freetown and Western Area
    {"name": "Freetown Central", "lat": 8.4657, "lng": -13.2317, "radius": 5000},
    {"name": "Freetown East", "lat": 8.4500, "lng": -13.1800, "radius": 5000},
    {"name": "Freetown West", "lat": 8.4800, "lng": -13.2800, "radius": 5000},
    {"name": "Freetown Aberdeen", "lat": 8.4650, "lng": -13.2900, "radius": 3000},
    {"name": "Freetown Lumley", "lat": 8.4400, "lng": -13.2700, "radius": 3000},
    {"name": "Freetown Hill Station", "lat": 8.4700, "lng": -13.2100, "radius": 3000},
    {"name": "Freetown Congo Town", "lat": 8.4550, "lng": -13.2000, "radius": 3000},
    {"name": "Freetown Wellington", "lat": 8.4250, "lng": -13.1600, "radius": 4000},
    {"name": "Waterloo", "lat": 8.3333, "lng": -13.0667, "radius": 5000},
    # Major towns
    {"name": "Bo", "lat": 7.9647, "lng": -11.7383, "radius": 8000},
    {"name": "Kenema", "lat": 7.8769, "lng": -11.1903, "radius": 8000},
    {"name": "Makeni", "lat": 8.8833, "lng": -12.0500, "radius": 8000},
    {"name": "Koidu", "lat": 8.6439, "lng": -10.9711, "radius": 6000},
    {"name": "Port Loko", "lat": 8.7667, "lng": -12.7833, "radius": 5000},
    {"name": "Lungi", "lat": 8.6167, "lng": -13.1333, "radius": 4000},
    {"name": "Kabala", "lat": 9.5833, "lng": -11.5500, "radius": 4000},
    {"name": "Bonthe", "lat": 7.5264, "lng": -12.5050, "radius": 3000},
    {"name": "Moyamba", "lat": 8.1667, "lng": -12.4333, "radius": 4000},
    {"name": "Kambia", "lat": 9.1167, "lng": -12.9167, "radius": 4000},
    {"name": "Pujehun", "lat": 7.3500, "lng": -11.7167, "radius": 3000},
    {"name": "Kailahun", "lat": 8.2778, "lng": -10.5736, "radius": 4000},
]

# Place types to search (Google Places API types)
PLACE_TYPES = [
    # Healthcare
    "hospital", "pharmacy", "doctor", "dentist", "health",
    # Education
    "school", "university", "library",
    # Government
    "local_government_office", "police", "post_office", "courthouse",
    # Finance
    "bank", "atm",
    # Food & Drink
    "restaurant", "cafe", "bar", "bakery",
    # Transport
    "bus_station", "gas_station", "car_repair", "parking",
    # Shopping
    "supermarket", "shopping_mall", "store", "market",
    # Tourism
    "lodging", "hotel", "tourist_attraction", "museum",
    # Religious
    "church", "mosque", "hindu_temple",
    # Services
    "car_wash", "laundry", "beauty_salon", "hair_care",
]

# Category mapping for our system
GOOGLE_CATEGORY_MAPPING = {
    "hospital": ("healthcare", "hospital"),
    "pharmacy": ("healthcare", "pharmacy"),
    "doctor": ("healthcare", "doctor"),
    "dentist": ("healthcare", "dentist"),
    "health": ("healthcare", "health_facility"),
    "school": ("education", "school"),
    "university": ("education", "university"),
    "library": ("education", "library"),
    "local_government_office": ("government", "government_office"),
    "police": ("government", "police"),
    "post_office": ("government", "post_office"),
    "courthouse": ("government", "courthouse"),
    "bank": ("finance", "bank"),
    "atm": ("finance", "atm"),
    "restaurant": ("food", "restaurant"),
    "cafe": ("food", "cafe"),
    "bar": ("food", "bar"),
    "bakery": ("food", "bakery"),
    "bus_station": ("transport", "bus_station"),
    "gas_station": ("transport", "fuel"),
    "car_repair": ("transport", "car_repair"),
    "parking": ("transport", "parking"),
    "supermarket": ("shopping", "supermarket"),
    "shopping_mall": ("shopping", "mall"),
    "store": ("shopping", "store"),
    "market": ("shopping", "market"),
    "lodging": ("tourism", "lodging"),
    "hotel": ("tourism", "hotel"),
    "tourist_attraction": ("tourism", "attraction"),
    "museum": ("tourism", "museum"),
    "church": ("religious", "church"),
    "mosque": ("religious", "mosque"),
    "hindu_temple": ("religious", "temple"),
    "car_wash": ("services", "car_wash"),
    "laundry": ("services", "laundry"),
    "beauty_salon": ("services", "beauty_salon"),
    "hair_care": ("services", "hair_care"),
}


def get_category(place_types: List[str]) -> tuple:
    """Get category and subcategory from Google place types."""
    for ptype in place_types:
        if ptype in GOOGLE_CATEGORY_MAPPING:
            return GOOGLE_CATEGORY_MAPPING[ptype]
    return ("other", place_types[0] if place_types else "unknown")


def process_place(place: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Process a Google Places result into POI data."""
    try:
        name = place.get("name")
        if not name:
            return None

        location = place.get("geometry", {}).get("location", {})
        lat = location.get("lat")
        lng = location.get("lng")

        if not lat or not lng:
            return None

        # Get category
        place_types = place.get("types", [])
        category, subcategory = get_category(place_types)

        # Generate Plus Code
        plus_code = PlusCodeService.encode(lat, lng, code_length=11)

        return {
            "google_place_id": place.get("place_id"),
            "name": name,
            "category": category,
            "subcategory": subcategory,
            "latitude": lat,
            "longitude": lng,
            "plus_code": plus_code,
            "plus_code_short": plus_code[-6:] if plus_code else None,
            "street_name": place.get("vicinity", "").split(",")[0] if place.get("vicinity") else None,
            "formatted_address": place.get("formatted_address") or place.get("vicinity"),
            "rating": place.get("rating"),
            "user_ratings_total": place.get("user_ratings_total"),
            "business_status": place.get("business_status"),
            "types": place_types,
            "source": "google_places",
        }
    except Exception as e:
        print(f"Error processing place: {e}")
        return None


def search_places_in_region(
    client: googlemaps.Client,
    region: Dict[str, Any],
    place_type: str
) -> List[Dict[str, Any]]:
    """Search for places of a specific type in a region."""
    results = []

    try:
        # Initial search
        response = client.places_nearby(
            location=(region["lat"], region["lng"]),
            radius=region["radius"],
            type=place_type
        )

        results.extend(response.get("results", []))

        # Handle pagination (up to 60 results per search)
        while "next_page_token" in response:
            time.sleep(2)  # Required delay for next_page_token
            response = client.places_nearby(
                location=(region["lat"], region["lng"]),
                radius=region["radius"],
                type=place_type,
                page_token=response["next_page_token"]
            )
            results.extend(response.get("results", []))

    except googlemaps.exceptions.ApiError as e:
        print(f"API Error for {region['name']}/{place_type}: {e}")
    except Exception as e:
        print(f"Error searching {region['name']}/{place_type}: {e}")

    return results


def text_search_streets(
    client: googlemaps.Client,
    region: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Search for streets and addresses in a region using text search."""
    results = []
    search_terms = [
        f"street {region['name']} Sierra Leone",
        f"road {region['name']} Sierra Leone",
        f"avenue {region['name']} Sierra Leone",
        f"{region['name']} main road Sierra Leone",
    ]

    for term in search_terms:
        try:
            response = client.places(
                query=term,
                location=(region["lat"], region["lng"]),
                radius=region["radius"]
            )
            results.extend(response.get("results", []))
            time.sleep(0.5)  # Rate limiting
        except Exception as e:
            print(f"Error text searching '{term}': {e}")

    return results


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


async def save_to_database(places: List[Dict[str, Any]]):
    """Save collected places to the database."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    imported = 0
    errors = 0

    # Process in batches with individual transactions to prevent cascading failures
    batch_size = 50
    for i in range(0, len(places), batch_size):
        batch = places[i:i + batch_size]

        async with async_session() as db:
            try:
                for place_data in batch:
                    try:
                        # Find postal zone (use a separate query that won't fail the transaction)
                        zone_code = None
                        try:
                            zone_code = await find_zone_for_poi(
                                db,
                                place_data["latitude"],
                                place_data["longitude"]
                            )
                        except Exception:
                            pass  # Zone lookup failed, continue without zone_code

                        place_data["zone_code"] = zone_code

                        # Prepare for upsert (using google_place_id as unique key)
                        poi_fields = {
                            "name": place_data["name"],
                            "category": place_data["category"],
                            "subcategory": place_data["subcategory"],
                            "latitude": place_data["latitude"],
                            "longitude": place_data["longitude"],
                            "plus_code": place_data["plus_code"],
                            "plus_code_short": place_data["plus_code_short"],
                            "zone_code": place_data.get("zone_code"),
                            "street_name": place_data.get("street_name"),
                            "tags": {
                                "google_place_id": place_data.get("google_place_id"),
                                "rating": place_data.get("rating"),
                                "user_ratings_total": place_data.get("user_ratings_total"),
                                "business_status": place_data.get("business_status"),
                                "types": place_data.get("types"),
                                "formatted_address": place_data.get("formatted_address"),
                                "source": "google_places",
                            }
                        }

                        # Upsert using plus_code as unique identifier
                        stmt = insert(POI).values(**poi_fields)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=["plus_code"],
                            set_=poi_fields
                        )
                        await db.execute(stmt)
                        imported += 1

                    except Exception as e:
                        errors += 1
                        print(f"Error saving {place_data.get('name')}: {e}")
                        await db.rollback()
                        # Start fresh connection for next item
                        break

                await db.commit()
                print(f"  Saved batch {i//batch_size + 1} ({imported} total places)...")

            except Exception as e:
                print(f"Batch error: {e}")
                await db.rollback()

    await engine.dispose()
    return imported, errors


def save_to_json(places: List[Dict[str, Any]], filename: str):
    """Save places to a JSON file for backup/review."""
    output_dir = Path(__file__).parent.parent.parent / "data" / "google_places"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated": datetime.now().isoformat(),
            "total_places": len(places),
            "places": places
        }, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(places)} places to {output_path}")


def main():
    """Main scraper function."""
    print("=" * 60)
    print("Google Places API Scraper for Sierra Leone")
    print("=" * 60)

    if not GOOGLE_API_KEY:
        print("\nERROR: GOOGLE_MAPS_API_KEY environment variable not set.")
        print("Please set your Google API key in .env file:")
        print("  GOOGLE_MAPS_API_KEY=your_api_key_here")
        return

    # Initialize Google Maps client
    try:
        client = googlemaps.Client(key=GOOGLE_API_KEY)
        # Test the API key
        client.geocode("Freetown, Sierra Leone")
        print("\nGoogle Maps API key validated successfully!")
    except Exception as e:
        print(f"\nERROR: Invalid API key or API not enabled: {e}")
        return

    all_places = []
    seen_place_ids = set()

    # Search by place type in each region
    total_searches = len(SIERRA_LEONE_REGIONS) * len(PLACE_TYPES)
    search_count = 0

    print(f"\nSearching {len(SIERRA_LEONE_REGIONS)} regions x {len(PLACE_TYPES)} place types...")
    print(f"Total API calls estimated: ~{total_searches}")

    for region in SIERRA_LEONE_REGIONS:
        print(f"\n--- {region['name']} ---")
        region_places = 0

        for place_type in PLACE_TYPES:
            search_count += 1
            results = search_places_in_region(client, region, place_type)

            for place in results:
                place_id = place.get("place_id")
                if place_id and place_id not in seen_place_ids:
                    seen_place_ids.add(place_id)
                    processed = process_place(place)
                    if processed:
                        all_places.append(processed)
                        region_places += 1

            # Rate limiting
            time.sleep(0.2)

        print(f"  Found {region_places} unique places")

        # Additional text search for streets
        print(f"  Searching for streets...")
        street_results = text_search_streets(client, region)
        for place in street_results:
            place_id = place.get("place_id")
            if place_id and place_id not in seen_place_ids:
                seen_place_ids.add(place_id)
                processed = process_place(place)
                if processed:
                    all_places.append(processed)

    print(f"\n{'=' * 60}")
    print(f"COLLECTION COMPLETE")
    print(f"{'=' * 60}")
    print(f"Total unique places collected: {len(all_places)}")

    # Save to JSON first (backup)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_to_json(all_places, f"sierra_leone_places_{timestamp}.json")

    # Category breakdown
    categories = {}
    for place in all_places:
        cat = place["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\nCategory breakdown:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    # Save to database
    print(f"\nSaving to database...")
    imported, errors = asyncio.run(save_to_database(all_places))

    print(f"\n{'=' * 60}")
    print(f"DATABASE IMPORT COMPLETE")
    print(f"{'=' * 60}")
    print(f"Successfully imported: {imported}")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    main()
