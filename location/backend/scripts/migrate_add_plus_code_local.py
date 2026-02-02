"""
Migration script to add plus_code_local column to addresses and postal_zones tables.

Run with: python -m scripts.migrate_add_plus_code_local
"""

import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, '.')

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Database URL from environment or default (use 'db' for Docker, 'localhost' for local)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://xeeno:xeeno_secret_2024@db:5432/xeeno_map"
)


async def run_migration():
    """Run the migration to add plus_code_local column."""
    print("\n" + "=" * 60)
    print("RUNNING MIGRATION: Add plus_code_local column")
    print("=" * 60)

    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # =====================================================================
        # Step 1: Add column to addresses table
        # =====================================================================
        print("\n[1/4] Checking addresses table...")

        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'addresses' AND column_name = 'plus_code_local'
        """))
        column_exists = result.fetchone() is not None

        if not column_exists:
            print("  Adding plus_code_local column to addresses...")
            await conn.execute(text("""
                ALTER TABLE addresses
                ADD COLUMN plus_code_local VARCHAR(4)
            """))
            print("  Creating index on addresses.plus_code_local...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_addresses_plus_code_local
                ON addresses(plus_code_local)
            """))
            print("  Done!")
        else:
            print("  Column already exists, skipping...")

        # =====================================================================
        # Step 2: Add column to postal_zones table
        # =====================================================================
        print("\n[2/4] Checking postal_zones table...")

        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'postal_zones' AND column_name = 'plus_code_local'
        """))
        column_exists = result.fetchone() is not None

        if not column_exists:
            print("  Adding plus_code_local column to postal_zones...")
            await conn.execute(text("""
                ALTER TABLE postal_zones
                ADD COLUMN plus_code_local VARCHAR(4)
            """))
            print("  Creating index on postal_zones.plus_code_local...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_postal_zones_plus_code_local
                ON postal_zones(plus_code_local)
            """))
            print("  Done!")
        else:
            print("  Column already exists, skipping...")

        # =====================================================================
        # Step 3: Backfill addresses
        # =====================================================================
        print("\n[3/4] Backfilling addresses.plus_code_local...")

        # Count addresses needing backfill
        result = await conn.execute(text("""
            SELECT COUNT(*)
            FROM addresses
            WHERE plus_code IS NOT NULL
              AND plus_code_local IS NULL
        """))
        count = result.scalar()
        print(f"  Found {count} addresses to backfill...")

        if count > 0:
            # Update using SQL string functions
            # For Plus Code like "6WQPVX22+5WX", extract characters 5-8 (VX22)
            # In PostgreSQL: substring(plus_code from 5 for 4)
            await conn.execute(text("""
                UPDATE addresses
                SET plus_code_local = UPPER(
                    CASE
                        WHEN position('+' in plus_code) > 4 THEN
                            substring(plus_code from position('+' in plus_code) - 4 for 4)
                        ELSE NULL
                    END
                )
                WHERE plus_code IS NOT NULL
                  AND plus_code_local IS NULL
            """))
            print(f"  Backfilled {count} addresses")
        else:
            print("  No addresses to backfill")

        # =====================================================================
        # Step 4: Backfill postal_zones
        # =====================================================================
        print("\n[4/4] Backfilling postal_zones.plus_code_local...")

        result = await conn.execute(text("""
            SELECT COUNT(*)
            FROM postal_zones
            WHERE plus_code IS NOT NULL
              AND plus_code_local IS NULL
        """))
        count = result.scalar()
        print(f"  Found {count} zones to backfill...")

        if count > 0:
            await conn.execute(text("""
                UPDATE postal_zones
                SET plus_code_local = UPPER(
                    CASE
                        WHEN position('+' in plus_code) > 4 THEN
                            substring(plus_code from position('+' in plus_code) - 4 for 4)
                        ELSE NULL
                    END
                )
                WHERE plus_code IS NOT NULL
                  AND plus_code_local IS NULL
            """))
            print(f"  Backfilled {count} zones")
        else:
            print("  No zones to backfill")

        # =====================================================================
        # Verification
        # =====================================================================
        print("\n" + "-" * 60)
        print("VERIFICATION:")

        # Check addresses
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM addresses WHERE plus_code_local IS NOT NULL
        """))
        addr_count = result.scalar()

        result = await conn.execute(text("""
            SELECT plus_code, plus_code_local
            FROM addresses
            WHERE plus_code_local IS NOT NULL
            LIMIT 5
        """))
        sample_addrs = result.fetchall()

        print(f"\nAddresses with plus_code_local: {addr_count}")
        if sample_addrs:
            print("Sample:")
            for plus_code, local in sample_addrs:
                print(f"  {plus_code} -> {local}")

        # Check zones
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM postal_zones WHERE plus_code_local IS NOT NULL
        """))
        zone_count = result.scalar()

        result = await conn.execute(text("""
            SELECT zone_code, plus_code, plus_code_local
            FROM postal_zones
            WHERE plus_code_local IS NOT NULL
            LIMIT 5
        """))
        sample_zones = result.fetchall()

        print(f"\nPostal zones with plus_code_local: {zone_count}")
        if sample_zones:
            print("Sample:")
            for zone_code, plus_code, local in sample_zones:
                print(f"  {zone_code}: {plus_code} -> {local}")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE!")
        print("=" * 60 + "\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
