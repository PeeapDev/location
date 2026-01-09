"""
Generate postal zones based on actual Freetown neighborhoods.
Each zone is named and positioned correctly.
"""

import json

# Actual Freetown neighborhoods with their approximate center coordinates
# Format: (name, longitude, latitude)
FREETOWN_NEIGHBORHOODS = [
    # CENTRAL FREETOWN
    ("Central Freetown", -13.2340, 8.4840),
    ("Tower Hill", -13.2380, 8.4780),
    ("Pademba Road", -13.2280, 8.4750),
    ("Kroo Town", -13.2420, 8.4720),
    ("Magazine Cut", -13.2350, 8.4700),

    # EAST END
    ("Cline Town", -13.2150, 8.4800),
    ("Fourah Bay", -13.2050, 8.4780),
    ("Foulah Town", -13.2100, 8.4720),
    ("Kissy Road", -13.1980, 8.4700),
    ("Kissy", -13.1850, 8.4680),
    ("Kissy Dock Yard", -13.1750, 8.4650),
    ("Wellington", -13.1600, 8.4600),
    ("Allen Town", -13.1400, 8.4550),
    ("Hastings", -13.1200, 8.4500),

    # WEST END
    ("Brookfields", -13.2480, 8.4650),
    ("Congo Cross", -13.2550, 8.4600),
    ("Wilberforce", -13.2620, 8.4550),
    ("Signal Hill", -13.2580, 8.4500),
    ("Hill Station", -13.2500, 8.4450),
    ("Murray Town", -13.2680, 8.4480),
    ("Kingtom", -13.2600, 8.4750),

    # LUMLEY/ABERDEEN AREA
    ("Lumley", -13.2720, 8.4400),
    ("Aberdeen", -13.2780, 8.4320),
    ("Cockle Bay", -13.2700, 8.4280),
    ("Juba", -13.2650, 8.4200),

    # INLAND/HILLS
    ("Regent", -13.2350, 8.4200),
    ("Gloucester", -13.2200, 8.4250),
    ("Leicester", -13.2280, 8.4150),
    ("Grafton", -13.2100, 8.4100),
    ("Charlotte", -13.2000, 8.4150),
    ("Bathurst", -13.1900, 8.4200),
    ("Calaba Town", -13.2100, 8.4350),

    # ADDITIONAL AREAS
    ("New England", -13.2450, 8.4850),
    ("Mamba Point", -13.2200, 8.4850),
    ("Big Wharf", -13.2300, 8.4880),
    ("Government Wharf", -13.2380, 8.4900),
    ("Susan's Bay", -13.2480, 8.4800),
    ("Ascension Town", -13.2150, 8.4650),
    ("Bottom Mango", -13.2050, 8.4600),
    ("Grassfield", -13.1950, 8.4550),
    ("Portee", -13.1800, 8.4500),
    ("Shell", -13.1700, 8.4450),
    ("Waterloo", -13.0700, 8.3400),  # Further out
]

# Zone size (approximately 500m x 500m)
ZONE_SIZE = 0.005

def generate_zone_polygon(center_lng, center_lat, size=ZONE_SIZE):
    """Generate a square polygon around the center point."""
    half = size / 2
    return [
        [center_lng - half, center_lat - half],
        [center_lng + half, center_lat - half],
        [center_lng + half, center_lat + half],
        [center_lng - half, center_lat + half],
        [center_lng - half, center_lat - half],  # Close polygon
    ]

def generate_sql():
    """Generate SQL to create neighborhood-based zones."""
    print("-- Freetown Neighborhood-Based Postal Zones")
    print(f"-- Total zones: {len(FREETOWN_NEIGHBORHOODS)}")
    print("")
    print("-- Clear existing zones for Western Area")
    print("DELETE FROM zones WHERE district_id IN (1, 2);")
    print("")
    print("-- Reset sequence")
    print("SELECT setval('zones_id_seq', 1, false);")
    print("")
    print("-- Insert neighborhood zones")

    for i, (name, lng, lat) in enumerate(FREETOWN_NEIGHBORHOODS):
        code = 1000 + i
        polygon = generate_zone_polygon(lng, lat)

        # Create WKT polygon
        coords_str = ", ".join([f"{p[0]} {p[1]}" for p in polygon])
        wkt = f"POLYGON(({coords_str}))"

        # Zone number (3 digits)
        zone_num = str(i + 1).zfill(3)

        # District (1 = Urban for most, 2 = Rural for outer areas)
        district_id = 2 if name in ["Waterloo", "Hastings", "Grafton", "Charlotte"] else 1

        # Escape single quotes in name
        safe_name = name.replace("'", "''")

        sql = f"""INSERT INTO zones (district_id, zone_number, primary_code, name, zone_type, is_active, is_locked, next_segment, address_count, created_at, geometry)
VALUES ({district_id}, '{zone_num}', '{code}', '{safe_name}', 'mixed', true, false, 1, 0, NOW(),
ST_SetSRID(ST_GeomFromText('{wkt}'), 4326));"""
        print(sql)

    print("")
    print("-- Verify")
    print("SELECT COUNT(*) as total_zones FROM zones;")
    print("SELECT primary_code, name, ST_Y(ST_Centroid(geometry)) as lat, ST_X(ST_Centroid(geometry)) as lng FROM zones ORDER BY primary_code;")

def generate_geojson():
    """Generate GeoJSON for visualization."""
    features = []

    for i, (name, lng, lat) in enumerate(FREETOWN_NEIGHBORHOODS):
        code = 1000 + i
        polygon = generate_zone_polygon(lng, lat)

        feature = {
            "type": "Feature",
            "properties": {
                "primary_code": str(code),
                "name": name,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [polygon],
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

    if len(sys.argv) > 1 and sys.argv[1] == '--geojson':
        print(generate_geojson())
    else:
        generate_sql()
