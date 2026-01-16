"""
Granular Postal Zone Scraper for Sierra Leone.

This script creates a precision postal code system by:
1. Scraping ALL streets, neighborhoods, and areas from OpenStreetMap
2. Creating micro-zones (segments) within each postal code area
3. Generating Plus Codes for precise logistics and delivery

The zone structure:
- zone_code: XYZZ-NNN (e.g., 1100-001, 1100-002)
  - XYZZ = primary postal code (4 digits)
  - NNN = segment within that postal code (001-999)

Usage:
    python -m scripts.scrape_granular_zones

Requirements:
    - PostgreSQL with PostGIS extension
    - OSM data access via Overpass API
"""

import asyncio
import time
import math
import json
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass

import requests
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

from app.services.plus_code import PlusCodeService
from app.config import get_settings

settings = get_settings()

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Sierra Leone bounding box (south, west, north, east)
SL_BOUNDS = {
    "south": 6.85,
    "west": -13.5,
    "north": 10.0,
    "east": -10.25
}

# Grid cell size in degrees (approximately 100m x 100m at equator)
# For precise logistics, we use ~100m cells
GRID_CELL_SIZE = 0.001  # ~111 meters

# Region definitions with postal code prefixes
REGIONS = {
    1: {"name": "Western Area", "prefix": "1"},
    2: {"name": "Northern Province", "prefix": "2"},
    3: {"name": "North West Province", "prefix": "3"},
    4: {"name": "Southern Province", "prefix": "4"},
    5: {"name": "Eastern Province", "prefix": "5"},
}

# District definitions with their postal code ranges and center coordinates
DISTRICTS = {
    # Western Area
    "Western Area Urban": {
        "region": 1, "code": "11", "center": (8.4657, -13.2317),
        "bounds": {"south": 8.38, "north": 8.52, "west": -13.35, "east": -13.15}
    },
    "Western Area Rural": {
        "region": 1, "code": "10", "center": (8.35, -13.10),
        "bounds": {"south": 8.20, "north": 8.45, "west": -13.20, "east": -12.90}
    },
    # Northern Province
    "Bombali": {
        "region": 2, "code": "21", "center": (8.89, -12.05),
        "bounds": {"south": 8.70, "north": 9.30, "west": -12.40, "east": -11.60}
    },
    "Falaba": {
        "region": 2, "code": "22", "center": (9.25, -11.35),
        "bounds": {"south": 9.00, "north": 9.60, "west": -11.60, "east": -10.90}
    },
    "Koinadugu": {
        "region": 2, "code": "23", "center": (9.55, -11.55),
        "bounds": {"south": 9.30, "north": 9.90, "west": -11.80, "east": -11.20}
    },
    "Tonkolili": {
        "region": 2, "code": "24", "center": (8.72, -11.95),
        "bounds": {"south": 8.40, "north": 9.10, "west": -12.30, "east": -11.50}
    },
    "Karene": {
        "region": 2, "code": "25", "center": (9.10, -12.30),
        "bounds": {"south": 8.80, "north": 9.40, "west": -12.60, "east": -11.90}
    },
    # North West Province
    "Kambia": {
        "region": 3, "code": "31", "center": (9.12, -12.92),
        "bounds": {"south": 8.90, "north": 9.40, "west": -13.20, "east": -12.60}
    },
    "Port Loko": {
        "region": 3, "code": "32", "center": (8.77, -12.78),
        "bounds": {"south": 8.50, "north": 9.00, "west": -13.10, "east": -12.40}
    },
    # Southern Province
    "Bo": {
        "region": 4, "code": "41", "center": (7.96, -11.74),
        "bounds": {"south": 7.60, "north": 8.30, "west": -12.10, "east": -11.30}
    },
    "Bonthe": {
        "region": 4, "code": "42", "center": (7.53, -12.50),
        "bounds": {"south": 7.20, "north": 7.80, "west": -12.80, "east": -12.10}
    },
    "Moyamba": {
        "region": 4, "code": "43", "center": (8.16, -12.43),
        "bounds": {"south": 7.80, "north": 8.50, "west": -12.70, "east": -12.10}
    },
    "Pujehun": {
        "region": 4, "code": "44", "center": (7.35, -11.72),
        "bounds": {"south": 7.00, "north": 7.70, "west": -12.10, "east": -11.30}
    },
    # Eastern Province
    "Kailahun": {
        "region": 5, "code": "51", "center": (8.28, -10.57),
        "bounds": {"south": 7.90, "north": 8.70, "west": -10.90, "east": -10.20}
    },
    "Kenema": {
        "region": 5, "code": "52", "center": (7.88, -11.19),
        "bounds": {"south": 7.50, "north": 8.30, "west": -11.50, "east": -10.80}
    },
    "Kono": {
        "region": 5, "code": "53", "center": (8.64, -10.97),
        "bounds": {"south": 8.30, "north": 9.00, "west": -11.30, "east": -10.50}
    },
}

# Freetown detailed neighborhoods for granular zoning
FREETOWN_AREAS = {
    "1100": {
        "name": "Central Business District",
        "neighborhoods": [
            {"name": "Central Freetown CBD", "lat": 8.4790, "lng": -13.2300, "type": "commercial"},
            {"name": "Tower Hill", "lat": 8.4840, "lng": -13.2280, "type": "government"},
            {"name": "Siaka Stevens Street", "lat": 8.4800, "lng": -13.2250, "type": "commercial"},
            {"name": "Rawdon Street", "lat": 8.4785, "lng": -13.2320, "type": "commercial"},
            {"name": "Howe Street", "lat": 8.4775, "lng": -13.2290, "type": "commercial"},
            {"name": "Lightfoot Boston Street", "lat": 8.4760, "lng": -13.2310, "type": "commercial"},
            {"name": "Gloucester Street", "lat": 8.4830, "lng": -13.2260, "type": "commercial"},
            {"name": "Walpole Street", "lat": 8.4815, "lng": -13.2295, "type": "mixed"},
            {"name": "Charlotte Street", "lat": 8.4805, "lng": -13.2275, "type": "commercial"},
            {"name": "Pademba Road (Central)", "lat": 8.4795, "lng": -13.2340, "type": "commercial"},
        ]
    },
    "1101": {
        "name": "Cline Town & East End",
        "neighborhoods": [
            {"name": "Cline Town", "lat": 8.4780, "lng": -13.1980, "type": "mixed"},
            {"name": "East End", "lat": 8.4750, "lng": -13.2000, "type": "residential"},
            {"name": "Fourah Bay", "lat": 8.4720, "lng": -13.2050, "type": "mixed"},
            {"name": "Foulah Town", "lat": 8.4700, "lng": -13.2020, "type": "residential"},
            {"name": "Magazine Cut", "lat": 8.4740, "lng": -13.2030, "type": "residential"},
            {"name": "Mamba Ridge", "lat": 8.4760, "lng": -13.1950, "type": "residential"},
            {"name": "Grassfield", "lat": 8.4680, "lng": -13.2070, "type": "residential"},
            {"name": "Susan's Bay", "lat": 8.4850, "lng": -13.2100, "type": "residential"},
            {"name": "Kroo Bay", "lat": 8.4860, "lng": -13.2150, "type": "residential"},
        ]
    },
    "1102": {
        "name": "Congo Town & Central II",
        "neighborhoods": [
            {"name": "Congo Town", "lat": 8.4920, "lng": -13.2120, "type": "residential"},
            {"name": "Foulah Town", "lat": 8.4880, "lng": -13.2100, "type": "residential"},
            {"name": "Murray Town", "lat": 8.4850, "lng": -13.2420, "type": "residential"},
            {"name": "Soldier Street", "lat": 8.4900, "lng": -13.2180, "type": "residential"},
            {"name": "Back Street", "lat": 8.4870, "lng": -13.2150, "type": "residential"},
            {"name": "Sanders Street", "lat": 8.4910, "lng": -13.2090, "type": "residential"},
            {"name": "Thunder Hill", "lat": 8.4940, "lng": -13.2060, "type": "residential"},
        ]
    },
    "1103": {
        "name": "Brookfields & New England",
        "neighborhoods": [
            {"name": "Brookfields", "lat": 8.4650, "lng": -13.2480, "type": "residential"},
            {"name": "New England", "lat": 8.4600, "lng": -13.2450, "type": "residential"},
            {"name": "Tengbeh Town", "lat": 8.4680, "lng": -13.2400, "type": "residential"},
            {"name": "Allen Town Road", "lat": 8.4620, "lng": -13.2420, "type": "mixed"},
            {"name": "Berry Street", "lat": 8.4670, "lng": -13.2440, "type": "residential"},
            {"name": "Main Motor Road (Brookfields)", "lat": 8.4640, "lng": -13.2500, "type": "commercial"},
            {"name": "Campbell Street", "lat": 8.4630, "lng": -13.2460, "type": "residential"},
        ]
    },
    "1104": {
        "name": "Hill Station & Wilberforce",
        "neighborhoods": [
            {"name": "Hill Station", "lat": 8.4480, "lng": -13.2700, "type": "residential"},
            {"name": "Wilberforce", "lat": 8.4520, "lng": -13.2650, "type": "residential"},
            {"name": "Signal Hill", "lat": 8.4550, "lng": -13.2580, "type": "residential"},
            {"name": "Leicester", "lat": 8.4400, "lng": -13.2600, "type": "residential"},
            {"name": "Regent", "lat": 8.4350, "lng": -13.2500, "type": "residential"},
            {"name": "Gloucester", "lat": 8.4450, "lng": -13.2750, "type": "residential"},
            {"name": "Charlotte", "lat": 8.4380, "lng": -13.2650, "type": "residential"},
            {"name": "Bathurst", "lat": 8.4420, "lng": -13.2720, "type": "residential"},
        ]
    },
    "1105": {
        "name": "Lumley & Aberdeen",
        "neighborhoods": [
            {"name": "Lumley", "lat": 8.4280, "lng": -13.2920, "type": "mixed"},
            {"name": "Aberdeen", "lat": 8.4500, "lng": -13.2850, "type": "mixed"},
            {"name": "Cockle Bay", "lat": 8.4400, "lng": -13.2800, "type": "residential"},
            {"name": "Cape Sierra", "lat": 8.4150, "lng": -13.2950, "type": "residential"},
            {"name": "Lumley Beach Road", "lat": 8.4220, "lng": -13.2880, "type": "commercial"},
            {"name": "Spur Road", "lat": 8.4580, "lng": -13.2750, "type": "commercial"},
            {"name": "Wilkinson Road", "lat": 8.4550, "lng": -13.2700, "type": "commercial"},
            {"name": "Main Motor Road (Lumley)", "lat": 8.4350, "lng": -13.2850, "type": "commercial"},
            {"name": "Mammy Yoko Street", "lat": 8.4300, "lng": -13.2900, "type": "mixed"},
        ]
    },
    "1106": {
        "name": "Goderich & Surrounds",
        "neighborhoods": [
            {"name": "Goderich", "lat": 8.4050, "lng": -13.3220, "type": "residential"},
            {"name": "Juba", "lat": 8.4200, "lng": -13.3100, "type": "residential"},
            {"name": "Lakka", "lat": 8.3900, "lng": -13.3350, "type": "residential"},
            {"name": "Hamilton", "lat": 8.3850, "lng": -13.3400, "type": "residential"},
            {"name": "Sussex", "lat": 8.3800, "lng": -13.3450, "type": "residential"},
            {"name": "Tokeh", "lat": 8.3700, "lng": -13.3500, "type": "residential"},
            {"name": "Kent", "lat": 8.3600, "lng": -13.3600, "type": "residential"},
            {"name": "York", "lat": 8.3500, "lng": -13.3200, "type": "residential"},
        ]
    },
    "1107": {
        "name": "Kissy Area",
        "neighborhoods": [
            {"name": "Kissy", "lat": 8.4880, "lng": -13.1850, "type": "residential"},
            {"name": "Kissy Brook", "lat": 8.4850, "lng": -13.1800, "type": "residential"},
            {"name": "Kissy Mess Mess", "lat": 8.4820, "lng": -13.1750, "type": "residential"},
            {"name": "Kissy Road", "lat": 8.4900, "lng": -13.1900, "type": "commercial"},
            {"name": "Kissy Shell", "lat": 8.4870, "lng": -13.1820, "type": "residential"},
            {"name": "Kissy Dockyards", "lat": 8.4950, "lng": -13.1780, "type": "industrial"},
            {"name": "Ferry Junction", "lat": 8.4920, "lng": -13.1700, "type": "mixed"},
        ]
    },
    "1108": {
        "name": "Wellington & Portee",
        "neighborhoods": [
            {"name": "Wellington", "lat": 8.4900, "lng": -13.1650, "type": "residential"},
            {"name": "Portee", "lat": 8.4800, "lng": -13.1600, "type": "residential"},
            {"name": "Shell Compound", "lat": 8.4850, "lng": -13.1680, "type": "residential"},
            {"name": "New Site", "lat": 8.4750, "lng": -13.1550, "type": "residential"},
            {"name": "Old Wharf", "lat": 8.4950, "lng": -13.1620, "type": "mixed"},
            {"name": "Rogbangba", "lat": 8.4700, "lng": -13.1580, "type": "residential"},
        ]
    },
    "1109": {
        "name": "Calaba Town & Allen Town",
        "neighborhoods": [
            {"name": "Calaba Town", "lat": 8.4650, "lng": -13.1500, "type": "residential"},
            {"name": "Allen Town", "lat": 8.4550, "lng": -13.1450, "type": "residential"},
            {"name": "Grafton", "lat": 8.4450, "lng": -13.1400, "type": "residential"},
            {"name": "Hastings", "lat": 8.4350, "lng": -13.1300, "type": "mixed"},
            {"name": "Jui", "lat": 8.4200, "lng": -13.1200, "type": "residential"},
            {"name": "Regent Road", "lat": 8.4600, "lng": -13.1480, "type": "residential"},
        ]
    },
    "1110": {
        "name": "Kingtom & Kroo Town",
        "neighborhoods": [
            {"name": "Kingtom", "lat": 8.4900, "lng": -13.2350, "type": "mixed"},
            {"name": "Kroo Town", "lat": 8.4950, "lng": -13.2400, "type": "residential"},
            {"name": "Cemetery", "lat": 8.4920, "lng": -13.2320, "type": "mixed"},
            {"name": "King Jimmy", "lat": 8.4980, "lng": -13.2300, "type": "mixed"},
            {"name": "Government Wharf", "lat": 8.5000, "lng": -13.2350, "type": "commercial"},
            {"name": "Queen Elizabeth II Quay", "lat": 8.5020, "lng": -13.2280, "type": "commercial"},
        ]
    },
}

# Western Area Rural zones
WESTERN_RURAL_AREAS = {
    "1000": {
        "name": "Waterloo",
        "neighborhoods": [
            {"name": "Waterloo Town", "lat": 8.3320, "lng": -13.0620, "type": "mixed"},
            {"name": "Waterloo Market", "lat": 8.3350, "lng": -13.0650, "type": "commercial"},
            {"name": "Tombo Junction", "lat": 8.3280, "lng": -13.0580, "type": "mixed"},
            {"name": "Newton", "lat": 8.3400, "lng": -13.0700, "type": "residential"},
            {"name": "Kossoh Town", "lat": 8.3200, "lng": -13.0550, "type": "residential"},
            {"name": "Benguema", "lat": 8.3100, "lng": -13.0500, "type": "residential"},
        ]
    },
    "1001": {
        "name": "Tombo & Coastal",
        "neighborhoods": [
            {"name": "Tombo", "lat": 8.2800, "lng": -13.0800, "type": "fishing"},
            {"name": "Black Johnson", "lat": 8.2650, "lng": -13.1000, "type": "residential"},
            {"name": "Banana Island", "lat": 8.0800, "lng": -13.0500, "type": "mixed"},
            {"name": "Ricketts Island", "lat": 8.1000, "lng": -13.0400, "type": "residential"},
        ]
    },
    "1002": {
        "name": "Mountain Rural",
        "neighborhoods": [
            {"name": "Leicester Peak", "lat": 8.4300, "lng": -13.2300, "type": "residential"},
            {"name": "Sugar Loaf", "lat": 8.4250, "lng": -13.2400, "type": "residential"},
            {"name": "Picket Hill", "lat": 8.4200, "lng": -13.2350, "type": "residential"},
        ]
    },
}

@dataclass
class GranularZone:
    """Represents a granular postal zone."""
    zone_code: str           # e.g., "1100-001"
    primary_code: str        # e.g., "1100"
    segment: str             # e.g., "001"
    zone_name: str           # e.g., "Tower Hill"
    region_code: int         # e.g., 1
    region_name: str         # e.g., "Western Area"
    district_code: int       # e.g., 1
    district_name: str       # e.g., "Western Area Urban"
    segment_type: str        # e.g., "commercial", "residential"
    center_lat: float
    center_lng: float
    plus_code: str           # Google Plus Code
    geometry: Optional[str] = None  # WKT polygon


def fetch_osm_streets(bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Fetch all named streets from OSM using Overpass API."""
    query = f"""
    [out:json][timeout:300];
    (
      way["highway"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
    );
    out center tags;
    """

    try:
        print(f"  Fetching streets from OSM...")
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=350)
        response.raise_for_status()
        data = response.json()
        streets = []

        for element in data.get("elements", []):
            if element.get("center"):
                streets.append({
                    "osm_id": element["id"],
                    "name": element.get("tags", {}).get("name", "Unknown"),
                    "highway_type": element.get("tags", {}).get("highway", "road"),
                    "lat": element["center"]["lat"],
                    "lng": element["center"]["lon"],
                })

        print(f"    Found {len(streets)} named streets")
        return streets
    except Exception as e:
        print(f"    Error fetching streets: {e}")
        return []


def fetch_osm_places(bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Fetch all named places (neighborhoods, villages, etc.) from OSM."""
    query = f"""
    [out:json][timeout:300];
    (
      node["place"~"suburb|neighbourhood|village|hamlet|town|locality"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      way["landuse"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      node["name"]["addr:street"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
    );
    out center tags;
    """

    try:
        print(f"  Fetching places and neighborhoods from OSM...")
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=350)
        response.raise_for_status()
        data = response.json()
        places = []

        for element in data.get("elements", []):
            lat = element.get("lat") or element.get("center", {}).get("lat")
            lng = element.get("lon") or element.get("center", {}).get("lon")

            if lat and lng:
                places.append({
                    "osm_id": element["id"],
                    "name": element.get("tags", {}).get("name", "Unknown"),
                    "place_type": element.get("tags", {}).get("place", "area"),
                    "lat": lat,
                    "lng": lng,
                })

        print(f"    Found {len(places)} named places")
        return places
    except Exception as e:
        print(f"    Error fetching places: {e}")
        return []


def fetch_osm_buildings(bounds: Dict[str, float]) -> List[Dict[str, Any]]:
    """Fetch named buildings and POIs from OSM."""
    query = f"""
    [out:json][timeout:300];
    (
      way["building"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      node["building"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      node["amenity"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
      way["amenity"]["name"]({bounds['south']},{bounds['west']},{bounds['north']},{bounds['east']});
    );
    out center tags;
    """

    try:
        print(f"  Fetching named buildings and amenities from OSM...")
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=350)
        response.raise_for_status()
        data = response.json()
        buildings = []

        for element in data.get("elements", []):
            lat = element.get("lat") or element.get("center", {}).get("lat")
            lng = element.get("lon") or element.get("center", {}).get("lon")

            if lat and lng:
                tags = element.get("tags", {})
                buildings.append({
                    "osm_id": element["id"],
                    "name": tags.get("name", "Unknown"),
                    "building_type": tags.get("building", tags.get("amenity", "building")),
                    "lat": lat,
                    "lng": lng,
                })

        print(f"    Found {len(buildings)} named buildings/amenities")
        return buildings
    except Exception as e:
        print(f"    Error fetching buildings: {e}")
        return []


def determine_segment_type(name: str, building_type: str = "") -> str:
    """Determine segment type from name and type."""
    name_lower = name.lower()
    building_lower = building_type.lower()

    # Commercial indicators
    commercial = ["market", "shop", "store", "mall", "bank", "hotel", "restaurant",
                  "street", "road commercial", "business", "trading"]
    if any(c in name_lower or c in building_lower for c in commercial):
        return "commercial"

    # Government indicators
    government = ["government", "ministry", "court", "police", "parliament",
                  "embassy", "state house", "city hall", "municipal"]
    if any(g in name_lower or g in building_lower for g in government):
        return "government"

    # Industrial indicators
    industrial = ["factory", "industrial", "warehouse", "port", "dock", "wharf"]
    if any(i in name_lower or i in building_lower for i in industrial):
        return "industrial"

    # Default to residential/mixed
    if "hospital" in name_lower or "school" in name_lower:
        return "mixed"

    return "residential"


def create_granular_zones_from_predefined() -> List[GranularZone]:
    """Create granular zones from predefined neighborhood data."""
    zones = []

    # Process Freetown areas
    for primary_code, area_data in FREETOWN_AREAS.items():
        region_code = 1
        district_code = 1
        region_name = "Western Area"
        district_name = "Western Area Urban"

        for idx, neighborhood in enumerate(area_data["neighborhoods"], start=1):
            segment = f"{idx:03d}"
            zone_code = f"{primary_code}-{segment}"

            # Generate Plus Code
            plus_code = PlusCodeService.encode(
                neighborhood["lat"],
                neighborhood["lng"],
                code_length=11
            )

            zone = GranularZone(
                zone_code=zone_code,
                primary_code=primary_code,
                segment=segment,
                zone_name=neighborhood["name"],
                region_code=region_code,
                region_name=region_name,
                district_code=district_code,
                district_name=district_name,
                segment_type=neighborhood["type"],
                center_lat=neighborhood["lat"],
                center_lng=neighborhood["lng"],
                plus_code=plus_code,
            )
            zones.append(zone)

    # Process Western Area Rural
    for primary_code, area_data in WESTERN_RURAL_AREAS.items():
        region_code = 1
        district_code = 0
        region_name = "Western Area"
        district_name = "Western Area Rural"

        for idx, neighborhood in enumerate(area_data["neighborhoods"], start=1):
            segment = f"{idx:03d}"
            zone_code = f"{primary_code}-{segment}"

            plus_code = PlusCodeService.encode(
                neighborhood["lat"],
                neighborhood["lng"],
                code_length=11
            )

            zone = GranularZone(
                zone_code=zone_code,
                primary_code=primary_code,
                segment=segment,
                zone_name=neighborhood["name"],
                region_code=region_code,
                region_name=region_name,
                district_code=district_code,
                district_name=district_name,
                segment_type=neighborhood["type"],
                center_lat=neighborhood["lat"],
                center_lng=neighborhood["lng"],
                plus_code=plus_code,
            )
            zones.append(zone)

    return zones


def create_zones_from_osm_data(
    streets: List[Dict],
    places: List[Dict],
    buildings: List[Dict],
    district_name: str,
    district_info: Dict
) -> List[GranularZone]:
    """Create granular zones from OSM data."""
    zones = []
    seen_locations = set()

    region_code = district_info["region"]
    region_name = REGIONS[region_code]["name"]
    primary_code_base = district_info["code"]
    district_code = int(primary_code_base[1]) if len(primary_code_base) > 1 else 0

    # Combine all OSM data
    all_items = []

    for street in streets:
        all_items.append({
            "name": street["name"],
            "lat": street["lat"],
            "lng": street["lng"],
            "type": determine_segment_type(street["name"], street.get("highway_type", "")),
            "source": "street"
        })

    for place in places:
        all_items.append({
            "name": place["name"],
            "lat": place["lat"],
            "lng": place["lng"],
            "type": determine_segment_type(place["name"], place.get("place_type", "")),
            "source": "place"
        })

    for building in buildings:
        all_items.append({
            "name": building["name"],
            "lat": building["lat"],
            "lng": building["lng"],
            "type": determine_segment_type(building["name"], building.get("building_type", "")),
            "source": "building"
        })

    # Group items by their primary postal code area
    # Use the first two digits for postal code, then sequence for segment
    segment_counter = {}

    for item in all_items:
        # Create a unique key based on location (rounded to ~50m precision)
        loc_key = f"{item['lat']:.4f},{item['lng']:.4f}"
        if loc_key in seen_locations:
            continue
        seen_locations.add(loc_key)

        # Determine primary code based on sub-area within district
        # For simplicity, use district code + area suffix
        sub_area = determine_sub_area(item["lat"], item["lng"], district_info)
        primary_code = f"{primary_code_base}{sub_area:02d}"

        # Get next segment number for this primary code
        if primary_code not in segment_counter:
            segment_counter[primary_code] = 1
        else:
            segment_counter[primary_code] += 1

        segment = f"{segment_counter[primary_code]:03d}"
        zone_code = f"{primary_code}-{segment}"

        # Generate Plus Code
        plus_code = PlusCodeService.encode(item["lat"], item["lng"], code_length=11)

        zone = GranularZone(
            zone_code=zone_code,
            primary_code=primary_code,
            segment=segment,
            zone_name=item["name"],
            region_code=region_code,
            region_name=region_name,
            district_code=district_code,
            district_name=district_name,
            segment_type=item["type"],
            center_lat=item["lat"],
            center_lng=item["lng"],
            plus_code=plus_code,
        )
        zones.append(zone)

    return zones


def determine_sub_area(lat: float, lng: float, district_info: Dict) -> int:
    """Determine the sub-area code (00-99) within a district based on location."""
    bounds = district_info["bounds"]

    # Calculate relative position within district bounds
    lat_range = bounds["north"] - bounds["south"]
    lng_range = bounds["east"] - bounds["west"]

    if lat_range <= 0 or lng_range <= 0:
        return 0

    # Normalize to 0-1 range
    lat_norm = (lat - bounds["south"]) / lat_range
    lng_norm = (lng - bounds["west"]) / lng_range

    # Clamp to valid range
    lat_norm = max(0, min(1, lat_norm))
    lng_norm = max(0, min(1, lng_norm))

    # Create 10x10 grid (100 sub-areas)
    lat_idx = int(lat_norm * 9.99)  # 0-9
    lng_idx = int(lng_norm * 9.99)  # 0-9

    return lat_idx * 10 + lng_idx


def create_zone_polygon(lat: float, lng: float, size: float = 0.002) -> str:
    """Create a WKT polygon for a zone (approximately 200m x 200m)."""
    half = size / 2
    return f"""POLYGON(({lng-half} {lat-half}, {lng+half} {lat-half}, {lng+half} {lat+half}, {lng-half} {lat+half}, {lng-half} {lat-half}))"""


async def save_zones_to_database(zones: List[GranularZone]):
    """Save granular zones to the database."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\nSaving {len(zones)} granular zones to database...")

    imported = 0
    errors = 0

    async with async_session() as db:
        for zone in zones:
            try:
                # Create polygon geometry
                polygon_wkt = create_zone_polygon(zone.center_lat, zone.center_lng)

                # Insert or update postal zone
                query = text("""
                    INSERT INTO postal_zones (
                        zone_code, primary_code, segment, zone_name,
                        region_code, region_name, district_code, district_name,
                        segment_type, geometry, address_sequence, created_at, updated_at
                    ) VALUES (
                        :zone_code, :primary_code, :segment, :zone_name,
                        :region_code, :region_name, :district_code, :district_name,
                        :segment_type, ST_GeomFromText(:geometry, 4326), 0, NOW(), NOW()
                    )
                    ON CONFLICT (zone_code) DO UPDATE SET
                        zone_name = EXCLUDED.zone_name,
                        segment_type = EXCLUDED.segment_type,
                        geometry = EXCLUDED.geometry,
                        updated_at = NOW()
                """)

                await db.execute(query, {
                    "zone_code": zone.zone_code,
                    "primary_code": zone.primary_code,
                    "segment": zone.segment,
                    "zone_name": zone.zone_name,
                    "region_code": zone.region_code,
                    "region_name": zone.region_name,
                    "district_code": zone.district_code,
                    "district_name": zone.district_name,
                    "segment_type": zone.segment_type,
                    "geometry": polygon_wkt,
                })

                imported += 1

                if imported % 50 == 0:
                    await db.commit()
                    print(f"  Imported {imported}/{len(zones)} zones...")

            except Exception as e:
                errors += 1
                print(f"  Error importing zone {zone.zone_code}: {e}")

        await db.commit()

    await engine.dispose()
    return imported, errors


def save_zones_to_json(zones: List[GranularZone], filename: str):
    """Save zones to JSON file for backup."""
    output_dir = Path(__file__).parent.parent.parent / "data" / "granular_zones"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename

    data = {
        "generated": datetime.now().isoformat(),
        "total_zones": len(zones),
        "zones": [
            {
                "zone_code": z.zone_code,
                "primary_code": z.primary_code,
                "segment": z.segment,
                "zone_name": z.zone_name,
                "region_code": z.region_code,
                "region_name": z.region_name,
                "district_code": z.district_code,
                "district_name": z.district_name,
                "segment_type": z.segment_type,
                "center_lat": z.center_lat,
                "center_lng": z.center_lng,
                "plus_code": z.plus_code,
            }
            for z in zones
        ]
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved zones to {output_path}")


async def main():
    """Main function to scrape and create granular postal zones."""
    print("=" * 70)
    print("GRANULAR POSTAL ZONE SCRAPER FOR SIERRA LEONE")
    print("=" * 70)
    print("\nThis script creates precision postal zones for logistics and delivery.")
    print("Zone format: XYZZ-NNN (e.g., 1100-001 for Tower Hill segment 1)")
    print()

    all_zones = []

    # Step 1: Create zones from predefined data (Freetown detailed areas)
    print("\n[STEP 1] Creating zones from predefined Freetown data...")
    predefined_zones = create_granular_zones_from_predefined()
    all_zones.extend(predefined_zones)
    print(f"  Created {len(predefined_zones)} predefined zones for Freetown")

    # Step 2: Fetch and process OSM data for other districts
    print("\n[STEP 2] Fetching OSM data for other districts...")

    for district_name, district_info in DISTRICTS.items():
        # Skip Western Area Urban (already handled with predefined data)
        if district_name == "Western Area Urban":
            continue
        if district_name == "Western Area Rural":
            continue  # Also handled with predefined

        print(f"\n  Processing {district_name}...")
        bounds = district_info["bounds"]

        # Fetch OSM data
        streets = fetch_osm_streets(bounds)
        time.sleep(2)  # Rate limiting

        places = fetch_osm_places(bounds)
        time.sleep(2)

        buildings = fetch_osm_buildings(bounds)
        time.sleep(2)

        # Create zones from OSM data
        osm_zones = create_zones_from_osm_data(
            streets, places, buildings,
            district_name, district_info
        )

        all_zones.extend(osm_zones)
        print(f"    Created {len(osm_zones)} zones from OSM data")

    # Step 3: Summary
    print("\n" + "=" * 70)
    print("ZONE CREATION SUMMARY")
    print("=" * 70)
    print(f"Total granular zones created: {len(all_zones)}")

    # Breakdown by district
    district_counts = {}
    for zone in all_zones:
        d = zone.district_name
        district_counts[d] = district_counts.get(d, 0) + 1

    print("\nBreakdown by district:")
    for district, count in sorted(district_counts.items(), key=lambda x: -x[1]):
        print(f"  {district}: {count} zones")

    # Breakdown by type
    type_counts = {}
    for zone in all_zones:
        t = zone.segment_type
        type_counts[t] = type_counts.get(t, 0) + 1

    print("\nBreakdown by zone type:")
    for ztype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {ztype}: {count}")

    # Step 4: Save to JSON backup
    print("\n[STEP 3] Saving backup to JSON...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_zones_to_json(all_zones, f"granular_zones_{timestamp}.json")

    # Step 5: Save to database
    print("\n[STEP 4] Saving to database...")
    imported, errors = await save_zones_to_database(all_zones)

    print("\n" + "=" * 70)
    print("IMPORT COMPLETE")
    print("=" * 70)
    print(f"Successfully imported: {imported} zones")
    print(f"Errors: {errors}")
    print("\nSample zone codes created:")

    # Show sample zones
    for zone in all_zones[:10]:
        print(f"  {zone.zone_code}: {zone.zone_name} ({zone.plus_code})")

    if len(all_zones) > 10:
        print(f"  ... and {len(all_zones) - 10} more")


if __name__ == "__main__":
    asyncio.run(main())
