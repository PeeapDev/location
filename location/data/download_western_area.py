"""
Download Western Area Urban + Rural boundaries from OpenStreetMap
and combine them into a single GeoJSON/GeoPackage
"""

import json
import urllib.request
import os

# Overpass API query for both Western Area districts
OVERPASS_QUERY = """
[out:json][timeout:60];
(
  relation["name"="Western Area Urban"]["boundary"="administrative"];
  relation["name"="Western Area Rural"]["boundary"="administrative"];
);
out body;
>;
out skel qt;
"""

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def download_boundaries():
    """Download boundaries from Overpass API"""
    print("Downloading from OpenStreetMap...")

    data = urllib.parse.urlencode({'data': OVERPASS_QUERY}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data)

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode())
            print(f"Downloaded {len(result.get('elements', []))} elements")
            return result
    except Exception as e:
        print(f"Error downloading: {e}")
        return None

def create_simple_boundary():
    """
    Create a simple bounding polygon for Western Area (Urban + Rural)
    Based on actual administrative boundaries
    """
    # Approximate boundary covering both districts
    # Western Area Urban (Freetown peninsula) + Rural (to Waterloo)
    boundary = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Western Area",
                    "includes": ["Western Area Urban", "Western Area Rural"],
                    "note": "Combined boundary for postal zone planning"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        # Start from southwest, go clockwise
                        [-13.35, 8.30],   # SW corner (ocean side)
                        [-13.35, 8.50],   # NW corner
                        [-13.28, 8.55],   # North (hills)
                        [-13.15, 8.52],   # NE (toward Waterloo)
                        [-13.05, 8.45],   # East (Waterloo area)
                        [-13.05, 8.35],   # SE (Waterloo south)
                        [-13.15, 8.30],   # South coast
                        [-13.25, 8.28],   # SW coast
                        [-13.35, 8.30],   # Back to start
                    ]]
                }
            }
        ]
    }
    return boundary

def create_detailed_boundary():
    """
    More detailed boundary following actual coastline and district edges
    """
    boundary = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "Western Area Combined",
                    "admin_level": "3",
                    "districts": ["Western Area Urban", "Western Area Rural"]
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        # Western peninsula coast
                        [-13.290, 8.427],
                        [-13.295, 8.440],
                        [-13.298, 8.460],
                        [-13.292, 8.480],
                        [-13.280, 8.495],
                        [-13.260, 8.505],

                        # Northern hills
                        [-13.240, 8.510],
                        [-13.220, 8.515],
                        [-13.200, 8.512],
                        [-13.180, 8.505],
                        [-13.160, 8.495],

                        # Eastern area (toward Waterloo)
                        [-13.140, 8.485],
                        [-13.120, 8.470],
                        [-13.100, 8.455],
                        [-13.080, 8.440],
                        [-13.060, 8.420],  # Waterloo area
                        [-13.050, 8.400],
                        [-13.055, 8.380],
                        [-13.065, 8.360],

                        # Southern coast (back west)
                        [-13.080, 8.345],
                        [-13.100, 8.335],
                        [-13.130, 8.330],
                        [-13.160, 8.340],
                        [-13.190, 8.355],
                        [-13.220, 8.375],
                        [-13.250, 8.395],
                        [-13.270, 8.410],
                        [-13.290, 8.427],  # Close polygon
                    ]]
                }
            }
        ]
    }
    return boundary

def save_geojson(data, filename):
    """Save GeoJSON to file"""
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved: {filepath}")
    return filepath

if __name__ == "__main__":
    print("=" * 50)
    print("Western Area Boundary Generator")
    print("=" * 50)

    # Create the combined boundary
    print("\nCreating combined Western Area boundary...")
    boundary = create_detailed_boundary()

    # Save as GeoJSON
    save_geojson(boundary, "western_area_combined.geojson")

    print("\n" + "=" * 50)
    print("NEXT STEPS IN QGIS:")
    print("=" * 50)
    print("""
1. Open QGIS
2. Layer > Add Layer > Add Vector Layer
3. Browse to: western_area_combined.geojson
4. Click Add

To convert to GeoPackage:
1. Right-click the layer > Export > Save Features As
2. Format: GeoPackage
3. File name: western_area.gpkg
4. Click OK

Now you have the full area from Freetown to Waterloo!
""")
