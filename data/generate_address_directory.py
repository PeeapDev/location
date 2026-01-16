"""
Address Directory Generator for Sierra Leone Postal Zones
=========================================================
Generates a comprehensive address directory with postal codes,
zone names, and centroid coordinates (lat/lon) for each zone.

Output formats:
- CSV: For spreadsheet analysis and database import
- JSON: For API/application use
- GeoJSON: For shapefile generation (QGIS, ArcGIS, etc.)
"""

import json
import csv
import os
from datetime import datetime
from typing import List, Dict, Tuple, Any


def calculate_centroid(coordinates: List) -> Tuple[float, float]:
    """
    Calculate the centroid of a polygon.
    Returns (longitude, latitude) tuple.
    """
    # Handle MultiPolygon vs Polygon
    if isinstance(coordinates[0][0][0], list):
        # MultiPolygon - use first polygon
        coords = coordinates[0][0]
    else:
        # Polygon
        coords = coordinates[0]

    n = len(coords)
    if n == 0:
        return (0, 0)

    sum_lon = sum(c[0] for c in coords)
    sum_lat = sum(c[1] for c in coords)

    return (sum_lon / n, sum_lat / n)


def calculate_bbox(coordinates: List) -> Dict[str, float]:
    """
    Calculate bounding box for a polygon.
    Returns dict with min_lon, min_lat, max_lon, max_lat.
    """
    # Handle MultiPolygon vs Polygon
    if isinstance(coordinates[0][0][0], list):
        coords = coordinates[0][0]
    else:
        coords = coordinates[0]

    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]

    return {
        "min_lon": min(lons),
        "max_lon": max(lons),
        "min_lat": min(lats),
        "max_lat": max(lats)
    }


def load_postal_zones(input_file: str) -> Dict:
    """Load the postal zones GeoJSON file."""
    with open(input_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_address_directory(geojson_data: Dict) -> List[Dict]:
    """
    Process GeoJSON features and generate address directory entries.
    Each entry contains zone info, postal code, and centroid coordinates.
    """
    directory = []

    for feature in geojson_data.get('features', []):
        props = feature.get('properties', {})
        geometry = feature.get('geometry', {})

        # Calculate centroid
        coords = geometry.get('coordinates', [])
        if coords:
            centroid = calculate_centroid(coords)
            bbox = calculate_bbox(coords)
        else:
            centroid = (0, 0)
            bbox = {"min_lon": 0, "max_lon": 0, "min_lat": 0, "max_lat": 0}

        entry = {
            "zone_code": props.get('zone_code', ''),
            "postal_code": props.get('postal_code', ''),
            "zone_name": props.get('zone_name', ''),
            "district_name": props.get('district_name', ''),
            "region_name": props.get('region_name', ''),
            "segment_type": props.get('segment_type', ''),
            "centroid_lon": round(centroid[0], 6),
            "centroid_lat": round(centroid[1], 6),
            "bbox_min_lon": round(bbox['min_lon'], 6),
            "bbox_max_lon": round(bbox['max_lon'], 6),
            "bbox_min_lat": round(bbox['min_lat'], 6),
            "bbox_max_lat": round(bbox['max_lat'], 6),
        }

        directory.append(entry)

    # Sort by postal code, then zone code
    directory.sort(key=lambda x: (x['postal_code'], x['zone_code']))

    return directory


def export_csv(directory: List[Dict], output_file: str):
    """Export address directory to CSV format."""
    if not directory:
        return

    fieldnames = [
        'zone_code', 'postal_code', 'zone_name', 'district_name',
        'region_name', 'segment_type', 'centroid_lat', 'centroid_lon',
        'bbox_min_lat', 'bbox_max_lat', 'bbox_min_lon', 'bbox_max_lon'
    ]

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(directory)

    print(f"Exported {len(directory)} zones to {output_file}")


def export_json(directory: List[Dict], output_file: str):
    """Export address directory to JSON format."""
    output = {
        "name": "Sierra Leone Postal Zone Directory",
        "generated": datetime.now().isoformat(),
        "total_zones": len(directory),
        "zones": directory
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print(f"Exported {len(directory)} zones to {output_file}")


def export_geojson_for_shapefile(geojson_data: Dict, directory: List[Dict], output_file: str):
    """
    Export clean GeoJSON optimized for shapefile conversion.
    - Uses standard GeoJSON structure
    - Includes centroid as point geometry option
    - Properly formatted for QGIS/ogr2ogr conversion
    """
    # Create a lookup from zone_code to directory entry for centroid data
    zone_lookup = {d['zone_code']: d for d in directory}

    # Polygon features (zone boundaries)
    polygon_features = []
    # Point features (zone centroids)
    point_features = []

    for feature in geojson_data.get('features', []):
        props = feature.get('properties', {})
        zone_code = props.get('zone_code', '')

        # Get additional data from directory
        dir_entry = zone_lookup.get(zone_code, {})

        # Enhanced properties for shapefile
        enhanced_props = {
            "ZONE_CODE": props.get('zone_code', ''),
            "POST_CODE": props.get('postal_code', ''),
            "ZONE_NAME": props.get('zone_name', ''),
            "DISTRICT": props.get('district_name', ''),
            "REGION": props.get('region_name', ''),
            "SEG_TYPE": props.get('segment_type', ''),
            "CENT_LAT": dir_entry.get('centroid_lat', 0),
            "CENT_LON": dir_entry.get('centroid_lon', 0),
        }

        # Polygon feature
        polygon_features.append({
            "type": "Feature",
            "properties": enhanced_props,
            "geometry": feature.get('geometry')
        })

        # Point feature (centroid)
        if dir_entry:
            point_features.append({
                "type": "Feature",
                "properties": enhanced_props,
                "geometry": {
                    "type": "Point",
                    "coordinates": [dir_entry.get('centroid_lon', 0), dir_entry.get('centroid_lat', 0)]
                }
            })

    # Export polygon GeoJSON
    polygon_geojson = {
        "type": "FeatureCollection",
        "name": "Sierra_Leone_Postal_Zones",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": polygon_features
    }

    polygon_file = output_file.replace('.geojson', '_polygons.geojson')
    with open(polygon_file, 'w', encoding='utf-8') as f:
        json.dump(polygon_geojson, f, indent=2)
    print(f"Exported {len(polygon_features)} polygon features to {polygon_file}")

    # Export centroid points GeoJSON
    point_geojson = {
        "type": "FeatureCollection",
        "name": "Sierra_Leone_Postal_Zone_Centroids",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": point_features
    }

    point_file = output_file.replace('.geojson', '_centroids.geojson')
    with open(point_file, 'w', encoding='utf-8') as f:
        json.dump(point_geojson, f, indent=2)
    print(f"Exported {len(point_features)} centroid points to {point_file}")


def generate_summary_stats(directory: List[Dict]) -> Dict:
    """Generate summary statistics for the directory."""
    postal_codes = set(d['postal_code'] for d in directory)
    districts = set(d['district_name'] for d in directory)
    regions = set(d['region_name'] for d in directory)
    segment_types = {}

    for d in directory:
        seg = d['segment_type']
        segment_types[seg] = segment_types.get(seg, 0) + 1

    return {
        "total_zones": len(directory),
        "unique_postal_codes": len(postal_codes),
        "unique_districts": len(districts),
        "unique_regions": len(regions),
        "segment_types": segment_types,
        "postal_codes": sorted(list(postal_codes)),
        "districts": sorted(list(districts)),
        "regions": sorted(list(regions))
    }


def main():
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, 'sierra_leone_postal_zones.geojson')

    # Output directory
    output_dir = os.path.join(script_dir, 'address_directory')
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("Sierra Leone Postal Zone Address Directory Generator")
    print("=" * 60)

    # Load data
    print(f"\nLoading postal zones from: {input_file}")
    geojson_data = load_postal_zones(input_file)

    # Generate directory
    print("Generating address directory with centroids...")
    directory = generate_address_directory(geojson_data)

    # Export formats
    print("\nExporting to various formats...")

    # CSV export
    csv_file = os.path.join(output_dir, 'postal_zone_directory.csv')
    export_csv(directory, csv_file)

    # JSON export
    json_file = os.path.join(output_dir, 'postal_zone_directory.json')
    export_json(directory, json_file)

    # GeoJSON for shapefiles
    geojson_file = os.path.join(output_dir, 'postal_zones.geojson')
    export_geojson_for_shapefile(geojson_data, directory, geojson_file)

    # Summary statistics
    stats = generate_summary_stats(directory)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total zones: {stats['total_zones']}")
    print(f"Unique postal codes: {stats['unique_postal_codes']}")
    print(f"Districts: {stats['unique_districts']}")
    print(f"Regions: {stats['unique_regions']}")
    print(f"\nSegment types:")
    for seg_type, count in stats['segment_types'].items():
        print(f"  - {seg_type}: {count}")

    print(f"\nOutput files created in: {output_dir}")
    print("  - postal_zone_directory.csv")
    print("  - postal_zone_directory.json")
    print("  - postal_zones_polygons.geojson (for shapefile conversion)")
    print("  - postal_zones_centroids.geojson (centroid points)")

    # Save summary
    summary_file = os.path.join(output_dir, 'summary.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)
    print(f"  - summary.json")

    print("\n" + "=" * 60)
    print("SHAPEFILE CONVERSION COMMANDS")
    print("=" * 60)
    print("\nUsing ogr2ogr (GDAL):")
    print(f'  ogr2ogr -f "ESRI Shapefile" postal_zones.shp postal_zones_polygons.geojson')
    print(f'  ogr2ogr -f "ESRI Shapefile" postal_centroids.shp postal_zones_centroids.geojson')
    print("\nUsing QGIS:")
    print("  1. Open the GeoJSON file in QGIS")
    print("  2. Right-click layer -> Export -> Save Features As...")
    print("  3. Select 'ESRI Shapefile' as format")


if __name__ == "__main__":
    main()
