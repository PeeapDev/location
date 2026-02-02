"""
Generate realistic zone polygons for Freetown, Sierra Leone.
These are approximate boundaries based on known neighborhood locations.
"""

# Freetown zone geometries (approximate polygons)
# Format: zone_code -> list of [lon, lat] coordinates forming a polygon

FREETOWN_ZONES = {
    # Central Freetown - Downtown/CBD area
    "1100-001": {
        "name": "Central Freetown",
        "coordinates": [
            [-13.2350, 8.4850],
            [-13.2280, 8.4850],
            [-13.2250, 8.4780],
            [-13.2250, 8.4700],
            [-13.2320, 8.4680],
            [-13.2380, 8.4720],
            [-13.2380, 8.4800],
            [-13.2350, 8.4850]
        ],
        "center": [-13.2315, 8.4765]
    },
    # Central Freetown East - Near ferry terminal
    "1100-002": {
        "name": "Central Freetown East",
        "coordinates": [
            [-13.2250, 8.4850],
            [-13.2180, 8.4870],
            [-13.2120, 8.4800],
            [-13.2150, 8.4700],
            [-13.2250, 8.4700],
            [-13.2250, 8.4780],
            [-13.2250, 8.4850]
        ],
        "center": [-13.2190, 8.4780]
    },
    # East End - Eastern Freetown
    "1101-001": {
        "name": "East End",
        "coordinates": [
            [-13.2120, 8.4800],
            [-13.2050, 8.4850],
            [-13.1980, 8.4780],
            [-13.2000, 8.4680],
            [-13.2100, 8.4650],
            [-13.2150, 8.4700],
            [-13.2120, 8.4800]
        ],
        "center": [-13.2065, 8.4735]
    },
    # Cline Town - Near the port
    "1101-002": {
        "name": "Cline Town",
        "coordinates": [
            [-13.2050, 8.4850],
            [-13.1950, 8.4900],
            [-13.1880, 8.4820],
            [-13.1920, 8.4720],
            [-13.2000, 8.4680],
            [-13.1980, 8.4780],
            [-13.2050, 8.4850]
        ],
        "center": [-13.1965, 8.4795]
    },
    # Congo Town - Western area
    "1102-001": {
        "name": "Congo Town",
        "coordinates": [
            [-13.2480, 8.4750],
            [-13.2380, 8.4800],
            [-13.2380, 8.4720],
            [-13.2320, 8.4680],
            [-13.2350, 8.4600],
            [-13.2450, 8.4600],
            [-13.2520, 8.4680],
            [-13.2480, 8.4750]
        ],
        "center": [-13.2420, 8.4690]
    },
    # Murray Town - Near beach
    "1102-002": {
        "name": "Murray Town",
        "coordinates": [
            [-13.2580, 8.4700],
            [-13.2480, 8.4750],
            [-13.2520, 8.4680],
            [-13.2450, 8.4600],
            [-13.2500, 8.4520],
            [-13.2600, 8.4550],
            [-13.2620, 8.4650],
            [-13.2580, 8.4700]
        ],
        "center": [-13.2535, 8.4620]
    },
    # Brookfields - Residential area
    "1103-001": {
        "name": "Brookfields",
        "coordinates": [
            [-13.2450, 8.4600],
            [-13.2350, 8.4600],
            [-13.2300, 8.4520],
            [-13.2350, 8.4450],
            [-13.2450, 8.4450],
            [-13.2500, 8.4520],
            [-13.2450, 8.4600]
        ],
        "center": [-13.2400, 8.4520]
    },
    # New England - Residential
    "1103-002": {
        "name": "New England",
        "coordinates": [
            [-13.2350, 8.4450],
            [-13.2250, 8.4480],
            [-13.2180, 8.4420],
            [-13.2220, 8.4350],
            [-13.2320, 8.4350],
            [-13.2380, 8.4400],
            [-13.2350, 8.4450]
        ],
        "center": [-13.2280, 8.4410]
    },
    # Hill Station - Elevated area
    "1104-001": {
        "name": "Hill Station",
        "coordinates": [
            [-13.2650, 8.4550],
            [-13.2500, 8.4520],
            [-13.2450, 8.4450],
            [-13.2500, 8.4380],
            [-13.2600, 8.4350],
            [-13.2700, 8.4420],
            [-13.2700, 8.4500],
            [-13.2650, 8.4550]
        ],
        "center": [-13.2575, 8.4450]
    },
    # Wilberforce - Near military area
    "1104-002": {
        "name": "Wilberforce",
        "coordinates": [
            [-13.2700, 8.4420],
            [-13.2600, 8.4350],
            [-13.2620, 8.4280],
            [-13.2720, 8.4250],
            [-13.2800, 8.4300],
            [-13.2780, 8.4400],
            [-13.2700, 8.4420]
        ],
        "center": [-13.2700, 8.4340]
    },
    # Lumley - Beach area
    "1105-001": {
        "name": "Lumley",
        "coordinates": [
            [-13.2800, 8.4300],
            [-13.2720, 8.4250],
            [-13.2750, 8.4150],
            [-13.2850, 8.4100],
            [-13.2950, 8.4150],
            [-13.2920, 8.4250],
            [-13.2800, 8.4300]
        ],
        "center": [-13.2830, 8.4200]
    },
    # Aberdeen - Peninsula tip
    "1105-002": {
        "name": "Aberdeen",
        "coordinates": [
            [-13.2850, 8.4100],
            [-13.2750, 8.4150],
            [-13.2700, 8.4050],
            [-13.2750, 8.3950],
            [-13.2880, 8.3920],
            [-13.2950, 8.4000],
            [-13.2950, 8.4150],
            [-13.2850, 8.4100]
        ],
        "center": [-13.2835, 8.4035]
    },
    # Goderich - Southwest
    "1106-001": {
        "name": "Goderich",
        "coordinates": [
            [-13.2950, 8.4000],
            [-13.2880, 8.3920],
            [-13.2920, 8.3820],
            [-13.3050, 8.3780],
            [-13.3150, 8.3850],
            [-13.3100, 8.3950],
            [-13.2950, 8.4000]
        ],
        "center": [-13.3000, 8.3880]
    }
}


def generate_geojson_polygon(coordinates):
    """Generate a GeoJSON Polygon from coordinates."""
    # Ensure the polygon is closed
    if coordinates[0] != coordinates[-1]:
        coordinates = coordinates + [coordinates[0]]

    return {
        "type": "Polygon",
        "coordinates": [coordinates]
    }


def generate_sql_updates():
    """Generate SQL UPDATE statements for zone geometries."""
    sql_statements = []

    for zone_code, zone_data in FREETOWN_ZONES.items():
        coords = zone_data["coordinates"]
        # Ensure closed polygon
        if coords[0] != coords[-1]:
            coords = coords + [coords[0]]

        # Create WKT polygon string
        coord_str = ", ".join([f"{lon} {lat}" for lon, lat in coords])
        wkt = f"POLYGON(({coord_str}))"

        sql = f"""UPDATE postal_zones SET geometry = ST_SetSRID(ST_GeomFromText('{wkt}'), 4326) WHERE zone_code = '{zone_code}';"""
        sql_statements.append(sql)

    return "\n".join(sql_statements)


if __name__ == "__main__":
    print("-- Freetown Zone Geometry Updates")
    print("-- Generated zone boundaries for Western Area Urban\n")
    print(generate_sql_updates())
