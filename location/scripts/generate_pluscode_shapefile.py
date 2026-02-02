"""
Plus Code Grid Shapefile Generator for QGIS (Offline)

Generates Plus Code grid polygons as GeoJSON/Shapefile for Freetown.
Works completely offline - no API calls needed.

Each Plus Code cell becomes a polygon (rectangle) with attributes:
- plus_code: Full Plus Code (e.g., "6WQPVX22+5WX")
- local_code: 4-char local code (e.g., "VX22")
- zone_type: "urban" or "rural"
- center_lat/center_lon: Cell centroid

Usage:
    python generate_pluscode_shapefile.py --output freetown_pluscode_grid.geojson
    python generate_pluscode_shapefile.py --output freetown_pluscode_grid.shp --format shapefile
    python generate_pluscode_shapefile.py --spacing 75 --precision 11
"""

import argparse
import json
import math
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Add parent for imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

try:
    from openlocationcode import openlocationcode as olc
except ImportError:
    print("ERROR: openlocationcode not installed. Run: pip install openlocationcode")
    sys.exit(1)


# Coverage area boundaries (Waterloo to Central Freetown)
BOUNDS = {
    "lat_min": 8.332,   # Waterloo (southern)
    "lat_max": 8.466,   # Central Freetown (northern)
    "lon_min": -13.232, # Central Freetown (western)
    "lon_max": -13.062, # Waterloo (eastern)
}

# Urban/Rural boundary latitude
URBAN_BOUNDARY_LAT = 8.42


def meters_to_degrees_lat(meters: float) -> float:
    """Convert meters to degrees latitude."""
    return meters / 111320


def meters_to_degrees_lon(meters: float, latitude: float) -> float:
    """Convert meters to degrees longitude (varies with latitude)."""
    return meters / (111320 * math.cos(math.radians(latitude)))


def generate_grid_points(
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    spacing_m: float
) -> List[Tuple[float, float]]:
    """Generate a grid of points within the bounding box."""
    points = []
    current_lat = lat_min

    while current_lat <= lat_max:
        lon_step = meters_to_degrees_lon(spacing_m, current_lat)
        current_lon = lon_min

        while current_lon <= lon_max:
            points.append((current_lat, current_lon))
            current_lon += lon_step

        current_lat += meters_to_degrees_lat(spacing_m)

    return points


def pluscode_to_polygon(plus_code: str) -> Dict:
    """
    Convert a Plus Code to a GeoJSON polygon feature.

    Returns a Feature with the polygon geometry and properties.
    """
    decoded = olc.decode(plus_code)

    # Bounding box coordinates
    lat_lo = decoded.latitudeLo
    lat_hi = decoded.latitudeHi
    lon_lo = decoded.longitudeLo
    lon_hi = decoded.longitudeHi

    # Create polygon coordinates (GeoJSON uses lon, lat order)
    # Counter-clockwise starting from SW corner
    coordinates = [[
        [lon_lo, lat_lo],  # SW
        [lon_hi, lat_lo],  # SE
        [lon_hi, lat_hi],  # NE
        [lon_lo, lat_hi],  # NW
        [lon_lo, lat_lo],  # Close polygon (back to SW)
    ]]

    # Extract local code (4 chars before +)
    before_plus = plus_code.split('+')[0]
    local_code = before_plus[-4:] if len(before_plus) >= 4 else before_plus

    # Determine zone type
    center_lat = decoded.latitudeCenter
    zone_type = "urban" if center_lat >= URBAN_BOUNDARY_LAT else "rural"

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": coordinates
        },
        "properties": {
            "plus_code": plus_code,
            "local_code": local_code,
            "zone_type": zone_type,
            "center_lat": round(decoded.latitudeCenter, 6),
            "center_lon": round(decoded.longitudeCenter, 6),
            "width_m": round((lon_hi - lon_lo) * 111320 * math.cos(math.radians(center_lat)), 2),
            "height_m": round((lat_hi - lat_lo) * 111320, 2),
        }
    }


def generate_pluscode_grid(
    spacing_m: float = 75,
    precision: int = 11,
    bounds: Optional[Dict] = None
) -> List[Dict]:
    """
    Generate Plus Code grid as GeoJSON features.

    Args:
        spacing_m: Grid spacing in meters (default 75m)
        precision: Plus Code precision (10=14m, 11=3m, 12=1m)
        bounds: Custom bounds dict with lat_min, lat_max, lon_min, lon_max

    Returns:
        List of GeoJSON Feature dicts
    """
    if bounds is None:
        bounds = BOUNDS

    # Generate grid points
    print(f"Generating grid points with {spacing_m}m spacing...")
    points = generate_grid_points(
        bounds["lat_min"],
        bounds["lat_max"],
        bounds["lon_min"],
        bounds["lon_max"],
        spacing_m
    )
    print(f"Generated {len(points)} grid points")

    # Convert each point to a Plus Code polygon
    features = []
    seen_codes = set()  # Avoid duplicates

    print("Converting to Plus Code polygons...")
    for i, (lat, lon) in enumerate(points):
        # Encode to Plus Code
        plus_code = olc.encode(lat, lon, precision)

        # Skip if we've already processed this Plus Code
        if plus_code in seen_codes:
            continue
        seen_codes.add(plus_code)

        # Convert to polygon feature
        feature = pluscode_to_polygon(plus_code)
        features.append(feature)

        # Progress indicator
        if (i + 1) % 5000 == 0:
            print(f"  Processed {i + 1}/{len(points)} points, {len(features)} unique codes")

    print(f"Generated {len(features)} unique Plus Code polygons")
    return features


def save_geojson(features: List[Dict], output_path: str):
    """Save features as GeoJSON file."""
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:EPSG::4326"
            }
        }
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f)

    print(f"Saved GeoJSON: {output_path}")


def save_shapefile(features: List[Dict], output_path: str):
    """Save features as Shapefile using geopandas/fiona."""
    try:
        import geopandas as gpd
        from shapely.geometry import shape
    except ImportError:
        print("ERROR: geopandas not installed. Run: pip install geopandas")
        print("Saving as GeoJSON instead...")
        geojson_path = output_path.replace('.shp', '.geojson')
        save_geojson(features, geojson_path)
        return

    # Convert to GeoDataFrame
    geometries = [shape(f['geometry']) for f in features]
    properties = [f['properties'] for f in features]

    gdf = gpd.GeoDataFrame(properties, geometry=geometries, crs="EPSG:4326")
    gdf.to_file(output_path)

    print(f"Saved Shapefile: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate Plus Code grid as shapefile/GeoJSON for QGIS"
    )
    parser.add_argument(
        "--output", "-o",
        default="freetown_pluscode_grid.geojson",
        help="Output file path (default: freetown_pluscode_grid.geojson)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["geojson", "shapefile"],
        default="geojson",
        help="Output format (default: geojson)"
    )
    parser.add_argument(
        "--spacing",
        type=float,
        default=75,
        help="Grid spacing in meters (default: 75)"
    )
    parser.add_argument(
        "--precision",
        type=int,
        choices=[10, 11, 12],
        default=11,
        help="Plus Code precision: 10=14m, 11=3m, 12=1m (default: 11)"
    )
    parser.add_argument(
        "--lat-min",
        type=float,
        default=BOUNDS["lat_min"],
        help=f"Minimum latitude (default: {BOUNDS['lat_min']})"
    )
    parser.add_argument(
        "--lat-max",
        type=float,
        default=BOUNDS["lat_max"],
        help=f"Maximum latitude (default: {BOUNDS['lat_max']})"
    )
    parser.add_argument(
        "--lon-min",
        type=float,
        default=BOUNDS["lon_min"],
        help=f"Minimum longitude (default: {BOUNDS['lon_min']})"
    )
    parser.add_argument(
        "--lon-max",
        type=float,
        default=BOUNDS["lon_max"],
        help=f"Maximum longitude (default: {BOUNDS['lon_max']})"
    )

    args = parser.parse_args()

    # Custom bounds if provided
    bounds = {
        "lat_min": args.lat_min,
        "lat_max": args.lat_max,
        "lon_min": args.lon_min,
        "lon_max": args.lon_max,
    }

    print("\n" + "="*60)
    print("Plus Code Grid Generator for QGIS")
    print("="*60)
    print(f"Area: ({bounds['lat_min']}°N, {bounds['lon_min']}°E) to")
    print(f"      ({bounds['lat_max']}°N, {bounds['lon_max']}°E)")
    print(f"Spacing: {args.spacing}m")
    print(f"Precision: {args.precision} ({['~14m', '~3m', '~1m'][args.precision - 10]} cells)")
    print(f"Output: {args.output}")
    print("="*60 + "\n")

    # Generate grid
    features = generate_pluscode_grid(
        spacing_m=args.spacing,
        precision=args.precision,
        bounds=bounds
    )

    # Save output
    if args.format == "shapefile" or args.output.endswith('.shp'):
        save_shapefile(features, args.output)
    else:
        save_geojson(features, args.output)

    print("\nDone! Load the file in QGIS:")
    print("  1. Open QGIS")
    print("  2. Layer > Add Layer > Add Vector Layer")
    print(f"  3. Select: {args.output}")
    print("  4. Style polygons by 'zone_type' or 'local_code' field")


if __name__ == "__main__":
    main()
