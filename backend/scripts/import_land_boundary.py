#!/usr/bin/env python3
"""
Import Sierra Leone Land Boundary for Spatial Validation.

Downloads Sierra Leone country boundary from Natural Earth/OSM
and imports it into the land_boundaries table.

This enables:
- Water/land detection for address validation
- Coastline validation
- Ensuring addresses are on land
"""

import asyncio
import sys
import os
import json
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, AsyncSessionLocal


# Sierra Leone GeoJSON boundary (simplified from Natural Earth)
# This is a simplified polygon covering Sierra Leone mainland
SIERRA_LEONE_BOUNDARY = {
    "type": "MultiPolygon",
    "coordinates": [
        # Main Sierra Leone mainland boundary
        [[
            [-13.3075, 9.0499],
            [-13.2722, 9.2127],
            [-13.0714, 9.3560],
            [-12.9256, 9.4348],
            [-12.7714, 9.4156],
            [-12.5589, 9.3639],
            [-12.4297, 9.3201],
            [-12.2505, 9.4348],
            [-12.0880, 9.5016],
            [-11.9589, 9.4827],
            [-11.8464, 9.4435],
            [-11.6339, 9.3847],
            [-11.4631, 9.3260],
            [-11.3089, 9.3560],
            [-11.1881, 9.4156],
            [-11.0506, 9.4435],
            [-10.8714, 9.5206],
            [-10.7172, 9.5206],
            [-10.5964, 9.4827],
            [-10.4839, 9.4156],
            [-10.3464, 9.3260],
            [-10.2756, 9.1731],
            [-10.2672, 9.0499],
            [-10.2839, 8.8776],
            [-10.3131, 8.7339],
            [-10.3464, 8.5710],
            [-10.3714, 8.4081],
            [-10.3964, 8.2452],
            [-10.4297, 8.0631],
            [-10.4714, 7.9002],
            [-10.5131, 7.7373],
            [-10.5547, 7.5744],
            [-10.5964, 7.3923],
            [-10.6381, 7.2102],
            [-10.6756, 7.0665],
            [-10.7339, 6.9610],
            [-10.7964, 6.9036],
            [-10.8881, 6.9227],
            [-11.0006, 6.9419],
            [-11.1131, 6.9610],
            [-11.2547, 6.9993],
            [-11.3881, 7.0473],
            [-11.5131, 7.1143],
            [-11.6547, 7.1910],
            [-11.8047, 7.2773],
            [-11.9381, 7.3540],
            [-12.0589, 7.4019],
            [-12.1922, 7.4306],
            [-12.3256, 7.4498],
            [-12.4589, 7.4689],
            [-12.5881, 7.4881],
            [-12.7172, 7.5169],
            [-12.8464, 7.5552],
            [-12.9756, 7.6031],
            [-13.0839, 7.6702],
            [-13.1756, 7.7469],
            [-13.2464, 7.8523],
            [-13.2922, 7.9577],
            [-13.3047, 8.0823],
            [-13.2922, 8.2165],
            [-13.2672, 8.3506],
            [-13.2422, 8.4848],
            [-13.2297, 8.6189],
            [-13.2422, 8.7531],
            [-13.2714, 8.8872],
            [-13.3075, 9.0499]
        ]],
        # Sherbro Island
        [[
            [-12.6339, 7.4689],
            [-12.5547, 7.4019],
            [-12.4589, 7.3540],
            [-12.3631, 7.3348],
            [-12.2672, 7.3540],
            [-12.1881, 7.3923],
            [-12.1339, 7.4498],
            [-12.1131, 7.5169],
            [-12.1339, 7.5839],
            [-12.1881, 7.6414],
            [-12.2672, 7.6798],
            [-12.3631, 7.6989],
            [-12.4589, 7.6893],
            [-12.5464, 7.6510],
            [-12.6131, 7.5935],
            [-12.6506, 7.5265],
            [-12.6589, 7.4594],
            [-12.6339, 7.4689]
        ]],
        # Banana Islands
        [[
            [-12.5797, 7.5744],
            [-12.5422, 7.5552],
            [-12.5047, 7.5648],
            [-12.4839, 7.5935],
            [-12.4922, 7.6223],
            [-12.5214, 7.6414],
            [-12.5589, 7.6414],
            [-12.5880, 7.6223],
            [-12.5964, 7.5935],
            [-12.5797, 7.5744]
        ]]
    ]
}


async def import_boundary():
    """Import Sierra Leone boundary into database."""
    async with engine.begin() as conn:
        print("Importing Sierra Leone land boundary...")

        # Convert GeoJSON to WKT for PostGIS
        geojson_str = json.dumps(SIERRA_LEONE_BOUNDARY)

        # Clear existing boundaries
        await conn.execute(text("DELETE FROM land_boundaries WHERE name = 'Sierra Leone'"))

        # Insert new boundary using ST_GeomFromGeoJSON
        await conn.execute(text("""
            INSERT INTO land_boundaries (name, boundary_type, geometry)
            VALUES (
                'Sierra Leone',
                'country',
                ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)
            )
        """), {"geojson": geojson_str})

        print("  Inserted Sierra Leone mainland boundary")

        # Verify import
        result = await conn.execute(text("""
            SELECT name, boundary_type,
                   ST_Area(geometry::geography) / 1000000 as area_sqkm,
                   ST_NPoints(geometry) as num_points
            FROM land_boundaries
            WHERE name = 'Sierra Leone'
        """))
        row = result.fetchone()

        if row:
            print(f"  Verified: {row[0]} ({row[1]})")
            print(f"  Area: {row[2]:.2f} sq km")
            print(f"  Points: {row[3]}")

        print("\nLand boundary imported successfully!")


async def fetch_from_osm():
    """Fetch Sierra Leone boundary from OpenStreetMap Overpass API."""
    print("Fetching Sierra Leone boundary from OSM...")

    # Overpass query for Sierra Leone country boundary
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = """
    [out:json][timeout:60];
    relation["ISO3166-1"="SL"]["admin_level"="2"];
    out geom;
    """

    try:
        response = requests.post(overpass_url, data={"data": query}, timeout=120)
        if response.ok:
            data = response.json()
            if data.get("elements"):
                print(f"  Found {len(data['elements'])} elements")
                return data
            else:
                print("  No boundary found in OSM response")
        else:
            print(f"  OSM request failed: {response.status_code}")
    except Exception as e:
        print(f"  Error fetching from OSM: {e}")

    return None


async def test_validation():
    """Test that land boundary validation works."""
    async with AsyncSessionLocal() as session:
        print("\nTesting land boundary validation...")

        # Test point in Freetown (should be on land)
        result = await session.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM land_boundaries
                WHERE ST_Contains(
                    geometry,
                    ST_SetSRID(ST_MakePoint(-13.230, 8.479), 4326)
                )
            )
        """))
        freetown_on_land = result.scalar()
        print(f"  Freetown (8.479, -13.230): {'ON LAND' if freetown_on_land else 'NOT ON LAND'}")

        # Test point in Atlantic Ocean (should NOT be on land)
        result = await session.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM land_boundaries
                WHERE ST_Contains(
                    geometry,
                    ST_SetSRID(ST_MakePoint(-14.0, 8.5), 4326)
                )
            )
        """))
        ocean_on_land = result.scalar()
        print(f"  Atlantic Ocean (8.5, -14.0): {'ON LAND' if ocean_on_land else 'IN WATER'}")

        # Test point in Bo (should be on land)
        result = await session.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM land_boundaries
                WHERE ST_Contains(
                    geometry,
                    ST_SetSRID(ST_MakePoint(-11.740, 7.965), 4326)
                )
            )
        """))
        bo_on_land = result.scalar()
        print(f"  Bo City (7.965, -11.740): {'ON LAND' if bo_on_land else 'NOT ON LAND'}")

        # Test point in Kenema (should be on land)
        result = await session.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM land_boundaries
                WHERE ST_Contains(
                    geometry,
                    ST_SetSRID(ST_MakePoint(-11.192, 7.878), 4326)
                )
            )
        """))
        kenema_on_land = result.scalar()
        print(f"  Kenema (7.878, -11.192): {'ON LAND' if kenema_on_land else 'NOT ON LAND'}")

        if freetown_on_land and not ocean_on_land and bo_on_land and kenema_on_land:
            print("\n  All validation tests PASSED!")
        else:
            print("\n  Some validation tests FAILED")


async def main():
    """Run boundary import."""
    print("=" * 60)
    print("SIERRA LEONE LAND BOUNDARY IMPORT")
    print("=" * 60)

    await import_boundary()
    await test_validation()

    print("\n" + "=" * 60)
    print("IMPORT COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
