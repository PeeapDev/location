"""
Migration script to add numeric_code column to districts table.
Run with: python run_migration.py
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Database URL (same as in config.py)
DATABASE_URL = "postgresql+asyncpg://xeeno:xeeno_secret_2024@localhost:5432/xeeno_map"

# Numeric code mapping for all districts
NUMERIC_CODES = {
    # Western Area (Region 1)
    "WU": "11",   # Western Area Urban (Freetown): 1100-1199
    "WR": "10",   # Western Area Rural: 1000-1099

    # Northern Province (Region 2)
    "NBO": "21",  # Bombali: 2100-2199
    "NFA": "22",  # Falaba: 2200-2299
    "NKO": "23",  # Koinadugu: 2300-2399
    "NTO": "24",  # Tonkolili: 2400-2499
    "NKA": "25",  # Karene: 2500-2599

    # North West Province (Region 3)
    "NWKM": "31", # Kambia: 3100-3199
    "NWPL": "32", # Port Loko: 3200-3299

    # Southern Province (Region 4)
    "SBO": "41",  # Bo: 4100-4199
    "SBN": "42",  # Bonthe: 4200-4299
    "SMO": "43",  # Moyamba: 4300-4399
    "SPU": "44",  # Pujehun: 4400-4499

    # Eastern Province (Region 5)
    "EKL": "51",  # Kailahun: 5100-5199
    "EKE": "52",  # Kenema: 5200-5299
    "EKN": "53",  # Kono: 5300-5399
}


async def run_migration():
    """Run the migration to add numeric_code column."""
    print("\n" + "=" * 60)
    print("RUNNING MIGRATION: Add numeric_code to districts")
    print("=" * 60)

    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Step 1: Check if column exists
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'districts' AND column_name = 'numeric_code'
        """))
        column_exists = result.fetchone() is not None

        if not column_exists:
            # Add the column
            print("\n[1/3] Adding numeric_code column...")
            await conn.execute(text("""
                ALTER TABLE districts ADD COLUMN numeric_code VARCHAR(2)
            """))
            print("  ✓ Column added")

            # Create index
            print("\n[2/3] Creating index...")
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_districts_numeric_code ON districts(numeric_code)
            """))
            print("  ✓ Index created")
        else:
            print("\n[1/3] Column already exists, skipping creation...")
            print("[2/3] Index already exists, skipping...")

        # Step 3: Update districts with numeric codes
        print("\n[3/3] Updating districts with numeric codes...")
        updated = 0
        for full_code, numeric_code in NUMERIC_CODES.items():
            result = await conn.execute(
                text("UPDATE districts SET numeric_code = :nc WHERE full_code = :fc"),
                {"nc": numeric_code, "fc": full_code}
            )
            if result.rowcount > 0:
                print(f"  ✓ {full_code} -> {numeric_code}")
                updated += 1

        # Verify
        print("\n" + "-" * 60)
        print("VERIFICATION:")
        result = await conn.execute(text("""
            SELECT d.name, d.full_code, d.numeric_code, r.name as region
            FROM districts d
            JOIN regions r ON d.region_id = r.id
            ORDER BY d.numeric_code
        """))
        rows = result.fetchall()

        print(f"\n{'District':<25} {'Code':<8} {'Numeric':<8} {'Region':<20}")
        print("-" * 60)
        for row in rows:
            print(f"{row[0]:<25} {row[1]:<8} {row[2] or 'NULL':<8} {row[3]:<20}")

        print("\n" + "=" * 60)
        print(f"MIGRATION COMPLETE! Updated {updated} districts.")
        print("=" * 60 + "\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_migration())
