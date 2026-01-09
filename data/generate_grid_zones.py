"""
Generate grid-based postal zones for Freetown, Sierra Leone.
Creates ~100 zones covering Freetown urban area (land only).
"""

import json
import math

# Freetown Urban Area - Correct coordinates based on actual Freetown location
# Freetown center is approximately 8.465°N, 13.232°W
FREETOWN_LAND_BOUNDARY = [
    # Covering main urban Freetown - from Kissy to Aberdeen
    # Starting from northeast, going clockwise

    # NORTH (waterfront areas - stay just south of water)
    [-13.17, 8.48],   # Kissy waterfront
    [-13.19, 8.485],  # Cline Town
    [-13.21, 8.49],   # Fourah Bay
    [-13.23, 8.49],   # Central downtown
    [-13.25, 8.485],  # Tower Hill
    [-13.27, 8.48],   # Kingtom

    # WEST (Lumley/Aberdeen coast - stay east of beach)
    [-13.28, 8.46],   # Murray Town
    [-13.285, 8.44],  # Lumley
    [-13.28, 8.42],   # Aberdeen

    # SOUTH (hills area)
    [-13.27, 8.41],   # Juba
    [-13.25, 8.42],   # Hill Station
    [-13.23, 8.41],   # Regent
    [-13.21, 8.42],   # Leicester/Gloucester
    [-13.19, 8.43],   # Calaba Town
    [-13.17, 8.44],   # Grassfield

    # EAST (back to start)
    [-13.15, 8.45],   # Wellington
    [-13.14, 8.46],   # Allen Town
    [-13.15, 8.47],   # Kissy
    [-13.17, 8.48],   # Back to start
]

# Grid parameters - smaller cells for ~100 zones
GRID_SIZE = 0.008  # Approximately 880m x 880m cells
START_CODE = 1000  # Starting postal code

def point_in_polygon(x, y, polygon):
    """Check if a point is inside a polygon using ray casting algorithm."""
    n = len(polygon)
    inside = False

    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def cell_intersects_land(cell_coords, land_polygon):
    """Check if the center of the cell is on land (stricter check)."""
    min_lon, min_lat, max_lon, max_lat = cell_coords

    # Only check center point - stricter to avoid ocean cells
    center_lon = (min_lon + max_lon) / 2
    center_lat = (min_lat + max_lat) / 2

    return point_in_polygon(center_lon, center_lat, land_polygon)

def generate_grid_zones():
    """Generate grid zones covering Freetown land area."""

    # Calculate bounding box of land polygon
    min_lon = min(p[0] for p in FREETOWN_LAND_BOUNDARY)
    max_lon = max(p[0] for p in FREETOWN_LAND_BOUNDARY)
    min_lat = min(p[1] for p in FREETOWN_LAND_BOUNDARY)
    max_lat = max(p[1] for p in FREETOWN_LAND_BOUNDARY)

    print(f"-- Bounding box: ({min_lon}, {min_lat}) to ({max_lon}, {max_lat})")

    zones = []
    code = START_CODE

    # Generate grid
    lat = min_lat
    while lat < max_lat:
        lon = min_lon
        while lon < max_lon:
            cell_bounds = (lon, lat, lon + GRID_SIZE, lat + GRID_SIZE)

            if cell_intersects_land(cell_bounds, FREETOWN_LAND_BOUNDARY):
                # Create polygon for this cell
                cell_polygon = [
                    [lon, lat],
                    [lon + GRID_SIZE, lat],
                    [lon + GRID_SIZE, lat + GRID_SIZE],
                    [lon, lat + GRID_SIZE],
                    [lon, lat],  # Close the polygon
                ]

                center_lon = lon + GRID_SIZE / 2
                center_lat = lat + GRID_SIZE / 2

                zones.append({
                    'code': str(code),
                    'polygon': cell_polygon,
                    'center': (center_lon, center_lat),
                })
                code += 1

            lon += GRID_SIZE
        lat += GRID_SIZE

    return zones

def generate_sql(zones):
    """Generate SQL INSERT statements for zones."""

    print("-- Freetown Grid-Based Postal Zones")
    print(f"-- Total zones: {len(zones)}")
    print(f"-- Grid size: ~{GRID_SIZE * 111}km x {GRID_SIZE * 111}km")
    print("")
    print("-- Clear existing zones for Western Area")
    print("DELETE FROM zones WHERE district_id IN (1, 2);")
    print("")
    print("-- Reset sequence")
    print("SELECT setval('zones_id_seq', 1, false);")
    print("")
    print("-- Insert grid zones")

    for i, zone in enumerate(zones):
        code = zone['code']
        polygon = zone['polygon']
        center = zone['center']

        # Create WKT polygon
        coords_str = ", ".join([f"{p[0]} {p[1]}" for p in polygon])
        wkt = f"POLYGON(({coords_str}))"

        # Determine zone number (3 digits)
        zone_num = str(i + 1).zfill(3)

        # Determine district (1 = Urban, 2 = Rural based on code)
        district_id = 1 if int(code) >= 1100 else 2

        sql = f"""INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES ({district_id}, '{zone_num}', '{code}', 'Zone {code}', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('{wkt}'), 4326));"""
        print(sql)

    print("")
    print("-- Verify")
    print("SELECT COUNT(*) as total_zones FROM zones;")

def generate_geojson(zones):
    """Generate GeoJSON for visualization."""
    features = []

    for zone in zones:
        feature = {
            "type": "Feature",
            "properties": {
                "primary_code": zone['code'],
                "name": f"Zone {zone['code']}",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [zone['polygon']],
            }
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    return json.dumps(geojson, indent=2)

if __name__ == "__main__":
    import sys

    zones = generate_grid_zones()

    if len(sys.argv) > 1 and sys.argv[1] == '--geojson':
        print(generate_geojson(zones))
    else:
        generate_sql(zones)
