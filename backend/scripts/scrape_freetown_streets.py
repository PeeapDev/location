"""
Detailed Street-Level Scraper for Freetown, Sierra Leone.

This script creates precision postal zones for logistics by:
1. Scraping ALL streets within each Freetown neighborhood from OSM
2. Handling duplicate street names (e.g., two "Kallon Drive" in Lumley)
3. Creating unique zone codes: XYZZ-NNN with context
4. Generating Plus Codes for precise GPS navigation

Problem this solves:
- Driver needs to deliver to "Kallon Drive, Lumley"
- There are TWO Kallon Drives in Lumley:
  - Kallon Drive near Regent Road/Sheriff Drive (1105-012)
  - Kallon Drive at Beach Road (1105-025)
- Each gets a unique Plus Code for precise navigation

Usage:
    python -m scripts.scrape_freetown_streets
"""

import asyncio
import time
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from collections import defaultdict

import requests
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.plus_code import PlusCodeService
from app.config import get_settings

settings = get_settings()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Freetown neighborhoods with their bounding boxes
# Each neighborhood will be scraped for ALL streets
FREETOWN_NEIGHBORHOODS = {
    # Western Area Urban (11xx)
    "1100": {
        "name": "Central Business District",
        "bounds": {"south": 8.470, "north": 8.490, "west": -13.240, "east": -13.215},
        "context_landmarks": ["Tower Hill", "State House", "Cotton Tree", "Law Courts"],
    },
    "1101": {
        "name": "Cline Town & East End",
        "bounds": {"south": 8.465, "north": 8.490, "west": -13.215, "east": -13.185},
        "context_landmarks": ["Fourah Bay College", "Government Wharf"],
    },
    "1102": {
        "name": "Congo Town & Murray Town",
        "bounds": {"south": 8.480, "north": 8.500, "west": -13.250, "east": -13.200},
        "context_landmarks": ["Murray Town Barracks", "Congo Cross"],
    },
    "1103": {
        "name": "Brookfields & New England",
        "bounds": {"south": 8.450, "north": 8.475, "west": -13.260, "east": -13.235},
        "context_landmarks": ["Brookfields Hotel", "New England Ville"],
    },
    "1104": {
        "name": "Hill Station & Wilberforce",
        "bounds": {"south": 8.430, "north": 8.465, "west": -13.285, "east": -13.250},
        "context_landmarks": ["Hill Station", "Wilberforce Village", "Leicester Peak"],
    },
    "1105": {
        "name": "Lumley & Aberdeen",
        "bounds": {"south": 8.405, "north": 8.470, "west": -13.310, "east": -13.265},
        "context_landmarks": ["Lumley Beach", "Aberdeen Bridge", "Cape Sierra Hotel", "Mammy Yoko Hotel"],
    },
    "1106": {
        "name": "Goderich & Peninsula",
        "bounds": {"south": 8.350, "north": 8.420, "west": -13.380, "east": -13.300},
        "context_landmarks": ["Goderich Village", "Tokeh Beach", "Hamilton"],
    },
    "1107": {
        "name": "Kissy Area",
        "bounds": {"south": 8.475, "north": 8.505, "west": -13.195, "east": -13.165},
        "context_landmarks": ["Kissy Mental Hospital", "Kissy Dockyard", "Ferry Junction"],
    },
    "1108": {
        "name": "Wellington & Portee",
        "bounds": {"south": 8.470, "north": 8.505, "west": -13.175, "east": -13.145},
        "context_landmarks": ["Wellington Industrial Estate", "Old Wharf"],
    },
    "1109": {
        "name": "Calaba Town & Allen Town",
        "bounds": {"south": 8.420, "north": 8.475, "west": -13.160, "east": -13.120},
        "context_landmarks": ["Allen Town Police", "Hastings Airfield"],
    },
    "1110": {
        "name": "Kingtom & Kroo Town",
        "bounds": {"south": 8.485, "north": 8.510, "west": -13.250, "east": -13.220},
        "context_landmarks": ["Kingtom Cemetery", "King Jimmy Market"],
    },
}


@dataclass
class StreetLocation:
    """Represents a unique street location."""
    name: str
    lat: float
    lng: float
    osm_id: int
    highway_type: str
    context: str = ""  # e.g., "near Regent Road", "at Beach Road"
    plus_code: str = ""
    zone_code: str = ""

    def __hash__(self):
        # Use coordinates for uniqueness (rounded to ~10m precision)
        return hash((round(self.lat, 4), round(self.lng, 4)))


def fetch_streets_in_area(bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Fetch ALL streets within a bounding box from OSM."""
    query = f"""
    [out:json][timeout:180];
    (
      way["highway"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      way["highway"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
    );
    out body geom;
    """

    try:
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=200)
        response.raise_for_status()
        data = response.json()

        streets = []
        for element in data.get("elements", []):
            if element.get("type") != "way":
                continue

            tags = element.get("tags", {})
            geometry = element.get("geometry", [])

            if not geometry:
                continue

            # Get street name (or generate from highway type)
            name = tags.get("name", "")
            highway_type = tags.get("highway", "road")

            # Calculate multiple points along the street for segmentation
            # This is key for handling long streets that span different areas
            segments = []
            step = max(1, len(geometry) // 5)  # Get up to 5 points per street

            for i in range(0, len(geometry), step):
                point = geometry[i]
                segments.append({
                    "osm_id": element["id"],
                    "name": name,
                    "highway_type": highway_type,
                    "lat": point["lat"],
                    "lng": point["lon"],
                    "segment_index": i // step,
                })

            # Always include midpoint and endpoints
            if len(geometry) >= 2:
                # Start point
                segments.append({
                    "osm_id": element["id"],
                    "name": name,
                    "highway_type": highway_type,
                    "lat": geometry[0]["lat"],
                    "lng": geometry[0]["lon"],
                    "segment_index": 0,
                })
                # End point
                segments.append({
                    "osm_id": element["id"],
                    "name": name,
                    "highway_type": highway_type,
                    "lat": geometry[-1]["lat"],
                    "lng": geometry[-1]["lon"],
                    "segment_index": len(geometry) - 1,
                })
                # Midpoint
                mid_idx = len(geometry) // 2
                segments.append({
                    "osm_id": element["id"],
                    "name": name,
                    "highway_type": highway_type,
                    "lat": geometry[mid_idx]["lat"],
                    "lng": geometry[mid_idx]["lon"],
                    "segment_index": mid_idx,
                })

            streets.extend(segments)

        return streets
    except Exception as e:
        print(f"    Error fetching streets: {e}")
        return []


def fetch_landmarks_in_area(bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Fetch landmarks for context (hotels, schools, markets, etc.)."""
    query = f"""
    [out:json][timeout:120];
    (
      node["name"]["amenity"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      node["name"]["tourism"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      node["name"]["shop"="supermarket"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      way["name"]["building"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
    );
    out center;
    """

    try:
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=150)
        response.raise_for_status()
        data = response.json()

        landmarks = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            name = tags.get("name", "")

            if not name:
                continue

            lat = element.get("lat") or element.get("center", {}).get("lat")
            lng = element.get("lon") or element.get("center", {}).get("lon")

            if lat and lng:
                landmarks.append({
                    "name": name,
                    "lat": lat,
                    "lng": lng,
                    "type": tags.get("amenity") or tags.get("tourism") or tags.get("shop") or "landmark",
                })

        return landmarks
    except Exception as e:
        print(f"    Error fetching landmarks: {e}")
        return []


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate approximate distance in meters between two points."""
    # Simple Euclidean approximation (good enough for nearby points)
    lat_diff = (lat1 - lat2) * 111000  # ~111km per degree latitude
    lng_diff = (lng1 - lng2) * 111000 * 0.85  # Adjust for latitude
    return (lat_diff**2 + lng_diff**2) ** 0.5


def find_nearest_landmark(lat: float, lng: float, landmarks: List[Dict], max_distance: float = 200) -> Optional[str]:
    """Find the nearest landmark to provide context for a location."""
    nearest = None
    min_dist = max_distance

    for landmark in landmarks:
        dist = calculate_distance(lat, lng, landmark["lat"], landmark["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest = landmark["name"]

    return nearest


def find_intersecting_street(lat: float, lng: float, streets: List[Dict], current_name: str, max_distance: float = 50) -> Optional[str]:
    """Find the nearest intersecting street for context."""
    nearest = None
    min_dist = max_distance

    for street in streets:
        if street["name"] == current_name or not street["name"]:
            continue

        dist = calculate_distance(lat, lng, street["lat"], street["lng"])
        if dist < min_dist:
            min_dist = dist
            nearest = street["name"]

    return nearest


def process_neighborhood(
    postal_code: str,
    neighborhood_data: Dict,
    existing_zones: List[Dict]
) -> List[Dict]:
    """Process a neighborhood and create granular zones for all streets."""

    print(f"\n  Processing {postal_code} - {neighborhood_data['name']}...")

    bounds = neighborhood_data["bounds"]

    # Fetch streets and landmarks
    streets = fetch_streets_in_area(bounds)
    time.sleep(2)  # Rate limiting

    landmarks = fetch_landmarks_in_area(bounds)
    time.sleep(2)

    print(f"    Found {len(streets)} street segments, {len(landmarks)} landmarks")

    # Group streets by name to identify duplicates
    streets_by_name = defaultdict(list)
    for street in streets:
        if street["name"]:
            streets_by_name[street["name"]].append(street)

    # Find existing max segment for this postal code
    existing_segments = [
        int(z["segment"]) for z in existing_zones
        if z.get("primary_code") == postal_code and z.get("segment", "").isdigit()
    ]
    next_segment = max(existing_segments, default=0) + 1

    zones = []
    seen_locations = set()  # Track unique locations by coordinates

    # Process each unique street location
    for street_name, locations in streets_by_name.items():
        # If same street appears multiple times, add context
        has_duplicates = len(locations) > 3  # More than 3 points means multiple distinct locations

        # Cluster locations that are close together
        clusters = []
        for loc in locations:
            loc_key = (round(loc["lat"], 4), round(loc["lng"], 4))

            if loc_key in seen_locations:
                continue
            seen_locations.add(loc_key)

            # Check if this location is near an existing cluster
            added_to_cluster = False
            for cluster in clusters:
                if calculate_distance(loc["lat"], loc["lng"], cluster["lat"], cluster["lng"]) < 100:
                    # Close to existing cluster, skip
                    added_to_cluster = True
                    break

            if not added_to_cluster:
                clusters.append(loc)

        # Create zones for each cluster
        for idx, loc in enumerate(clusters):
            # Generate context for duplicate streets
            context = ""
            if has_duplicates or len(clusters) > 1:
                # Try to find intersecting street
                intersecting = find_intersecting_street(loc["lat"], loc["lng"], streets, street_name)
                if intersecting:
                    context = f"near {intersecting}"
                else:
                    # Try to find nearby landmark
                    landmark = find_nearest_landmark(loc["lat"], loc["lng"], landmarks)
                    if landmark:
                        context = f"near {landmark}"
                    else:
                        # Use directional context based on position
                        mid_lat = (bounds["south"] + bounds["north"]) / 2
                        mid_lng = (bounds["west"] + bounds["east"]) / 2

                        ns = "North" if loc["lat"] > mid_lat else "South"
                        ew = "East" if loc["lng"] > mid_lng else "West"
                        context = f"{ns} {ew} Section"

            # Generate Plus Code
            plus_code = PlusCodeService.encode(loc["lat"], loc["lng"], code_length=11)

            # Create zone
            segment = f"{next_segment:03d}"
            zone_code = f"{postal_code}-{segment}"

            # Zone name includes context if there are duplicates
            zone_name = street_name if not context else f"{street_name} ({context})"

            zones.append({
                "zone_code": zone_code,
                "primary_code": postal_code,
                "segment": segment,
                "zone_name": zone_name,
                "street_name": street_name,
                "context": context,
                "center_lat": loc["lat"],
                "center_lng": loc["lng"],
                "plus_code": plus_code,
                "segment_type": determine_segment_type(loc["highway_type"], street_name),
                "osm_id": loc["osm_id"],
            })

            next_segment += 1

    # Also add unnamed but important roads
    for street in streets:
        if street["name"]:
            continue

        loc_key = (round(street["lat"], 4), round(street["lng"], 4))
        if loc_key in seen_locations:
            continue
        seen_locations.add(loc_key)

        # Only include primary/secondary/tertiary roads
        if street["highway_type"] not in ["primary", "secondary", "tertiary", "residential"]:
            continue

        plus_code = PlusCodeService.encode(street["lat"], street["lng"], code_length=11)
        segment = f"{next_segment:03d}"
        zone_code = f"{postal_code}-{segment}"

        # Generate name from highway type and nearby landmark
        landmark = find_nearest_landmark(street["lat"], street["lng"], landmarks)
        if landmark:
            zone_name = f"Road near {landmark}"
        else:
            zone_name = f"Unnamed {street['highway_type'].title()} Road"

        zones.append({
            "zone_code": zone_code,
            "primary_code": postal_code,
            "segment": segment,
            "zone_name": zone_name,
            "street_name": "",
            "context": f"near {landmark}" if landmark else "",
            "center_lat": street["lat"],
            "center_lng": street["lng"],
            "plus_code": plus_code,
            "segment_type": "residential",
            "osm_id": street["osm_id"],
        })

        next_segment += 1

    print(f"    Created {len(zones)} granular zones")
    return zones


def determine_segment_type(highway_type: str, street_name: str) -> str:
    """Determine segment type from highway type and street name."""
    name_lower = street_name.lower() if street_name else ""

    # Commercial indicators
    if any(x in name_lower for x in ["market", "trading", "commercial"]):
        return "commercial"

    # Main roads are typically commercial/mixed
    if highway_type in ["primary", "secondary", "trunk"]:
        return "commercial"

    # Residential indicators
    if highway_type in ["residential", "living_street"]:
        return "residential"

    if any(x in name_lower for x in ["drive", "lane", "close", "crescent"]):
        return "residential"

    return "mixed"


async def get_existing_zones(postal_code: str) -> List[Dict]:
    """Get existing zones for a postal code."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    zones = []
    async with async_session() as db:
        result = await db.execute(
            text("SELECT zone_code, primary_code, segment, zone_name FROM postal_zones WHERE primary_code = :pc"),
            {"pc": postal_code}
        )
        for row in result:
            zones.append({
                "zone_code": row[0],
                "primary_code": row[1],
                "segment": row[2],
                "zone_name": row[3],
            })

    await engine.dispose()
    return zones


async def save_zones_to_database(zones: List[Dict], district_name: str = "Western Area Urban", region_name: str = "Western Area"):
    """Save zones to database."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    imported = 0
    errors = 0

    async with async_session() as db:
        for zone in zones:
            try:
                # Create polygon geometry (small area around the point)
                size = 0.0005  # ~55m
                half = size / 2
                lat, lng = zone["center_lat"], zone["center_lng"]
                polygon_wkt = f"POLYGON(({lng-half} {lat-half}, {lng+half} {lat-half}, {lng+half} {lat+half}, {lng-half} {lat+half}, {lng-half} {lat-half}))"

                query = text("""
                    INSERT INTO postal_zones (
                        zone_code, primary_code, segment, zone_name,
                        region_code, region_name, district_code, district_name,
                        segment_type, geometry, address_sequence, created_at, updated_at
                    ) VALUES (
                        :zone_code, :primary_code, :segment, :zone_name,
                        1, :region_name, 1, :district_name,
                        :segment_type, ST_GeomFromText(:geometry, 4326), 0, NOW(), NOW()
                    )
                    ON CONFLICT (zone_code) DO UPDATE SET
                        zone_name = EXCLUDED.zone_name,
                        segment_type = EXCLUDED.segment_type,
                        geometry = EXCLUDED.geometry,
                        updated_at = NOW()
                """)

                await db.execute(query, {
                    "zone_code": zone["zone_code"],
                    "primary_code": zone["primary_code"],
                    "segment": zone["segment"],
                    "zone_name": zone["zone_name"],
                    "region_name": region_name,
                    "district_name": district_name,
                    "segment_type": zone["segment_type"],
                    "geometry": polygon_wkt,
                })

                imported += 1

                if imported % 100 == 0:
                    await db.commit()
                    print(f"    Saved {imported} zones...")

            except Exception as e:
                errors += 1
                print(f"    Error saving {zone['zone_code']}: {e}")

        await db.commit()

    await engine.dispose()
    return imported, errors


def save_to_json(zones: List[Dict], filename: str):
    """Save zones to JSON for backup."""
    output_dir = Path(__file__).parent.parent.parent / "data" / "freetown_streets"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated": datetime.now().isoformat(),
            "total_zones": len(zones),
            "zones": zones,
        }, f, indent=2, ensure_ascii=False)

    print(f"Saved to {output_path}")


async def main():
    """Main function."""
    print("=" * 70)
    print("DETAILED STREET-LEVEL SCRAPER FOR FREETOWN")
    print("=" * 70)
    print("\nThis creates precise postal zones for logistics with unique Plus Codes.")
    print("Example: Two 'Kallon Drive' in Lumley get different codes:")
    print("  - 1105-012: Kallon Drive (near Regent Road)")
    print("  - 1105-025: Kallon Drive (at Beach Road)")
    print()

    all_zones = []

    for postal_code, neighborhood_data in FREETOWN_NEIGHBORHOODS.items():
        # Get existing zones to avoid duplicates
        existing = await get_existing_zones(postal_code)

        # Process neighborhood
        zones = process_neighborhood(postal_code, neighborhood_data, existing)
        all_zones.extend(zones)

        time.sleep(3)  # Rate limiting between neighborhoods

    print("\n" + "=" * 70)
    print("SCRAPING COMPLETE")
    print("=" * 70)
    print(f"Total new zones created: {len(all_zones)}")

    # Show sample zones with duplicate handling
    print("\nSample zones (showing duplicate street handling):")
    seen_names = {}
    for zone in all_zones[:100]:
        name = zone.get("street_name", "")
        if name and name in seen_names:
            # Show both entries for duplicate streets
            print(f"  {seen_names[name]['zone_code']}: {seen_names[name]['zone_name']}")
            print(f"  {zone['zone_code']}: {zone['zone_name']}")
            print(f"    Plus Codes: {seen_names[name]['plus_code']} vs {zone['plus_code']}")
            print()
        elif name:
            seen_names[name] = zone

    # Save backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_to_json(all_zones, f"freetown_streets_{timestamp}.json")

    # Save to database
    print("\nSaving to database...")
    imported, errors = await save_zones_to_database(all_zones)

    print("\n" + "=" * 70)
    print("IMPORT COMPLETE")
    print("=" * 70)
    print(f"Successfully imported: {imported}")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    asyncio.run(main())
