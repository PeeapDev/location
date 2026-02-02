"""
Freetown Street Address Generator
=================================
Fetches street data from OpenStreetMap Overpass API for Freetown,
assigns postal codes based on postal zone boundaries, and generates
a comprehensive street address directory.

Western Area Urban (Freetown) bounds:
- minlat: 8.3737474, maxlat: 8.4996239
- minlon: -13.2985056, maxlon: -13.1746057
"""

import json
import csv
import os
import urllib.request
import urllib.parse
from typing import List, Dict, Tuple, Optional
from datetime import datetime

# Freetown bounding box (Western Area Urban)
FREETOWN_BBOX = {
    "south": 8.37,
    "west": -13.30,
    "north": 8.52,
    "east": -13.12
}

# Freetown postal zones with their approximate boundaries
FREETOWN_ZONES = [
    {"zone_code": "1100-001", "postal_code": "1100", "zone_name": "Central Freetown CBD", "centroid": (-13.2283, 8.4787)},
    {"zone_code": "1100-002", "postal_code": "1100", "zone_name": "Tower Hill", "centroid": (-13.229, 8.4818)},
    {"zone_code": "1100-003", "postal_code": "1100", "zone_name": "Siaka Stevens Street", "centroid": (-13.226, 8.477)},
    {"zone_code": "1101-001", "postal_code": "1101", "zone_name": "Cline Town", "centroid": (-13.1987, 8.4774)},
    {"zone_code": "1101-002", "postal_code": "1101", "zone_name": "East End", "centroid": (-13.195, 8.4842)},
    {"zone_code": "1101-003", "postal_code": "1101", "zone_name": "Fourah Bay", "centroid": (-13.205, 8.4886)},
    {"zone_code": "1102-001", "postal_code": "1102", "zone_name": "Congo Town", "centroid": (-13.212, 8.4912)},
    {"zone_code": "1102-002", "postal_code": "1102", "zone_name": "Foulah Town", "centroid": (-13.221, 8.4868)},
    {"zone_code": "1102-003", "postal_code": "1102", "zone_name": "Murray Town", "centroid": (-13.266, 8.4676)},
    {"zone_code": "1103-001", "postal_code": "1103", "zone_name": "Brookfields", "centroid": (-13.246, 8.46)},
    {"zone_code": "1103-002", "postal_code": "1103", "zone_name": "New England", "centroid": (-13.2402, 8.4676)},
    {"zone_code": "1103-003", "postal_code": "1103", "zone_name": "Tengbeh Town", "centroid": (-13.2434, 8.4776)},
    {"zone_code": "1104-001", "postal_code": "1104", "zone_name": "Hill Station", "centroid": (-13.2644, 8.4536)},
    {"zone_code": "1104-002", "postal_code": "1104", "zone_name": "Wilberforce", "centroid": (-13.2706, 8.4416)},
    {"zone_code": "1104-003", "postal_code": "1104", "zone_name": "Signal Hill", "centroid": (-13.278, 8.437)},
    {"zone_code": "1105-001", "postal_code": "1105", "zone_name": "Lumley", "centroid": (-13.286, 8.4316)},
    {"zone_code": "1105-002", "postal_code": "1105", "zone_name": "Aberdeen", "centroid": (-13.2934, 8.4184)},
    {"zone_code": "1105-003", "postal_code": "1105", "zone_name": "Cockle Bay", "centroid": (-13.308, 8.4112)},
    {"zone_code": "1106-001", "postal_code": "1106", "zone_name": "Goderich", "centroid": (-13.318, 8.4058)},
    {"zone_code": "1106-002", "postal_code": "1106", "zone_name": "Juba", "centroid": (-13.302, 8.4446)},
    {"zone_code": "1106-003", "postal_code": "1106", "zone_name": "Lakka", "centroid": (-13.328, 8.3884)},
    {"zone_code": "1107-001", "postal_code": "1107", "zone_name": "Kissy", "centroid": (-13.183, 8.487)},
    {"zone_code": "1107-002", "postal_code": "1107", "zone_name": "Kissy Brook", "centroid": (-13.179, 8.472)},
    {"zone_code": "1107-003", "postal_code": "1107", "zone_name": "Kissy Mess Mess", "centroid": (-13.1734, 8.4554)},
    {"zone_code": "1108-001", "postal_code": "1108", "zone_name": "Wellington", "centroid": (-13.1626, 8.487)},
    {"zone_code": "1108-002", "postal_code": "1108", "zone_name": "Portee", "centroid": (-13.1556, 8.4916)},
    {"zone_code": "1109-001", "postal_code": "1109", "zone_name": "Calaba Town", "centroid": (-13.1452, 8.4994)},
    {"zone_code": "1109-002", "postal_code": "1109", "zone_name": "Allen Town", "centroid": (-13.1348, 8.5042)},
    {"zone_code": "1110-001", "postal_code": "1110", "zone_name": "Kingtom", "centroid": (-13.256, 8.48)},
    {"zone_code": "1110-002", "postal_code": "1110", "zone_name": "Kroo Town", "centroid": (-13.207, 8.4976)},
]


def fetch_overpass_data(query: str) -> dict:
    """Fetch data from Overpass API."""
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")

    req = urllib.request.Request(url, data=data)
    req.add_header("User-Agent", "FreetownPostalSystem/1.0")

    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def get_freetown_streets() -> List[dict]:
    """Fetch all named streets in Freetown from OSM."""
    bbox = FREETOWN_BBOX

    query = f"""
    [out:json][timeout:180];
    (
      way["highway"]["name"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
    );
    out body;
    >;
    out skel qt;
    """

    print("Fetching streets from Overpass API...")
    data = fetch_overpass_data(query)

    # Process ways and nodes
    nodes = {}
    streets = []

    for element in data.get("elements", []):
        if element["type"] == "node":
            nodes[element["id"]] = (element["lon"], element["lat"])
        elif element["type"] == "way":
            tags = element.get("tags", {})
            name = tags.get("name", "")
            if name:
                # Calculate centroid from way nodes
                way_nodes = element.get("nodes", [])
                coords = [nodes.get(n) for n in way_nodes if n in nodes]
                if coords:
                    avg_lon = sum(c[0] for c in coords) / len(coords)
                    avg_lat = sum(c[1] for c in coords) / len(coords)

                    streets.append({
                        "osm_id": element["id"],
                        "name": name,
                        "highway_type": tags.get("highway", ""),
                        "lon": avg_lon,
                        "lat": avg_lat,
                        "surface": tags.get("surface", ""),
                        "lanes": tags.get("lanes", ""),
                        "oneway": tags.get("oneway", ""),
                        "ref": tags.get("ref", ""),
                    })

    return streets


def calculate_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate simple Euclidean distance (for nearby points, this is sufficient)."""
    return ((lon1 - lon2) ** 2 + (lat1 - lat2) ** 2) ** 0.5


def assign_postal_zone(lon: float, lat: float) -> dict:
    """Find the nearest postal zone for a given coordinate."""
    nearest_zone = None
    min_distance = float("inf")

    for zone in FREETOWN_ZONES:
        zone_lon, zone_lat = zone["centroid"]
        distance = calculate_distance(lon, lat, zone_lon, zone_lat)
        if distance < min_distance:
            min_distance = distance
            nearest_zone = zone

    return nearest_zone


def generate_street_directory(streets: List[dict]) -> List[dict]:
    """Generate street directory with postal codes assigned."""
    directory = []

    for street in streets:
        zone = assign_postal_zone(street["lon"], street["lat"])

        entry = {
            "street_name": street["name"],
            "postal_code": zone["postal_code"] if zone else "",
            "zone_code": zone["zone_code"] if zone else "",
            "zone_name": zone["zone_name"] if zone else "",
            "highway_type": street["highway_type"],
            "latitude": round(street["lat"], 6),
            "longitude": round(street["lon"], 6),
            "osm_id": street["osm_id"],
            "surface": street["surface"],
            "lanes": street["lanes"],
            "oneway": street["oneway"],
            "ref": street["ref"],
            "full_address": f"{street['name']}, {zone['zone_name'] if zone else 'Freetown'}, {zone['postal_code'] if zone else '1100'}, Sierra Leone"
        }
        directory.append(entry)

    # Sort by postal code, then street name
    directory.sort(key=lambda x: (x["postal_code"], x["street_name"]))

    return directory


def export_csv(directory: List[dict], output_file: str):
    """Export street directory to CSV."""
    if not directory:
        return

    fieldnames = [
        "street_name", "postal_code", "zone_code", "zone_name",
        "highway_type", "latitude", "longitude", "full_address",
        "surface", "lanes", "oneway", "ref", "osm_id"
    ]

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(directory)

    print(f"Exported {len(directory)} streets to {output_file}")


def export_json(directory: List[dict], output_file: str):
    """Export street directory to JSON."""
    output = {
        "name": "Freetown Street Address Directory",
        "city": "Freetown",
        "district": "Western Area Urban",
        "country": "Sierra Leone",
        "generated": datetime.now().isoformat(),
        "total_streets": len(directory),
        "streets": directory
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(directory)} streets to {output_file}")


def export_geojson(directory: List[dict], output_file: str):
    """Export street directory as GeoJSON points."""
    features = []

    for street in directory:
        feature = {
            "type": "Feature",
            "properties": {
                "STREET": street["street_name"],
                "POST_CODE": street["postal_code"],
                "ZONE_CODE": street["zone_code"],
                "ZONE_NAME": street["zone_name"],
                "HIGHWAY": street["highway_type"],
                "ADDRESS": street["full_address"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [street["longitude"], street["latitude"]]
            }
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "name": "Freetown_Streets",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": features
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    print(f"Exported {len(features)} street points to {output_file}")


def generate_summary(directory: List[dict]) -> dict:
    """Generate summary statistics."""
    postal_codes = {}
    zones = {}
    highway_types = {}

    for street in directory:
        pc = street["postal_code"]
        postal_codes[pc] = postal_codes.get(pc, 0) + 1

        zn = street["zone_name"]
        zones[zn] = zones.get(zn, 0) + 1

        ht = street["highway_type"]
        highway_types[ht] = highway_types.get(ht, 0) + 1

    return {
        "total_streets": len(directory),
        "by_postal_code": dict(sorted(postal_codes.items())),
        "by_zone": dict(sorted(zones.items())),
        "by_highway_type": dict(sorted(highway_types.items(), key=lambda x: -x[1]))
    }


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(script_dir, exist_ok=True)

    print("=" * 60)
    print("Freetown Street Address Directory Generator")
    print("=" * 60)

    # Fetch streets
    streets = get_freetown_streets()
    print(f"Found {len(streets)} named streets in Freetown")

    # Generate directory with postal codes
    print("Assigning postal codes to streets...")
    directory = generate_street_directory(streets)

    # Export files
    print("\nExporting files...")
    export_csv(directory, os.path.join(script_dir, "freetown_streets.csv"))
    export_json(directory, os.path.join(script_dir, "freetown_streets.json"))
    export_geojson(directory, os.path.join(script_dir, "freetown_streets.geojson"))

    # Summary
    summary = generate_summary(directory)
    summary_file = os.path.join(script_dir, "summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Exported summary to {summary_file}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total streets: {summary['total_streets']}")
    print("\nStreets by postal code:")
    for pc, count in summary["by_postal_code"].items():
        print(f"  {pc}: {count} streets")
    print("\nStreets by highway type:")
    for ht, count in list(summary["by_highway_type"].items())[:10]:
        print(f"  {ht}: {count}")


if __name__ == "__main__":
    main()
