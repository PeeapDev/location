"""
Convert OSM Overpass API response to GeoJSON for QGIS
Handles the Western Area Urban + Rural boundaries
"""

import json

def extract_polygon_from_relation(relation):
    """
    Extract polygon coordinates from an OSM relation.
    Combines all outer way geometries into a single polygon.
    """
    coordinates = []

    for member in relation.get("members", []):
        if member.get("role") == "outer" and member.get("geometry"):
            for point in member["geometry"]:
                coordinates.append([point["lon"], point["lat"]])

    # Close the polygon if not already closed
    if coordinates and coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])

    return coordinates

def create_geojson_from_osm(osm_data):
    """
    Create a GeoJSON FeatureCollection from OSM Overpass response.
    """
    features = []

    for element in osm_data.get("elements", []):
        if element.get("type") == "relation":
            tags = element.get("tags", {})
            name = tags.get("name", "Unknown")

            coords = extract_polygon_from_relation(element)

            if coords:
                feature = {
                    "type": "Feature",
                    "properties": {
                        "name": name,
                        "admin_level": tags.get("admin_level", ""),
                        "osm_id": element.get("id"),
                        "wikidata": tags.get("wikidata", ""),
                        "wikipedia": tags.get("wikipedia", "")
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [coords]
                    }
                }
                features.append(feature)
                print(f"Extracted: {name} with {len(coords)} points")

    return {
        "type": "FeatureCollection",
        "features": features
    }

# The OSM data you provided (I'll use a simplified version for file size)
# For actual use, paste the full JSON into a file called 'osm_response.json'

if __name__ == "__main__":
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "osm_response.json")
    output_file = os.path.join(script_dir, "western_area_districts.geojson")

    if os.path.exists(input_file):
        print(f"Reading from {input_file}...")
        with open(input_file, 'r', encoding='utf-8') as f:
            osm_data = json.load(f)

        geojson = create_geojson_from_osm(osm_data)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=2)

        print(f"\nSaved to: {output_file}")
        print(f"Features created: {len(geojson['features'])}")
    else:
        print(f"Please save your OSM response to: {input_file}")
        print("Then run this script again.")
