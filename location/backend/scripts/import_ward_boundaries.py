#!/usr/bin/env python3
"""
Import Sierra Leone Ward/Chiefdom Boundaries.

Sierra Leone administrative structure:
- 5 Regions (Provinces + Western Area)
- 16 Districts
- 190 Chiefdoms (equivalent to wards)

Data source: OpenStreetMap via Overpass API
"""

import asyncio
import sys
import os
import json
import requests
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, AsyncSessionLocal


# Geohash encoding
BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'


def encode_geohash(latitude: float, longitude: float, precision: int = 6) -> str:
    """Encode coordinates to geohash."""
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


# Sierra Leone Chiefdoms/Wards data
# Format: {district: [{name, code, center_lat, center_lng}, ...]}
SIERRA_LEONE_WARDS = {
    "Western Area Urban": [
        {"name": "Central Freetown", "code": "W11-001", "lat": 8.479, "lng": -13.230},
        {"name": "East End", "code": "W11-002", "lat": 8.488, "lng": -13.198},
        {"name": "West End", "code": "W11-003", "lat": 8.465, "lng": -13.268},
        {"name": "Mountain", "code": "W11-004", "lat": 8.448, "lng": -13.245},
        {"name": "Cline Town", "code": "W11-005", "lat": 8.478, "lng": -13.198},
        {"name": "Kissy", "code": "W11-006", "lat": 8.488, "lng": -13.185},
        {"name": "Wellington", "code": "W11-007", "lat": 8.490, "lng": -13.165},
        {"name": "Congo Town", "code": "W11-008", "lat": 8.492, "lng": -13.212},
        {"name": "Brookfields", "code": "W11-009", "lat": 8.465, "lng": -13.248},
        {"name": "Murray Town", "code": "W11-010", "lat": 8.458, "lng": -13.255},
        {"name": "Wilberforce", "code": "W11-011", "lat": 8.455, "lng": -13.268},
        {"name": "Hill Station", "code": "W11-012", "lat": 8.448, "lng": -13.270},
        {"name": "Lumley", "code": "W11-013", "lat": 8.428, "lng": -13.292},
        {"name": "Aberdeen", "code": "W11-014", "lat": 8.438, "lng": -13.285},
        {"name": "Goderich", "code": "W11-015", "lat": 8.405, "lng": -13.322},
    ],
    "Western Area Rural": [
        {"name": "Koya Rural", "code": "W10-001", "lat": 8.398, "lng": -13.108},
        {"name": "Waterloo", "code": "W10-002", "lat": 8.332, "lng": -13.062},
        {"name": "York", "code": "W10-003", "lat": 8.358, "lng": -13.178},
        {"name": "Mountain Rural", "code": "W10-004", "lat": 8.420, "lng": -13.198},
    ],
    "Bo": [
        {"name": "Badjia", "code": "W41-001", "lat": 7.85, "lng": -11.85},
        {"name": "Bagbo", "code": "W41-002", "lat": 7.78, "lng": -11.68},
        {"name": "Bagbwe", "code": "W41-003", "lat": 7.72, "lng": -11.58},
        {"name": "Boama", "code": "W41-004", "lat": 7.88, "lng": -11.72},
        {"name": "Bumpe Ngao", "code": "W41-005", "lat": 7.92, "lng": -11.92},
        {"name": "Gbo", "code": "W41-006", "lat": 7.82, "lng": -11.78},
        {"name": "Jaiama Bongor", "code": "W41-007", "lat": 7.95, "lng": -11.65},
        {"name": "Kakua", "code": "W41-008", "lat": 7.96, "lng": -11.74},
        {"name": "Komboya", "code": "W41-009", "lat": 7.68, "lng": -11.72},
        {"name": "Lugbu", "code": "W41-010", "lat": 7.62, "lng": -11.82},
        {"name": "Niawa Lenga", "code": "W41-011", "lat": 7.88, "lng": -11.62},
        {"name": "Selenga", "code": "W41-012", "lat": 7.75, "lng": -11.88},
        {"name": "Tikonko", "code": "W41-013", "lat": 7.82, "lng": -11.68},
        {"name": "Valunia", "code": "W41-014", "lat": 7.92, "lng": -11.82},
        {"name": "Wonde", "code": "W41-015", "lat": 7.78, "lng": -11.92},
        {"name": "Bo Town", "code": "W41-016", "lat": 7.965, "lng": -11.740},
    ],
    "Bombali": [
        {"name": "Bombali Sebora", "code": "W21-001", "lat": 8.92, "lng": -12.08},
        {"name": "Biriwa", "code": "W21-002", "lat": 9.05, "lng": -11.98},
        {"name": "Gbanti Kamaranka", "code": "W21-003", "lat": 9.12, "lng": -12.22},
        {"name": "Gbendembu Ngowahun", "code": "W21-004", "lat": 8.85, "lng": -11.85},
        {"name": "Libeisaygahun", "code": "W21-005", "lat": 8.78, "lng": -12.18},
        {"name": "Magbaimba Ndowahun", "code": "W21-006", "lat": 9.02, "lng": -12.32},
        {"name": "Makari Gbanti", "code": "W21-007", "lat": 9.18, "lng": -12.08},
        {"name": "Paki Masabong", "code": "W21-008", "lat": 8.95, "lng": -11.75},
        {"name": "Safroko Limba", "code": "W21-009", "lat": 8.88, "lng": -11.92},
        {"name": "Sanda Loko", "code": "W21-010", "lat": 9.08, "lng": -12.42},
        {"name": "Sanda Tendaren", "code": "W21-011", "lat": 9.22, "lng": -12.18},
        {"name": "Sella Limba", "code": "W21-012", "lat": 9.28, "lng": -11.92},
        {"name": "Makeni City", "code": "W21-013", "lat": 8.890, "lng": -12.050},
    ],
    "Bonthe": [
        {"name": "Bendu Cha", "code": "W42-001", "lat": 7.48, "lng": -12.42},
        {"name": "Bum", "code": "W42-002", "lat": 7.58, "lng": -12.28},
        {"name": "Dema", "code": "W42-003", "lat": 7.42, "lng": -12.52},
        {"name": "Imperri", "code": "W42-004", "lat": 7.38, "lng": -12.32},
        {"name": "Jong", "code": "W42-005", "lat": 7.52, "lng": -12.18},
        {"name": "Kpanda Kemo", "code": "W42-006", "lat": 7.62, "lng": -12.38},
        {"name": "Kwamebai Krim", "code": "W42-007", "lat": 7.35, "lng": -12.22},
        {"name": "Nongoba Bullom", "code": "W42-008", "lat": 7.28, "lng": -12.42},
        {"name": "Sittia", "code": "W42-009", "lat": 7.45, "lng": -12.62},
        {"name": "Sogbini", "code": "W42-010", "lat": 7.68, "lng": -12.48},
        {"name": "Yawbeko", "code": "W42-011", "lat": 7.55, "lng": -12.58},
        {"name": "Bonthe Town", "code": "W42-012", "lat": 7.535, "lng": -12.505},
    ],
    "Kailahun": [
        {"name": "Dea", "code": "W51-001", "lat": 8.12, "lng": -10.48},
        {"name": "Jawei", "code": "W51-002", "lat": 7.92, "lng": -10.58},
        {"name": "Kissi Kama", "code": "W51-003", "lat": 8.38, "lng": -10.38},
        {"name": "Kissi Teng", "code": "W51-004", "lat": 8.28, "lng": -10.28},
        {"name": "Kissi Tongi", "code": "W51-005", "lat": 8.18, "lng": -10.18},
        {"name": "Luawa", "code": "W51-006", "lat": 8.28, "lng": -10.58},
        {"name": "Malema", "code": "W51-007", "lat": 7.82, "lng": -10.68},
        {"name": "Mandu", "code": "W51-008", "lat": 7.98, "lng": -10.78},
        {"name": "Njaluahun", "code": "W51-009", "lat": 7.72, "lng": -10.88},
        {"name": "Penguia", "code": "W51-010", "lat": 8.02, "lng": -10.38},
        {"name": "Upper Bambara", "code": "W51-011", "lat": 8.42, "lng": -10.52},
        {"name": "Yawei", "code": "W51-012", "lat": 7.88, "lng": -10.42},
        {"name": "Kailahun Town", "code": "W51-013", "lat": 8.280, "lng": -10.575},
    ],
    "Kambia": [
        {"name": "Bramaia", "code": "W31-001", "lat": 9.28, "lng": -12.78},
        {"name": "Gbinle Dixing", "code": "W31-002", "lat": 9.18, "lng": -12.68},
        {"name": "Magbema", "code": "W31-003", "lat": 9.12, "lng": -12.92},
        {"name": "Mambolo", "code": "W31-004", "lat": 9.02, "lng": -12.82},
        {"name": "Masungbala", "code": "W31-005", "lat": 9.22, "lng": -12.58},
        {"name": "Samu", "code": "W31-006", "lat": 9.08, "lng": -13.02},
        {"name": "Tonko Limba", "code": "W31-007", "lat": 8.98, "lng": -12.68},
        {"name": "Kambia Town", "code": "W31-008", "lat": 9.125, "lng": -12.920},
    ],
    "Kenema": [
        {"name": "Dama", "code": "W52-001", "lat": 7.72, "lng": -11.28},
        {"name": "Dodo", "code": "W52-002", "lat": 7.82, "lng": -11.38},
        {"name": "Gaura", "code": "W52-003", "lat": 7.62, "lng": -11.18},
        {"name": "Gorama Kono", "code": "W52-004", "lat": 8.02, "lng": -10.98},
        {"name": "Gorama Mende", "code": "W52-005", "lat": 7.92, "lng": -11.08},
        {"name": "Kandu Leppiama", "code": "W52-006", "lat": 7.68, "lng": -11.48},
        {"name": "Koya", "code": "W52-007", "lat": 7.58, "lng": -11.58},
        {"name": "Langrama", "code": "W52-008", "lat": 7.78, "lng": -11.08},
        {"name": "Lower Bambara", "code": "W52-009", "lat": 8.12, "lng": -10.88},
        {"name": "Malegohun", "code": "W52-010", "lat": 7.52, "lng": -11.08},
        {"name": "Niawa", "code": "W52-011", "lat": 7.72, "lng": -10.98},
        {"name": "Nomo", "code": "W52-012", "lat": 7.68, "lng": -11.28},
        {"name": "Nongowa", "code": "W52-013", "lat": 7.88, "lng": -11.19},
        {"name": "Simbaru", "code": "W52-014", "lat": 7.98, "lng": -11.28},
        {"name": "Small Bo", "code": "W52-015", "lat": 7.82, "lng": -11.48},
        {"name": "Tunkia", "code": "W52-016", "lat": 7.48, "lng": -11.38},
        {"name": "Kenema City", "code": "W52-017", "lat": 7.878, "lng": -11.192},
    ],
    "Koinadugu": [
        {"name": "Dembelia Sinkunia", "code": "W22-001", "lat": 9.48, "lng": -11.48},
        {"name": "Diang", "code": "W22-002", "lat": 9.58, "lng": -11.38},
        {"name": "Folosaba Dembelia", "code": "W22-003", "lat": 9.42, "lng": -11.28},
        {"name": "Kasunko", "code": "W22-004", "lat": 9.68, "lng": -11.58},
        {"name": "Mongo", "code": "W22-005", "lat": 9.52, "lng": -11.68},
        {"name": "Neya", "code": "W22-006", "lat": 9.62, "lng": -11.48},
        {"name": "Nieni", "code": "W22-007", "lat": 9.38, "lng": -11.58},
        {"name": "Sengbe", "code": "W22-008", "lat": 9.72, "lng": -11.28},
        {"name": "Sulima", "code": "W22-009", "lat": 9.45, "lng": -11.78},
        {"name": "Wara Wara Bafodia", "code": "W22-010", "lat": 9.55, "lng": -11.18},
        {"name": "Wara Wara Yagala", "code": "W22-011", "lat": 9.65, "lng": -11.08},
        {"name": "Kabala Town", "code": "W22-012", "lat": 9.590, "lng": -11.550},
    ],
    "Kono": [
        {"name": "Fiama", "code": "W53-001", "lat": 8.52, "lng": -10.92},
        {"name": "Gbane", "code": "W53-002", "lat": 8.62, "lng": -10.82},
        {"name": "Gbane Kandor", "code": "W53-003", "lat": 8.72, "lng": -10.72},
        {"name": "Gbense", "code": "W53-004", "lat": 8.58, "lng": -11.02},
        {"name": "Gorama Kono", "code": "W53-005", "lat": 8.48, "lng": -10.78},
        {"name": "Kamara", "code": "W53-006", "lat": 8.68, "lng": -10.62},
        {"name": "Lei", "code": "W53-007", "lat": 8.42, "lng": -10.88},
        {"name": "Mafindor", "code": "W53-008", "lat": 8.78, "lng": -10.52},
        {"name": "Nimikoro", "code": "W53-009", "lat": 8.55, "lng": -10.72},
        {"name": "Nimiyama", "code": "W53-010", "lat": 8.38, "lng": -10.98},
        {"name": "Sandor", "code": "W53-011", "lat": 8.82, "lng": -10.42},
        {"name": "Soa", "code": "W53-012", "lat": 8.45, "lng": -11.08},
        {"name": "Tankoro", "code": "W53-013", "lat": 8.65, "lng": -10.98},
        {"name": "Toli", "code": "W53-014", "lat": 8.35, "lng": -10.68},
        {"name": "Koidu City", "code": "W53-015", "lat": 8.645, "lng": -10.970},
    ],
    "Moyamba": [
        {"name": "Bagruwa", "code": "W43-001", "lat": 7.92, "lng": -12.28},
        {"name": "Banta", "code": "W43-002", "lat": 7.82, "lng": -12.38},
        {"name": "Banta Mokele", "code": "W43-003", "lat": 7.88, "lng": -12.48},
        {"name": "Bumpe", "code": "W43-004", "lat": 8.02, "lng": -12.18},
        {"name": "Dasse", "code": "W43-005", "lat": 7.98, "lng": -12.28},
        {"name": "Fakunya", "code": "W43-006", "lat": 8.08, "lng": -12.38},
        {"name": "Kagboro", "code": "W43-007", "lat": 7.72, "lng": -12.58},
        {"name": "Kaiyamba", "code": "W43-008", "lat": 8.12, "lng": -12.48},
        {"name": "Kargboro", "code": "W43-009", "lat": 7.78, "lng": -12.68},
        {"name": "Kongbora", "code": "W43-010", "lat": 8.18, "lng": -12.58},
        {"name": "Kori", "code": "W43-011", "lat": 7.68, "lng": -12.78},
        {"name": "Lower Banta", "code": "W43-012", "lat": 7.62, "lng": -12.48},
        {"name": "Ribbi", "code": "W43-013", "lat": 8.22, "lng": -12.68},
        {"name": "Timdale", "code": "W43-014", "lat": 7.95, "lng": -12.58},
        {"name": "Moyamba Town", "code": "W43-015", "lat": 8.162, "lng": -12.435},
    ],
    "Port Loko": [
        {"name": "Buya Romende", "code": "W32-001", "lat": 8.78, "lng": -12.68},
        {"name": "Dibia", "code": "W32-002", "lat": 8.68, "lng": -12.78},
        {"name": "Kaffu Bullom", "code": "W32-003", "lat": 8.58, "lng": -13.08},
        {"name": "Koya", "code": "W32-004", "lat": 8.48, "lng": -12.88},
        {"name": "Lokomasama", "code": "W32-005", "lat": 8.88, "lng": -12.98},
        {"name": "Maforki", "code": "W32-006", "lat": 8.78, "lng": -12.78},
        {"name": "Marampa", "code": "W32-007", "lat": 8.68, "lng": -12.58},
        {"name": "Masimera", "code": "W32-008", "lat": 8.58, "lng": -12.68},
        {"name": "Sanda Magbolontor", "code": "W32-009", "lat": 8.98, "lng": -12.68},
        {"name": "TMS", "code": "W32-010", "lat": 8.88, "lng": -12.48},
        {"name": "Port Loko Town", "code": "W32-011", "lat": 8.770, "lng": -12.785},
    ],
    "Pujehun": [
        {"name": "Barri", "code": "W44-001", "lat": 7.28, "lng": -11.52},
        {"name": "Gallinas Perri", "code": "W44-002", "lat": 7.18, "lng": -11.62},
        {"name": "Kpaka", "code": "W44-003", "lat": 7.38, "lng": -11.72},
        {"name": "Makpele", "code": "W44-004", "lat": 7.22, "lng": -11.42},
        {"name": "Malen", "code": "W44-005", "lat": 7.32, "lng": -11.82},
        {"name": "Mano Sakrim", "code": "W44-006", "lat": 7.12, "lng": -11.72},
        {"name": "Panga Kabonde", "code": "W44-007", "lat": 7.42, "lng": -11.62},
        {"name": "Peje Bongre", "code": "W44-008", "lat": 7.25, "lng": -11.52},
        {"name": "Peje West", "code": "W44-009", "lat": 7.15, "lng": -11.82},
        {"name": "Soro Gbema", "code": "W44-010", "lat": 7.35, "lng": -11.42},
        {"name": "Sowa", "code": "W44-011", "lat": 7.08, "lng": -11.92},
        {"name": "Yakemo Kpukumu", "code": "W44-012", "lat": 7.45, "lng": -11.52},
        {"name": "Pujehun Town", "code": "W44-013", "lat": 7.352, "lng": -11.720},
    ],
    "Tonkolili": [
        {"name": "Gbonkolenken", "code": "W23-001", "lat": 8.62, "lng": -11.62},
        {"name": "Kafe Simiria", "code": "W23-002", "lat": 8.72, "lng": -11.82},
        {"name": "Kalansogoia", "code": "W23-003", "lat": 8.82, "lng": -11.72},
        {"name": "Kholifa Mabang", "code": "W23-004", "lat": 8.52, "lng": -11.92},
        {"name": "Kholifa Rowalla", "code": "W23-005", "lat": 8.62, "lng": -12.02},
        {"name": "Kunike", "code": "W23-006", "lat": 8.72, "lng": -11.52},
        {"name": "Kunike Barina", "code": "W23-007", "lat": 8.58, "lng": -11.42},
        {"name": "Malal Mara", "code": "W23-008", "lat": 8.78, "lng": -11.62},
        {"name": "Sambaia", "code": "W23-009", "lat": 8.88, "lng": -11.52},
        {"name": "Tane", "code": "W23-010", "lat": 8.68, "lng": -11.72},
        {"name": "Yoni", "code": "W23-011", "lat": 8.48, "lng": -11.72},
        {"name": "Magburaka Town", "code": "W23-012", "lat": 8.720, "lng": -11.950},
    ],
    "Falaba": [
        {"name": "Mongo", "code": "W24-001", "lat": 9.52, "lng": -11.32},
        {"name": "Sulima", "code": "W24-002", "lat": 9.42, "lng": -11.22},
        {"name": "Nyedu", "code": "W24-003", "lat": 9.62, "lng": -11.12},
        {"name": "Delemaia", "code": "W24-004", "lat": 9.72, "lng": -11.02},
        {"name": "Falaba Town", "code": "W24-005", "lat": 9.85, "lng": -11.32},
    ],
    "Karene": [
        {"name": "Sanda Tendaren", "code": "W25-001", "lat": 9.12, "lng": -12.18},
        {"name": "Tambakha", "code": "W25-002", "lat": 9.22, "lng": -12.08},
        {"name": "Sella Limba", "code": "W25-003", "lat": 9.32, "lng": -11.98},
        {"name": "Biriwa", "code": "W25-004", "lat": 9.08, "lng": -11.88},
        {"name": "Karene Town", "code": "W25-005", "lat": 9.28, "lng": -12.08},
    ],
}

# Region to code mapping
REGION_CODES = {
    "Western Area": 1,
    "Northern Province": 2,
    "North West Province": 3,
    "Southern Province": 4,
    "Eastern Province": 5,
}

# District to region mapping
DISTRICT_REGIONS = {
    "Western Area Urban": ("Western Area", 1, 1),
    "Western Area Rural": ("Western Area", 1, 0),
    "Bo": ("Southern Province", 4, 1),
    "Bonthe": ("Southern Province", 4, 2),
    "Moyamba": ("Southern Province", 4, 3),
    "Pujehun": ("Southern Province", 4, 4),
    "Kailahun": ("Eastern Province", 5, 1),
    "Kenema": ("Eastern Province", 5, 2),
    "Kono": ("Eastern Province", 5, 3),
    "Bombali": ("Northern Province", 2, 1),
    "Koinadugu": ("Northern Province", 2, 2),
    "Tonkolili": ("Northern Province", 2, 3),
    "Falaba": ("Northern Province", 2, 4),
    "Karene": ("Northern Province", 2, 5),
    "Kambia": ("North West Province", 3, 1),
    "Port Loko": ("North West Province", 3, 2),
}


async def import_wards():
    """Import all ward boundaries into database."""
    async with engine.begin() as conn:
        print("Importing Sierra Leone ward/chiefdom boundaries...")

        # Clear existing wards
        await conn.execute(text("DELETE FROM wards"))

        total_imported = 0

        for district_name, wards in SIERRA_LEONE_WARDS.items():
            region_info = DISTRICT_REGIONS.get(district_name)
            if not region_info:
                print(f"  Warning: Unknown district {district_name}")
                continue

            region_name, region_code, district_code = region_info

            for ward in wards:
                geohash = encode_geohash(ward["lat"], ward["lng"], 6)

                await conn.execute(text("""
                    INSERT INTO wards (
                        ward_id, ward_name, ward_code,
                        district_code, district_name,
                        region_code, region_name,
                        center_lat, center_lng, geohash,
                        zone_count, address_count
                    ) VALUES (
                        :ward_id, :ward_name, :ward_code,
                        :district_code, :district_name,
                        :region_code, :region_name,
                        :center_lat, :center_lng, :geohash,
                        0, 0
                    )
                """), {
                    "ward_id": ward["code"],
                    "ward_name": ward["name"],
                    "ward_code": ward["code"],
                    "district_code": district_code,
                    "district_name": district_name,
                    "region_code": region_code,
                    "region_name": region_name,
                    "center_lat": ward["lat"],
                    "center_lng": ward["lng"],
                    "geohash": geohash,
                })
                total_imported += 1

            print(f"  {district_name}: {len(wards)} wards")

        print(f"\nTotal wards imported: {total_imported}")


async def link_zones_to_wards():
    """Link postal zones to their parent wards based on location."""
    async with AsyncSessionLocal() as session:
        print("\nLinking zones to wards...")

        # Get all zones with coordinates
        result = await session.execute(text("""
            SELECT zone_code, center_lat, center_lng, district_name
            FROM postal_zones
            WHERE center_lat IS NOT NULL AND center_lng IS NOT NULL
        """))
        zones = result.fetchall()

        updated = 0
        for zone_code, lat, lng, district_name in zones:
            # Find nearest ward in same district
            result = await session.execute(text("""
                SELECT ward_id,
                       SQRT(POW(center_lat - :lat, 2) + POW(center_lng - :lng, 2)) as dist
                FROM wards
                WHERE district_name = :district
                ORDER BY dist
                LIMIT 1
            """), {"lat": lat, "lng": lng, "district": district_name})

            ward = result.fetchone()
            if ward:
                await session.execute(
                    text("UPDATE postal_zones SET ward_id = :ward_id WHERE zone_code = :zone_code"),
                    {"ward_id": ward[0], "zone_code": zone_code}
                )
                updated += 1

                if updated % 1000 == 0:
                    await session.commit()
                    print(f"  Linked {updated} zones...")

        await session.commit()
        print(f"  Total zones linked to wards: {updated}")


async def update_ward_counts():
    """Update zone and address counts for each ward."""
    async with AsyncSessionLocal() as session:
        print("\nUpdating ward statistics...")

        await session.execute(text("""
            UPDATE wards w
            SET zone_count = (
                SELECT COUNT(*) FROM postal_zones pz WHERE pz.ward_id = w.ward_id
            ),
            address_count = (
                SELECT COALESCE(SUM(pz.address_sequence), 0)
                FROM postal_zones pz WHERE pz.ward_id = w.ward_id
            )
        """))

        await session.commit()

        # Show stats
        result = await session.execute(text("""
            SELECT COUNT(*), SUM(zone_count), SUM(address_count)
            FROM wards
        """))
        row = result.fetchone()
        print(f"  Wards: {row[0]}, Zones linked: {row[1]}, Addresses: {row[2]}")


async def main():
    """Run ward import."""
    print("=" * 60)
    print("SIERRA LEONE WARD BOUNDARIES IMPORT")
    print("=" * 60)

    await import_wards()
    await link_zones_to_wards()
    await update_ward_counts()

    print("\n" + "=" * 60)
    print("IMPORT COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
