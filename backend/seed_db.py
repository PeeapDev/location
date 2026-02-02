#!/usr/bin/env python3
"""
Database initialization and seeding script.
Run with: python seed_db.py
"""

import asyncio
import sys
sys.path.insert(0, '/app')

from app.database import init_db, AsyncSessionLocal
from app.models.region import Region
from app.models.district import District
from app.models.zone import Zone
from sqlalchemy import select


# Sierra Leone Geography Data
REGIONS = [
    {"code": "W", "name": "Western Area", "short_code": "W", "description": "Capital region including Freetown"},
    {"code": "N", "name": "Northern Province", "short_code": "N", "description": "Northern region"},
    {"code": "NW", "name": "North West Province", "short_code": "NW", "description": "North Western region"},
    {"code": "S", "name": "Southern Province", "short_code": "S", "description": "Southern region"},
    {"code": "E", "name": "Eastern Province", "short_code": "E", "description": "Eastern region"},
]

DISTRICTS = {
    # WESTERN AREA
    "Western Area Urban": {"region": "W", "short_code": "U", "full_code": "WU", "capital": "Freetown",
        "chiefdoms": ["East I", "East II", "East III", "Central I", "Central II", "West I", "West II", "West III"]},
    "Western Area Rural": {"region": "W", "short_code": "R", "full_code": "WR", "capital": "Waterloo",
        "chiefdoms": ["Koya Rural", "Mountain Rural", "Waterloo Rural", "York Rural"]},

    # NORTHERN PROVINCE
    "Bombali": {"region": "N", "short_code": "BO", "full_code": "NBO", "capital": "Makeni",
        "chiefdoms": ["Biriwa", "Bombali Sebora", "Gbanti Kamaranka", "Gbendembu Ngowahun", "Libeisaygahun",
                     "Magbaimba Ndowahun", "Makari Gbanti", "Paki Masabong", "Safroko Limba", "Sanda Loko",
                     "Sanda Tendaren", "Sella Limba", "Tambakha"]},
    "Falaba": {"region": "N", "short_code": "FA", "full_code": "NFA", "capital": "Falaba",
        "chiefdoms": ["Delemadugu", "Kabelia", "Kaliere", "Kasunko", "Mongo", "Morifindugu", "Neya", "Nyedu", "Seradu", "Sulima"]},
    "Koinadugu": {"region": "N", "short_code": "KO", "full_code": "NKO", "capital": "Kabala",
        "chiefdoms": ["Dembelia Sinkunia", "Diang", "Folosaba Dembelia", "Kasunko", "Mongo", "Neya", "Nieni",
                     "Sengbe", "Wara Wara Bafodia", "Wara Wara Yagala"]},
    "Tonkolili": {"region": "N", "short_code": "TO", "full_code": "NTO", "capital": "Magburaka",
        "chiefdoms": ["Gbonkolenken", "Kafe Simiria", "Kalansogoia", "Kholifa Mabang", "Kholifa Rowalla",
                     "Kunike", "Kunike Barina", "Malal Mara", "Sambaia Bendugu", "Tane", "Yoni"]},
    "Karene": {"region": "N", "short_code": "KA", "full_code": "NKA", "capital": "Kamakwie",
        "chiefdoms": ["Bramaia", "Gbinleh Dixing", "Mambolo", "Samu", "Tambaka", "Tonko Limba"]},

    # NORTH WEST PROVINCE
    "Kambia": {"region": "NW", "short_code": "KM", "full_code": "NWKM", "capital": "Kambia",
        "chiefdoms": ["Bramaia", "Gbinleh Dixing", "Magbema", "Mambolo", "Masungbala", "Samu", "Tonko Limba"]},
    "Port Loko": {"region": "NW", "short_code": "PL", "full_code": "NWPL", "capital": "Port Loko",
        "chiefdoms": ["Buya Romende", "Dibia", "Kaffu Bullom", "Koya", "Lokomasama", "Maforki", "Marampa",
                     "Masimera", "Sanda Magbolonthor", "TMS"]},

    # SOUTHERN PROVINCE
    "Bo": {"region": "S", "short_code": "BO", "full_code": "SBO", "capital": "Bo",
        "chiefdoms": ["Badjia", "Bagbo", "Bagbwe", "Baoma", "Bumpe Ngao", "Gbo", "Jaiama Bongor", "Kakua",
                     "Komboya", "Lugbu", "Niawa Lenga", "Selenga", "Tikonko", "Valunia", "Wonde"]},
    "Bonthe": {"region": "S", "short_code": "BN", "full_code": "SBN", "capital": "Mattru Jong",
        "chiefdoms": ["Bendu Cha", "Bum", "Dema", "Imperri", "Jong", "Kpanda Kemo", "Kwamebai Krim",
                     "Nongoba Bullom", "Sittia", "Sogbini", "Yawbeko"]},
    "Moyamba": {"region": "S", "short_code": "MO", "full_code": "SMO", "capital": "Moyamba",
        "chiefdoms": ["Bagbo", "Bagruwa", "Banta", "Banta Mokele", "Bumpe", "Dasse", "Fakunya", "Kagboro",
                     "Kaiyamba", "Kamajei", "Kargboro", "Kori", "Kowa", "Lower Banta", "Ribbi", "Timdale", "Upper Banta"]},
    "Pujehun": {"region": "S", "short_code": "PU", "full_code": "SPU", "capital": "Pujehun",
        "chiefdoms": ["Barri", "Gallinas Perri", "Kpaka", "Makpele", "Malen", "Mano Sakrim", "Panga Kabonde",
                     "Panga Krim", "Peje Bongre", "Peje West", "Soro Gbema", "Sowa", "Yakemo Kpukumu"]},

    # EASTERN PROVINCE
    "Kailahun": {"region": "E", "short_code": "KL", "full_code": "EKL", "capital": "Kailahun",
        "chiefdoms": ["Dea", "Jawei", "Kissi Kama", "Kissi Teng", "Kissi Tongi", "Luawa", "Malema", "Mandu",
                     "Njaluahun", "Penguia", "Upper Bambara", "Yawei"]},
    "Kenema": {"region": "E", "short_code": "KE", "full_code": "EKE", "capital": "Kenema",
        "chiefdoms": ["Dama", "Dodo", "Gaura", "Gorama Mende", "Kandu Leppeama", "Koya", "Langrama",
                     "Lower Bambara", "Malegohun", "Nomo", "Nongowa", "Simbaru", "Small Bo", "Tunkia", "Wandor"]},
    "Kono": {"region": "E", "short_code": "KN", "full_code": "EKN", "capital": "Koidu",
        "chiefdoms": ["Fiama", "Gbane", "Gbane Kandor", "Gbense", "Gorama Kono", "Kamara", "Lei", "Mafindor",
                     "Nimikoro", "Nimiyama", "Sandor", "Soa", "Tankoro", "Toli"]},
}

FREETOWN_ZONES = {
    "East I": [
        {"name": "Cline Town", "type": "mixed"},
        {"name": "Fourah Bay", "type": "residential"},
        {"name": "Foulah Town", "type": "residential"},
        {"name": "Grassfield", "type": "residential"},
        {"name": "Magazine", "type": "mixed"},
        {"name": "Mamba Ridge", "type": "residential"},
    ],
    "East II": [
        {"name": "Kissy", "type": "mixed"},
        {"name": "Kissy Brook", "type": "residential"},
        {"name": "Kissy Mess Mess", "type": "residential"},
        {"name": "Wellington", "type": "mixed"},
        {"name": "Portee", "type": "residential"},
    ],
    "East III": [
        {"name": "Calaba Town", "type": "mixed"},
        {"name": "Allen Town", "type": "residential"},
        {"name": "Grafton", "type": "residential"},
        {"name": "Hastings", "type": "mixed"},
    ],
    "Central I": [
        {"name": "Tower Hill", "type": "commercial"},
        {"name": "Wilberforce", "type": "residential"},
        {"name": "Signal Hill", "type": "residential"},
        {"name": "Hill Station", "type": "residential"},
        {"name": "Brookfields", "type": "mixed"},
    ],
    "Central II": [
        {"name": "Kroo Town", "type": "residential"},
        {"name": "Congo Town", "type": "residential"},
        {"name": "Tengbeh Town", "type": "residential"},
        {"name": "Kingtom", "type": "mixed"},
        {"name": "Ascension Town", "type": "residential"},
    ],
    "West I": [
        {"name": "Aberdeen", "type": "mixed"},
        {"name": "Murray Town", "type": "residential"},
        {"name": "Cockle Bay", "type": "residential"},
        {"name": "Lakka", "type": "residential"},
    ],
    "West II": [
        {"name": "Lumley", "type": "mixed"},
        {"name": "Juba", "type": "residential"},
        {"name": "Wilkinson Road", "type": "commercial"},
        {"name": "Spur Road", "type": "commercial"},
    ],
    "West III": [
        {"name": "Goderich", "type": "residential"},
        {"name": "Tokeh", "type": "residential"},
        {"name": "Hamilton", "type": "residential"},
        {"name": "Sussex", "type": "residential"},
    ],
}


async def seed_all():
    """Seed all geography data"""
    print("\n" + "=" * 60)
    print("INITIALIZING DATABASE AND SEEDING GEOGRAPHY DATA")
    print("=" * 60)

    # Initialize database tables
    print("\n[0/3] Initializing database tables...")
    await init_db()
    print("  Database tables initialized!")

    async with AsyncSessionLocal() as db:
        try:
            # Seed regions
            print("\n[1/3] Seeding Regions...")
            region_map = {}
            for region_data in REGIONS:
                result = await db.execute(select(Region).where(Region.code == region_data["code"]))
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

            # Seed districts
            print("\n[2/3] Seeding Districts...")
            district_map = {}
            for district_name, district_data in DISTRICTS.items():
                region_code = district_data["region"]
                region_id = region_map.get(region_code)

                if not region_id:
                    print(f"  Warning: Region {region_code} not found for {district_name}")
                    continue

                result = await db.execute(select(District).where(District.full_code == district_data["full_code"]))
                existing = result.scalar_one_or_none()

                if existing:
                    district_map[district_data["full_code"]] = existing.id
                    print(f"  District exists: {district_name}")
                else:
                    district = District(
                        region_id=region_id,
                        name=district_name,
                        code=district_data["short_code"][0],
                        short_code=district_data["short_code"],
                        full_code=district_data["full_code"],
                        capital=district_data.get("capital", ""),
                        chiefdoms=district_data.get("chiefdoms", [])
                    )
                    db.add(district)
                    await db.flush()
                    district_map[district_data["full_code"]] = district.id
                    print(f"  Created district: {district_name} ({district_data['full_code']})")

            # Seed Freetown zones
            print("\n[3/3] Seeding Freetown Zones...")
            wu_district_id = district_map.get("WU")

            if wu_district_id:
                zone_number = 1
                for ward_name, neighborhoods in FREETOWN_ZONES.items():
                    for neighborhood in neighborhoods:
                        result = await db.execute(
                            select(Zone).where(Zone.district_id == wu_district_id, Zone.name == neighborhood["name"])
                        )
                        existing = result.scalar_one_or_none()

                        if existing:
                            print(f"    Zone exists: {neighborhood['name']}")
                        else:
                            primary_code = f"WU-{zone_number:03d}"
                            zone = Zone(
                                district_id=wu_district_id,
                                zone_number=f"{zone_number:03d}",
                                primary_code=primary_code,
                                name=neighborhood["name"],
                                zone_type=neighborhood.get("type", "mixed"),
                                ward=ward_name,
                                description=f"{neighborhood['name']} in {ward_name}, Freetown"
                            )
                            db.add(zone)
                            print(f"    Created zone: {primary_code} - {neighborhood['name']}")

                        zone_number += 1
            else:
                print("  Warning: Western Urban district not found!")

            await db.commit()

            print("\n" + "=" * 60)
            print("SEEDING COMPLETE!")
            print("=" * 60)
            print(f"\nSummary:")
            print(f"  - Regions: {len(region_map)}")
            print(f"  - Districts: {len(district_map)}")
            print(f"  - Freetown Zones: {sum(len(n) for n in FREETOWN_ZONES.values())}")
            print()

        except Exception as e:
            await db.rollback()
            print(f"\nError during seeding: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(seed_all())
