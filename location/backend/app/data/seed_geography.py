"""
Seed script to populate Sierra Leone geography data
Run with: python -m app.data.seed_geography
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.region import Region
from app.models.district import District
from app.models.zone import Zone
from app.data.sierra_leone_geography import (
    REGIONS, DISTRICTS, FREETOWN_ZONES, ZONE_TYPES
)


async def seed_regions(db: AsyncSession) -> dict:
    """Seed regions and return mapping of code to ID"""
    region_map = {}

    for region_data in REGIONS:
        # Check if exists
        from sqlalchemy import select
        result = await db.execute(
            select(Region).where(Region.code == region_data["code"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            region_map[region_data["code"]] = existing.id
            print(f"  Region exists: {region_data['name']}")
        else:
            region = Region(
                code=region_data["code"],
                name=region_data["name"],
                short_code=region_data["short_code"],
                description=region_data.get("description", "")
            )
            db.add(region)
            await db.flush()
            region_map[region_data["code"]] = region.id
            print(f"  Created region: {region_data['name']}")

    return region_map


async def seed_districts(db: AsyncSession, region_map: dict) -> dict:
    """Seed districts and return mapping of full_code to ID"""
    district_map = {}

    for district_name, district_data in DISTRICTS.items():
        region_code = district_data["region"]
        region_id = region_map.get(region_code)

        if not region_id:
            print(f"  Warning: Region {region_code} not found for {district_name}")
            continue

        from sqlalchemy import select
        result = await db.execute(
            select(District).where(District.full_code == district_data["full_code"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            district_map[district_data["full_code"]] = existing.id
            print(f"  District exists: {district_name}")
        else:
            # Collect chiefdoms/wards
            subdivisions = district_data.get("chiefdoms", district_data.get("wards", []))

            district = District(
                region_id=region_id,
                name=district_name,
                short_code=district_data["short_code"],
                full_code=district_data["full_code"],
                numeric_code=district_data.get("numeric_code"),  # NZ-style numeric code
                capital=district_data.get("capital", ""),
                chiefdoms=subdivisions
            )
            db.add(district)
            await db.flush()
            district_map[district_data["full_code"]] = district.id
            print(f"  Created district: {district_name} ({district_data['full_code']})")

    return district_map


async def seed_freetown_zones(db: AsyncSession, district_map: dict):
    """Seed Freetown zones for initial mapping using numeric postal codes"""

    # Get Western Urban district ID
    wu_district_id = district_map.get("WU")
    if not wu_district_id:
        print("  Warning: Western Urban district not found")
        return

    # Western Urban numeric base code is 11 (postal codes 1100-1199)
    base_code = 11
    zone_number = 0  # Start from 00

    for ward_name, ward_data in FREETOWN_ZONES.items():
        for neighborhood in ward_data["neighborhoods"]:
            # Determine zone number based on type
            zone_type = neighborhood.get("type", "mixed")

            from sqlalchemy import select
            # Check if zone exists
            result = await db.execute(
                select(Zone).where(
                    Zone.district_id == wu_district_id,
                    Zone.name == neighborhood["name"]
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"    Zone exists: {neighborhood['name']}")
            else:
                # Create zone with numeric postal code (NZ format)
                # Format: XYZZ where XY=district base (11), ZZ=zone number (00-99)
                primary_code = f"{base_code}{zone_number:02d}"

                zone = Zone(
                    district_id=wu_district_id,
                    zone_number=f"{zone_number:03d}",
                    primary_code=primary_code,
                    name=neighborhood["name"],
                    zone_type=zone_type,
                    ward=ward_name,
                    description=f"{neighborhood['name']} in {ward_name}, Freetown"
                )
                db.add(zone)
                print(f"    Created zone: {primary_code} - {neighborhood['name']}")

            zone_number += 1
            if zone_number > 99:
                print("  Warning: Exceeded 100 zones for Western Urban district")
                break

    await db.flush()


async def seed_all():
    """Main seeding function"""
    print("\n" + "="*60)
    print("SEEDING SIERRA LEONE GEOGRAPHY DATA")
    print("="*60)

    async with AsyncSessionLocal() as db:
        try:
            print("\n[1/3] Seeding Regions...")
            region_map = await seed_regions(db)

            print("\n[2/3] Seeding Districts...")
            district_map = await seed_districts(db, region_map)

            print("\n[3/3] Seeding Freetown Zones...")
            await seed_freetown_zones(db, district_map)

            await db.commit()
            print("\n" + "="*60)
            print("SEEDING COMPLETE!")
            print("="*60)
            print(f"\nSummary:")
            print(f"  - Regions: {len(region_map)}")
            print(f"  - Districts: {len(district_map)}")
            print(f"  - Freetown Zones: ~{sum(len(w['neighborhoods']) for w in FREETOWN_ZONES.values())}")
            print()

        except Exception as e:
            await db.rollback()
            print(f"\nError during seeding: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_all())
