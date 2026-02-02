"""
OpenStreetMap Boundary Data for Western Area Districts
=======================================================
Converts OSM data to GeoJSON format for the location services.

Source: OpenStreetMap Overpass API
Relations:
- Western Area Rural (id: 2541225)
- Western Area Urban (id: 3242456)

Generated: 2026-01-11
"""

import json
from pathlib import Path

# Western Area Rural boundary data (OSM relation id: 2541225)
# Bounds: minlat: 8.0930302, minlon: -13.2521295, maxlat: 8.4699661, maxlon: -12.9136851
WESTERN_AREA_RURAL = {
    "osm_id": 2541225,
    "name": "Western Area Rural",
    "admin_level": 5,
    "bounds": {
        "minlat": 8.0930302,
        "minlon": -13.2521295,
        "maxlat": 8.4699661,
        "maxlon": -12.9136851
    },
    "wikidata": "Q2030876",
    "wikipedia": "en:Western Area Rural District"
}

# Western Area Urban boundary data (OSM relation id: 3242456)
# Bounds: minlat: 8.3737474, minlon: -13.2985056, maxlat: 8.4996239, maxlon: -13.1746057
WESTERN_AREA_URBAN = {
    "osm_id": 3242456,
    "name": "Western Area Urban",
    "admin_level": 5,
    "bounds": {
        "minlat": 8.3737474,
        "minlon": -13.2985056,
        "maxlat": 8.4996239,
        "maxlon": -13.1746057
    },
    "wikidata": "Q2085448",
    "wikipedia": "en:Western Area Urban District"
}


def create_boundary_polygon_from_bounds(bounds):
    """
    Create a simple rectangular polygon from bounds.
    This is a simplified version - actual OSM boundaries are more complex.
    """
    return [
        [bounds["minlon"], bounds["minlat"]],
        [bounds["maxlon"], bounds["minlat"]],
        [bounds["maxlon"], bounds["maxlat"]],
        [bounds["minlon"], bounds["maxlat"]],
        [bounds["minlon"], bounds["minlat"]]  # Close the polygon
    ]


def generate_geojson():
    """Generate GeoJSON FeatureCollection for Western Area districts."""
    features = [
        {
            "type": "Feature",
            "properties": {
                "name": WESTERN_AREA_RURAL["name"],
                "admin_level": str(WESTERN_AREA_RURAL["admin_level"]),
                "osm_id": WESTERN_AREA_RURAL["osm_id"],
                "wikidata": WESTERN_AREA_RURAL["wikidata"],
                "wikipedia": WESTERN_AREA_RURAL["wikipedia"],
                "description": "Western Area Rural District - extends from peninsula to Waterloo",
                "capital": "Waterloo",
                "region": "Western Area",
                "district_code": "WR"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [create_boundary_polygon_from_bounds(WESTERN_AREA_RURAL["bounds"])]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": WESTERN_AREA_URBAN["name"],
                "admin_level": str(WESTERN_AREA_URBAN["admin_level"]),
                "osm_id": WESTERN_AREA_URBAN["osm_id"],
                "wikidata": WESTERN_AREA_URBAN["wikidata"],
                "wikipedia": WESTERN_AREA_URBAN["wikipedia"],
                "description": "Western Area Urban District - Freetown and surrounding areas",
                "capital": "Freetown",
                "region": "Western Area",
                "district_code": "WU"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [create_boundary_polygon_from_bounds(WESTERN_AREA_URBAN["bounds"])]
            }
        }
    ]

    return {
        "type": "FeatureCollection",
        "name": "Western Area Districts OSM Boundaries",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "source": {
            "name": "OpenStreetMap",
            "url": "https://www.openstreetmap.org",
            "timestamp": "2026-01-11T10:40:00Z",
            "license": "ODbL"
        },
        "features": features
    }


if __name__ == "__main__":
    # Generate the GeoJSON
    geojson_data = generate_geojson()

    # Output file path
    output_path = Path(__file__).parent / "western_area_osm_boundaries.geojson"

    # Write to file
    with open(output_path, "w") as f:
        json.dump(geojson_data, f, indent=2)

    print(f"Generated: {output_path}")
    print(f"Features: {len(geojson_data['features'])}")
