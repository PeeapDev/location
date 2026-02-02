"""
Generate a grid shapefile for Freetown (Western Area Urban + Rural including Waterloo)
This grid will help with defining postal zones in QGIS
"""

import json
import os

# Freetown/Western Area bounds (including Waterloo)
# Western Area Urban: Central Freetown
# Western Area Rural: Extends to Waterloo in the east
BOUNDS = {
    'west': -13.35,
    'east': -13.05,  # Extends to Waterloo
    'south': 8.30,
    'north': 8.55
}

# Grid cell size in degrees (approximately 500m x 500m at this latitude)
CELL_SIZE = 0.005  # ~500 meters

def generate_grid_geojson():
    """Generate a GeoJSON grid for Freetown area"""
    features = []
    cell_id = 0

    lat = BOUNDS['south']
    row = 0
    while lat < BOUNDS['north']:
        lng = BOUNDS['west']
        col = 0
        while lng < BOUNDS['east']:
            # Create cell polygon
            cell = {
                'type': 'Feature',
                'properties': {
                    'id': cell_id,
                    'row': row,
                    'col': col,
                    'grid_code': f'{row:03d}-{col:03d}',
                    'center_lat': lat + CELL_SIZE / 2,
                    'center_lng': lng + CELL_SIZE / 2
                },
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[
                        [lng, lat],
                        [lng + CELL_SIZE, lat],
                        [lng + CELL_SIZE, lat + CELL_SIZE],
                        [lng, lat + CELL_SIZE],
                        [lng, lat]
                    ]]
                }
            }
            features.append(cell)
            cell_id += 1
            lng += CELL_SIZE
            col += 1
        lat += CELL_SIZE
        row += 1

    return {
        'type': 'FeatureCollection',
        'features': features
    }

def generate_shapefile_from_geojson(geojson_path, shp_path):
    """Convert GeoJSON to Shapefile using ogr2ogr if available"""
    try:
        import subprocess
        result = subprocess.run([
            'ogr2ogr', '-f', 'ESRI Shapefile',
            shp_path, geojson_path
        ], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Shapefile created: {shp_path}")
            return True
        else:
            print(f"ogr2ogr error: {result.stderr}")
            return False
    except FileNotFoundError:
        print("ogr2ogr not found. Install GDAL or use QGIS to convert GeoJSON to Shapefile.")
        return False

def main():
    print("Generating Freetown grid...")
    print(f"Bounds: {BOUNDS}")
    print(f"Cell size: {CELL_SIZE} degrees (~500m)")

    grid = generate_grid_geojson()
    print(f"Generated {len(grid['features'])} grid cells")

    # Calculate grid dimensions
    rows = int((BOUNDS['north'] - BOUNDS['south']) / CELL_SIZE)
    cols = int((BOUNDS['east'] - BOUNDS['west']) / CELL_SIZE)
    print(f"Grid dimensions: {rows} rows x {cols} columns")

    # Save GeoJSON
    geojson_path = 'freetown_grid.geojson'
    with open(geojson_path, 'w') as f:
        json.dump(grid, f)
    print(f"GeoJSON saved: {geojson_path}")

    # Try to create shapefile
    shp_path = 'freetown_grid.shp'
    if not generate_shapefile_from_geojson(geojson_path, shp_path):
        print("\nTo convert to Shapefile in QGIS:")
        print("1. Open QGIS")
        print("2. Layer > Add Layer > Add Vector Layer")
        print("3. Select freetown_grid.geojson")
        print("4. Right-click layer > Export > Save Features As")
        print("5. Format: ESRI Shapefile")
        print("6. Save as freetown_grid.shp")

    # Also create a finer grid for detailed zone mapping
    print("\n--- Creating fine grid (250m cells) ---")
    global CELL_SIZE
    CELL_SIZE = 0.0025  # ~250 meters
    fine_grid = generate_grid_geojson()
    print(f"Generated {len(fine_grid['features'])} fine grid cells")

    fine_geojson_path = 'freetown_grid_fine.geojson'
    with open(fine_geojson_path, 'w') as f:
        json.dump(fine_grid, f)
    print(f"Fine GeoJSON saved: {fine_geojson_path}")

if __name__ == '__main__':
    main()
