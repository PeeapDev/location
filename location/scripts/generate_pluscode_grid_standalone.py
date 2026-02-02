"""
Plus Code Grid Generator for QGIS (Standalone - No Dependencies)

Generates Plus Code grid polygons as GeoJSON for Freetown.
Works completely offline with built-in Plus Code algorithm.

Usage:
    python generate_pluscode_grid_standalone.py
"""

import json
import math
from typing import List, Dict, Tuple

# Plus Code constants
CODE_ALPHABET = "23456789CFGHJMPQRVWX"
ENCODING_BASE = len(CODE_ALPHABET)  # 20
LATITUDE_MAX = 90
LONGITUDE_MAX = 180
PAIR_CODE_LENGTH = 10
SEPARATOR = "+"
SEPARATOR_POSITION = 8

# Resolution values for each pair position
PAIR_RESOLUTIONS = [20.0, 1.0, 0.05, 0.0025, 0.000125]
# Grid refinement resolution
GRID_COLUMNS = 4
GRID_ROWS = 5
FINAL_LAT_PRECISION = 0.000025  # ~2.8m
FINAL_LON_PRECISION = 0.00003125  # ~3.5m at equator


def encode_pluscode(lat: float, lon: float, code_length: int = 11) -> str:
    """Encode latitude/longitude to Plus Code."""
    if code_length < 10 or code_length > 15:
        code_length = 11

    # Adjust lat/lon to positive ranges
    lat = min(lat, LATITUDE_MAX)
    lat += LATITUDE_MAX
    lon += LONGITUDE_MAX

    code = ""

    # Compute pairs
    lat_val = lat
    lon_val = lon

    for i in range(5):  # 5 pairs = 10 characters
        lat_digit = int(lat_val / PAIR_RESOLUTIONS[i])
        lon_digit = int(lon_val / PAIR_RESOLUTIONS[i])

        lat_digit = min(lat_digit, ENCODING_BASE - 1)
        lon_digit = min(lon_digit, ENCODING_BASE - 1)

        code += CODE_ALPHABET[lat_digit]
        code += CODE_ALPHABET[lon_digit]

        lat_val -= lat_digit * PAIR_RESOLUTIONS[i]
        lon_val -= lon_digit * PAIR_RESOLUTIONS[i]

        if i == 3:  # After 8 chars, add separator
            code += SEPARATOR

    # Add grid refinement for precision > 10
    if code_length > 10:
        remaining = code_length - 10

        # Grid refinement
        for _ in range(remaining):
            lat_digit = int(lat_val / FINAL_LAT_PRECISION)
            lon_digit = int(lon_val / FINAL_LON_PRECISION)

            lat_digit = min(lat_digit, GRID_ROWS - 1)
            lon_digit = min(lon_digit, GRID_COLUMNS - 1)

            code += CODE_ALPHABET[lat_digit * GRID_COLUMNS + lon_digit]

            lat_val -= lat_digit * FINAL_LAT_PRECISION
            lon_val -= lon_digit * FINAL_LON_PRECISION

    return code


def decode_pluscode(code: str) -> Dict:
    """Decode Plus Code to bounding box."""
    code = code.upper().replace(SEPARATOR, "")

    lat_lo = -LATITUDE_MAX
    lon_lo = -LONGITUDE_MAX
    lat_hi = LATITUDE_MAX
    lon_hi = LONGITUDE_MAX

    # Decode pairs (first 10 chars)
    for i in range(min(5, len(code) // 2)):
        lat_char = code[i * 2]
        lon_char = code[i * 2 + 1]

        lat_digit = CODE_ALPHABET.index(lat_char)
        lon_digit = CODE_ALPHABET.index(lon_char)

        lat_resolution = PAIR_RESOLUTIONS[i]
        lon_resolution = PAIR_RESOLUTIONS[i]

        lat_lo = lat_lo + lat_digit * lat_resolution
        lon_lo = lon_lo + lon_digit * lon_resolution
        lat_hi = lat_lo + lat_resolution
        lon_hi = lon_lo + lon_resolution

    # Decode grid refinement (chars after first 10)
    if len(code) > 10:
        for i in range(10, len(code)):
            char = code[i]
            digit = CODE_ALPHABET.index(char)

            row = digit // GRID_COLUMNS
            col = digit % GRID_COLUMNS

            lat_resolution = (lat_hi - lat_lo) / GRID_ROWS
            lon_resolution = (lon_hi - lon_lo) / GRID_COLUMNS

            lat_lo = lat_lo + row * lat_resolution
            lon_lo = lon_lo + col * lon_resolution
            lat_hi = lat_lo + lat_resolution
            lon_hi = lon_lo + lon_resolution

    return {
        "latitude_lo": lat_lo,
        "latitude_hi": lat_hi,
        "longitude_lo": lon_lo,
        "longitude_hi": lon_hi,
        "latitude_center": (lat_lo + lat_hi) / 2,
        "longitude_center": (lon_lo + lon_hi) / 2,
    }


# Coverage area boundaries (Waterloo to Central Freetown)
BOUNDS = {
    "lat_min": 8.332,
    "lat_max": 8.466,
    "lon_min": -13.232,
    "lon_max": -13.062,
}

URBAN_BOUNDARY_LAT = 8.42


def meters_to_degrees_lat(meters: float) -> float:
    return meters / 111320


def meters_to_degrees_lon(meters: float, latitude: float) -> float:
    return meters / (111320 * math.cos(math.radians(latitude)))


def generate_grid_points(
    lat_min: float, lat_max: float,
    lon_min: float, lon_max: float,
    spacing_m: float
) -> List[Tuple[float, float]]:
    """Generate grid of points."""
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
    """Convert Plus Code to GeoJSON polygon feature."""
    decoded = decode_pluscode(plus_code)

    lat_lo = decoded["latitude_lo"]
    lat_hi = decoded["latitude_hi"]
    lon_lo = decoded["longitude_lo"]
    lon_hi = decoded["longitude_hi"]

    # GeoJSON polygon (lon, lat order)
    coordinates = [[
        [lon_lo, lat_lo],
        [lon_hi, lat_lo],
        [lon_hi, lat_hi],
        [lon_lo, lat_hi],
        [lon_lo, lat_lo],
    ]]

    # Extract local code
    code_clean = plus_code.replace("+", "")
    local_code = code_clean[4:8] if len(code_clean) >= 8 else code_clean

    center_lat = decoded["latitude_center"]
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
            "center_lat": round(center_lat, 6),
            "center_lon": round(decoded["longitude_center"], 6),
        }
    }


def main():
    spacing_m = 75
    precision = 11
    output_file = "C:/Users/PC/Desktop/Project/postal/location/data/freetown_pluscode_grid.geojson"

    print("=" * 60)
    print("Plus Code Grid Generator for QGIS")
    print("=" * 60)
    print(f"Area: Freetown ({BOUNDS['lat_min']}N to {BOUNDS['lat_max']}N)")
    print(f"Spacing: {spacing_m}m")
    print(f"Precision: {precision} (~3m x 3m cells)")
    print("=" * 60)

    # Generate grid points
    print("\nGenerating grid points...")
    points = generate_grid_points(
        BOUNDS["lat_min"], BOUNDS["lat_max"],
        BOUNDS["lon_min"], BOUNDS["lon_max"],
        spacing_m
    )
    print(f"Generated {len(points)} grid points")

    # Convert to Plus Code polygons
    print("\nConverting to Plus Code polygons...")
    features = []
    seen_codes = set()

    for i, (lat, lon) in enumerate(points):
        plus_code = encode_pluscode(lat, lon, precision)

        if plus_code in seen_codes:
            continue
        seen_codes.add(plus_code)

        feature = pluscode_to_polygon(plus_code)
        features.append(feature)

        if (i + 1) % 10000 == 0:
            print(f"  Progress: {i + 1}/{len(points)} ({len(features)} unique codes)")

    print(f"\nGenerated {len(features)} unique Plus Code polygons")

    # Count by zone type
    urban_count = sum(1 for f in features if f["properties"]["zone_type"] == "urban")
    rural_count = len(features) - urban_count
    print(f"  Urban: {urban_count}")
    print(f"  Rural: {rural_count}")

    # Save GeoJSON
    print(f"\nSaving to: {output_file}")
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}
        }
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f)

    file_size_mb = len(json.dumps(geojson)) / (1024 * 1024)
    print(f"File size: ~{file_size_mb:.1f} MB")

    print("\n" + "=" * 60)
    print("DONE! Load in QGIS:")
    print("  Layer > Add Layer > Add Vector Layer")
    print(f"  Select: {output_file}")
    print("=" * 60)


if __name__ == "__main__":
    main()
