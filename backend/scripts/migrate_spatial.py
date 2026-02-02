#!/usr/bin/env python3
"""
Migration script for spatial features.

Adds:
- Geohash columns to postal_zones
- Metadata columns (alternate_names, landmarks, etc.)
- Spatial tables (wards, blocks, validation_logs, etc.)
- Populates geohash for existing zones
- Creates search_text for full-text search
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, AsyncSessionLocal


# Geohash encoding (inline to avoid import issues)
BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'


def encode_geohash(latitude: float, longitude: float, precision: int = 9) -> str:
    """Encode latitude/longitude to geohash string."""
    lat_range = (-90.0, 90.0)
    lng_range = (-180.0, 180.0)

    geohash = []
    bits = 0
    bit_count = 0
    is_longitude = True

    while len(geohash) < precision:
        if is_longitude:
            mid = (lng_range[0] + lng_range[1]) / 2
            if longitude >= mid:
                bits = (bits << 1) | 1
                lng_range = (mid, lng_range[1])
            else:
                bits = bits << 1
                lng_range = (lng_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if latitude >= mid:
                bits = (bits << 1) | 1
                lat_range = (mid, lat_range[1])
            else:
                bits = bits << 1
                lat_range = (lat_range[0], mid)

        is_longitude = not is_longitude
        bit_count += 1

        if bit_count == 5:
            geohash.append(BASE32[bits])
            bits = 0
            bit_count = 0

    return ''.join(geohash)


async def add_columns():
    """Add new columns to postal_zones table."""
    async with engine.begin() as conn:
        print("Adding new columns to postal_zones...")

        columns_to_add = [
            ("geohash", "VARCHAR(12)"),
            ("alternate_names", "TEXT[]"),
            ("landmarks", "TEXT[]"),
            ("nearby_pois", "TEXT[]"),
            ("common_references", "TEXT[]"),
            ("local_names", "JSONB"),
            ("search_text", "TEXT"),
            ("validation_status", "VARCHAR(20) DEFAULT 'pending'"),
            ("validation_notes", "TEXT"),
            ("ward_id", "VARCHAR(10)"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"""
                    ALTER TABLE postal_zones
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                """))
                print(f"  Added column: {col_name}")
            except Exception as e:
                print(f"  Column {col_name} might already exist: {e}")

        # Add indexes
        indexes = [
            ("idx_postal_zone_geohash", "geohash"),
            ("idx_postal_zone_ward", "ward_id"),
            ("idx_postal_zone_validation", "validation_status"),
        ]

        for idx_name, col_name in indexes:
            try:
                await conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name}
                    ON postal_zones ({col_name})
                """))
                print(f"  Created index: {idx_name}")
            except Exception as e:
                print(f"  Index {idx_name} might already exist: {e}")

        print("Columns and indexes added successfully!")


async def create_spatial_tables():
    """Create spatial hierarchy tables."""
    async with engine.begin() as conn:
        print("\nCreating spatial tables...")

        # Wards table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS wards (
                ward_id VARCHAR(10) PRIMARY KEY,
                ward_name VARCHAR(100) NOT NULL,
                ward_code VARCHAR(10) NOT NULL,
                district_code INTEGER NOT NULL,
                district_name VARCHAR(100) NOT NULL,
                region_code INTEGER NOT NULL,
                region_name VARCHAR(100) NOT NULL,
                geometry GEOMETRY(POLYGON, 4326),
                center_lat FLOAT,
                center_lng FLOAT,
                geohash VARCHAR(12),
                zone_count INTEGER DEFAULT 0,
                address_count INTEGER DEFAULT 0,
                area_sqkm FLOAT,
                alternate_names TEXT[],
                landmarks TEXT[],
                meta JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        print("  Created table: wards")

        # Blocks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS blocks (
                block_id VARCHAR(20) PRIMARY KEY,
                block_code VARCHAR(5) NOT NULL,
                block_name VARCHAR(100),
                zone_code VARCHAR(8) REFERENCES postal_zones(zone_code),
                ward_id VARCHAR(10) REFERENCES wards(ward_id),
                geometry GEOMETRY(POLYGON, 4326),
                center_lat FLOAT,
                center_lng FLOAT,
                geohash VARCHAR(12),
                block_type VARCHAR(20) DEFAULT 'mixed',
                address_count INTEGER DEFAULT 0,
                building_count INTEGER DEFAULT 0,
                street_names TEXT[],
                landmarks TEXT[],
                meta JSONB,
                address_sequence INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        print("  Created table: blocks")

        # Spatial validation logs
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS spatial_validation_logs (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(20) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                validation_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                message TEXT,
                details JSONB,
                latitude FLOAT,
                longitude FLOAT,
                geohash VARCHAR(12),
                validated_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP,
                resolved_by VARCHAR(100)
            )
        """))
        print("  Created table: spatial_validation_logs")

        # Land boundaries (for land/water validation)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS land_boundaries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                boundary_type VARCHAR(20) NOT NULL,
                geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        print("  Created table: land_boundaries")

        # Spatial anomalies
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS spatial_anomalies (
                id SERIAL PRIMARY KEY,
                anomaly_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                geometry GEOMETRY(GEOMETRY, 4326),
                center_lat FLOAT,
                center_lng FLOAT,
                geohash VARCHAR(12),
                affected_zones TEXT[],
                affected_wards TEXT[],
                description TEXT NOT NULL,
                details JSONB,
                suggested_action TEXT,
                status VARCHAR(20) DEFAULT 'open',
                detected_at TIMESTAMP DEFAULT NOW(),
                resolved_at TIMESTAMP,
                resolved_by VARCHAR(100),
                resolution_notes TEXT
            )
        """))
        print("  Created table: spatial_anomalies")

        # Location metadata for enhanced search
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS location_meta (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(20) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                primary_name VARCHAR(200) NOT NULL,
                alternate_names TEXT[],
                local_names JSONB,
                historical_names TEXT[],
                landmarks TEXT[],
                nearby_pois TEXT[],
                common_references TEXT[],
                search_text TEXT,
                center_lat FLOAT,
                center_lng FLOAT,
                geohash VARCHAR(12),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        print("  Created table: location_meta")

        # Create indexes
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ward_geohash ON wards(geohash)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_ward_district ON wards(district_code)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_block_geohash ON blocks(geohash)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_block_zone ON blocks(zone_code)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_validation_entity ON spatial_validation_logs(entity_type, entity_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_validation_status ON spatial_validation_logs(status)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_meta_entity ON location_meta(entity_type, entity_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_meta_geohash ON location_meta(geohash)"))

        print("  Created indexes")
        print("Spatial tables created successfully!")


async def populate_geohash():
    """Populate geohash for all zones with coordinates."""
    async with AsyncSessionLocal() as session:
        print("\nPopulating geohash for zones...")

        # Get zones without geohash
        result = await session.execute(text("""
            SELECT zone_code, center_lat, center_lng
            FROM postal_zones
            WHERE center_lat IS NOT NULL
            AND center_lng IS NOT NULL
            AND (geohash IS NULL OR geohash = '')
        """))
        zones = result.fetchall()

        print(f"  Found {len(zones)} zones needing geohash")

        count = 0
        for zone_code, lat, lng in zones:
            if lat and lng:
                geohash = encode_geohash(lat, lng, 9)
                await session.execute(
                    text("UPDATE postal_zones SET geohash = :geohash WHERE zone_code = :code"),
                    {"geohash": geohash, "code": zone_code}
                )
                count += 1

                if count % 1000 == 0:
                    await session.commit()
                    print(f"  Updated {count} zones...")

        await session.commit()
        print(f"  Populated geohash for {count} zones")


async def populate_search_text():
    """Populate search_text for full-text search."""
    async with AsyncSessionLocal() as session:
        print("\nPopulating search_text for zones...")

        # Build search_text from zone_name, district_name, region_name
        await session.execute(text("""
            UPDATE postal_zones
            SET search_text = CONCAT_WS(' ',
                zone_name,
                district_name,
                region_name,
                zone_code,
                primary_code,
                plus_code
            )
            WHERE search_text IS NULL OR search_text = ''
        """))

        await session.commit()

        # Count updated
        result = await session.execute(text(
            "SELECT COUNT(*) FROM postal_zones WHERE search_text IS NOT NULL"
        ))
        count = result.scalar()
        print(f"  Populated search_text for {count} zones")


async def main():
    """Run all migrations."""
    print("=" * 60)
    print("SPATIAL FEATURES MIGRATION")
    print("=" * 60)

    await add_columns()
    await create_spatial_tables()
    await populate_geohash()
    await populate_search_text()

    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
