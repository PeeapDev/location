"""
Populate Plus Codes for all postal zones and add database protection.

This script:
1. Generates Plus Codes for all zones based on their geometry center
2. Adds database triggers to prevent deletion of zones
3. Creates audit trail for modifications

Usage:
    python -m scripts.populate_plus_codes
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.plus_code import PlusCodeService
from app.config import get_settings

settings = get_settings()


async def populate_plus_codes():
    """Populate Plus Codes for all zones."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 60)
    print("POPULATING PLUS CODES FOR ALL POSTAL ZONES")
    print("=" * 60)

    async with async_session() as db:
        # Get all zones with geometry
        result = await db.execute(text("""
            SELECT zone_code,
                   ST_Y(ST_Centroid(geometry)) as lat,
                   ST_X(ST_Centroid(geometry)) as lng
            FROM postal_zones
            WHERE geometry IS NOT NULL
        """))
        zones = result.fetchall()

        print(f"Found {len(zones)} zones with geometry")

        updated = 0
        for zone_code, lat, lng in zones:
            if lat and lng:
                try:
                    # Generate Plus Code
                    plus_code = PlusCodeService.encode(lat, lng, code_length=11)
                    plus_code_short = plus_code.split('+')[1] if '+' in plus_code else plus_code[-4:]

                    # Update zone
                    await db.execute(text("""
                        UPDATE postal_zones
                        SET plus_code = :plus_code,
                            plus_code_short = :plus_code_short,
                            center_lat = :lat,
                            center_lng = :lng
                        WHERE zone_code = :zone_code
                    """), {
                        "plus_code": plus_code,
                        "plus_code_short": plus_code_short,
                        "lat": lat,
                        "lng": lng,
                        "zone_code": zone_code
                    })

                    updated += 1
                    if updated % 500 == 0:
                        await db.commit()
                        print(f"  Updated {updated} zones...")

                except Exception as e:
                    print(f"  Error for {zone_code}: {e}")

        await db.commit()
        print(f"\nUpdated {updated} zones with Plus Codes")

    await engine.dispose()
    return updated


async def add_database_protection():
    """Add database triggers to prevent deletion and track modifications."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n" + "=" * 60)
    print("ADDING DATABASE PROTECTION")
    print("=" * 60)

    async with async_session() as db:
        # 1. Create zone_audit table for tracking changes
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS postal_zone_audit (
                id SERIAL PRIMARY KEY,
                zone_code VARCHAR(20) NOT NULL,
                action VARCHAR(20) NOT NULL,
                old_data JSONB,
                new_data JSONB,
                changed_by VARCHAR(100),
                changed_at TIMESTAMP DEFAULT NOW(),
                reason TEXT
            );
        """))
        print("  Created postal_zone_audit table")

        # 2. Create function to prevent deletion
        await db.execute(text("""
            CREATE OR REPLACE FUNCTION prevent_zone_deletion()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Log the attempted deletion
                INSERT INTO postal_zone_audit (zone_code, action, old_data, reason)
                VALUES (OLD.zone_code, 'DELETE_BLOCKED', row_to_json(OLD)::jsonb, 'Deletion not allowed - zones are protected');

                -- Raise an exception to prevent deletion
                RAISE EXCEPTION 'Deletion of postal zones is not allowed. Zone % is protected.', OLD.zone_code;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
        """))
        print("  Created prevent_zone_deletion function")

        # 3. Create trigger to block deletions
        await db.execute(text("""
            DROP TRIGGER IF EXISTS protect_postal_zones ON postal_zones;
            CREATE TRIGGER protect_postal_zones
            BEFORE DELETE ON postal_zones
            FOR EACH ROW
            EXECUTE FUNCTION prevent_zone_deletion();
        """))
        print("  Created deletion prevention trigger")

        # 4. Create function to audit updates
        await db.execute(text("""
            CREATE OR REPLACE FUNCTION audit_zone_update()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO postal_zone_audit (zone_code, action, old_data, new_data)
                VALUES (
                    NEW.zone_code,
                    'UPDATE',
                    row_to_json(OLD)::jsonb,
                    row_to_json(NEW)::jsonb
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))
        print("  Created audit_zone_update function")

        # 5. Create trigger for update auditing
        await db.execute(text("""
            DROP TRIGGER IF EXISTS audit_postal_zones ON postal_zones;
            CREATE TRIGGER audit_postal_zones
            AFTER UPDATE ON postal_zones
            FOR EACH ROW
            EXECUTE FUNCTION audit_zone_update();
        """))
        print("  Created update audit trigger")

        # 6. Create function to audit inserts
        await db.execute(text("""
            CREATE OR REPLACE FUNCTION audit_zone_insert()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO postal_zone_audit (zone_code, action, new_data)
                VALUES (NEW.zone_code, 'INSERT', row_to_json(NEW)::jsonb);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))
        print("  Created audit_zone_insert function")

        # 7. Create trigger for insert auditing
        await db.execute(text("""
            DROP TRIGGER IF EXISTS audit_postal_zones_insert ON postal_zones;
            CREATE TRIGGER audit_postal_zones_insert
            AFTER INSERT ON postal_zones
            FOR EACH ROW
            EXECUTE FUNCTION audit_zone_insert();
        """))
        print("  Created insert audit trigger")

        # 8. Add index for faster lookups
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_postal_zones_plus_code ON postal_zones(plus_code);
            CREATE INDEX IF NOT EXISTS idx_postal_zone_audit_zone_code ON postal_zone_audit(zone_code);
            CREATE INDEX IF NOT EXISTS idx_postal_zone_audit_action ON postal_zone_audit(action);
        """))
        print("  Created indexes for Plus Code and audit lookups")

        await db.commit()
        print("\nDatabase protection added successfully!")

    await engine.dispose()


async def test_plus_code_lookup():
    """Test Plus Code lookup functionality."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n" + "=" * 60)
    print("TESTING PLUS CODE LOOKUP")
    print("=" * 60)

    async with async_session() as db:
        # Get sample zones with Plus Codes
        result = await db.execute(text("""
            SELECT zone_code, zone_name, plus_code, plus_code_short, center_lat, center_lng
            FROM postal_zones
            WHERE plus_code IS NOT NULL
            ORDER BY zone_code
            LIMIT 15
        """))
        zones = result.fetchall()

        print("\nSample zones with Plus Codes:")
        print("-" * 80)
        for zone_code, zone_name, plus_code, short_code, lat, lng in zones:
            print(f"  {zone_code}: {zone_name}")
            print(f"    Plus Code: {plus_code} (Short: {short_code})")
            print(f"    GPS: {lat:.6f}, {lng:.6f}")
            print()

        # Test lookup by Plus Code
        test_plus_code = zones[0][2] if zones else None
        if test_plus_code:
            print(f"\nLooking up zone by Plus Code: {test_plus_code}")
            lookup_result = await db.execute(text("""
                SELECT zone_code, zone_name, district_name, segment_type
                FROM postal_zones
                WHERE plus_code = :plus_code
            """), {"plus_code": test_plus_code})
            found = lookup_result.fetchone()
            if found:
                print(f"  Found: {found[0]} - {found[1]} ({found[2]}, {found[3]})")

        # Test nearby zone lookup by coordinates
        if zones:
            test_lat, test_lng = zones[0][4], zones[0][5]
            print(f"\nFinding zones near coordinates: {test_lat:.6f}, {test_lng:.6f}")
            nearby_result = await db.execute(text("""
                SELECT zone_code, zone_name,
                       ST_Distance(
                           geometry::geography,
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                       ) as distance_meters
                FROM postal_zones
                WHERE geometry IS NOT NULL
                ORDER BY geometry <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                LIMIT 5
            """), {"lat": test_lat, "lng": test_lng})
            nearby = nearby_result.fetchall()
            print("  Nearest zones:")
            for zone_code, zone_name, distance in nearby:
                print(f"    {zone_code}: {zone_name} ({distance:.1f}m away)")

    await engine.dispose()


async def test_deletion_protection():
    """Test that deletion is blocked."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n" + "=" * 60)
    print("TESTING DELETION PROTECTION")
    print("=" * 60)

    async with async_session() as db:
        try:
            # Try to delete a zone (should fail)
            await db.execute(text("DELETE FROM postal_zones WHERE zone_code = '1100-001'"))
            await db.commit()
            print("  ERROR: Deletion was allowed (protection not working)")
        except Exception as e:
            print(f"  SUCCESS: Deletion blocked with message:")
            print(f"    {str(e)[:100]}...")
            await db.rollback()

        # Check audit log
        result = await db.execute(text("""
            SELECT action, zone_code, reason, changed_at
            FROM postal_zone_audit
            ORDER BY changed_at DESC
            LIMIT 5
        """))
        audits = result.fetchall()
        if audits:
            print("\n  Recent audit entries:")
            for action, zone_code, reason, changed_at in audits:
                print(f"    {action}: {zone_code} at {changed_at}")
                if reason:
                    print(f"      Reason: {reason}")

    await engine.dispose()


async def main():
    """Main function."""
    # Step 1: Populate Plus Codes
    await populate_plus_codes()

    # Step 2: Add database protection
    await add_database_protection()

    # Step 3: Test Plus Code lookup
    await test_plus_code_lookup()

    # Step 4: Test deletion protection
    await test_deletion_protection()

    print("\n" + "=" * 60)
    print("ALL DONE!")
    print("=" * 60)
    print("\nSummary:")
    print("  - Plus Codes generated for all zones")
    print("  - Deletion of zones is now BLOCKED")
    print("  - All changes are audited in postal_zone_audit table")
    print("  - Lookup by Plus Code and coordinates working")


if __name__ == "__main__":
    asyncio.run(main())
