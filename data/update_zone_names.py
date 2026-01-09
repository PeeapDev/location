"""
Update zone names using reverse geocoding from OpenStreetMap Nominatim.
"""

import requests
import time
import psycopg2

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "xeeno_map",
    "user": "xeeno",
    "password": "xeeno_secure_password"
}

def reverse_geocode(lat, lng):
    """Get location name from coordinates using Nominatim."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
            "zoom": 16
        }
        headers = {"User-Agent": "XeenoMap/1.0"}

        response = requests.get(url, params=params, headers=headers)
        data = response.json()

        address = data.get("address", {})

        # Try to get the most specific name
        name = (
            address.get("neighbourhood") or
            address.get("suburb") or
            address.get("hamlet") or
            address.get("village") or
            address.get("town") or
            address.get("city_district") or
            address.get("road") or
            "Unknown"
        )

        return name
    except Exception as e:
        print(f"Error geocoding {lat}, {lng}: {e}")
        return None

def update_zone_names():
    """Update all zone names in the database."""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Get all zones
    cur.execute("""
        SELECT id, primary_code, ST_Y(ST_Centroid(geometry)) as lat, ST_X(ST_Centroid(geometry)) as lng
        FROM zones
        WHERE geometry IS NOT NULL
        ORDER BY id
    """)

    zones = cur.fetchall()
    print(f"Found {len(zones)} zones to update")

    for i, (zone_id, code, lat, lng) in enumerate(zones):
        name = reverse_geocode(lat, lng)

        if name and name != "Unknown":
            # Update the zone name
            cur.execute(
                "UPDATE zones SET name = %s WHERE id = %s",
                (f"{name}", zone_id)
            )
            print(f"[{i+1}/{len(zones)}] Zone {code}: {name}")
        else:
            print(f"[{i+1}/{len(zones)}] Zone {code}: Could not geocode")

        # Rate limit - Nominatim requires 1 request per second
        time.sleep(1.1)

    conn.commit()
    cur.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    update_zone_names()
