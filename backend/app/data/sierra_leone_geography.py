"""
Sierra Leone Administrative Geography Data
==========================================
5 Regions, 16 Districts, 190+ Chiefdoms/Wards
"""

# Region codes and data
REGIONS = [
    {
        "code": "W",
        "name": "Western Area",
        "short_code": "W",
        "description": "Capital region including Freetown"
    },
    {
        "code": "N",
        "name": "Northern Province",
        "short_code": "N",
        "description": "Northern region of Sierra Leone"
    },
    {
        "code": "NW",
        "name": "North West Province",
        "short_code": "NW",
        "description": "North Western region"
    },
    {
        "code": "S",
        "name": "Southern Province",
        "short_code": "S",
        "description": "Southern region of Sierra Leone"
    },
    {
        "code": "E",
        "name": "Eastern Province",
        "short_code": "E",
        "description": "Eastern region of Sierra Leone"
    },
]

# Districts with their region and chiefdoms/wards
DISTRICTS = {
    # ============================================
    # WESTERN AREA (W)
    # ============================================
    "Western Area Urban": {
        "region": "W",
        "short_code": "U",
        "full_code": "WU",
        "capital": "Freetown",
        "wards": [
            # Freetown is divided into wards, not chiefdoms
            "East I", "East II", "East III",
            "Central I", "Central II",
            "West I", "West II", "West III",
        ]
    },
    "Western Area Rural": {
        "region": "W",
        "short_code": "R",
        "full_code": "WR",
        "capital": "Waterloo",
        "chiefdoms": [
            "Koya Rural",
            "Mountain Rural",
            "Waterloo Rural",
            "York Rural",
        ]
    },

    # ============================================
    # NORTHERN PROVINCE (N)
    # ============================================
    "Bombali": {
        "region": "N",
        "short_code": "BO",
        "full_code": "NBO",
        "capital": "Makeni",
        "chiefdoms": [
            "Biriwa", "Bombali Sebora", "Gbanti Kamaranka",
            "Gbendembu Ngowahun", "Libeisaygahun", "Magbaimba Ndowahun",
            "Makari Gbanti", "Paki Masabong", "Safroko Limba",
            "Sanda Loko", "Sanda Tendaren", "Sella Limba", "Tambakha"
        ]
    },
    "Falaba": {
        "region": "N",
        "short_code": "FA",
        "full_code": "NFA",
        "capital": "Falaba",
        "chiefdoms": [
            "Delemadugu", "Kabelia", "Kaliere",
            "Kasunko", "Mongo", "Morifindugu",
            "Neya", "Nyedu", "Seradu", "Sulima"
        ]
    },
    "Koinadugu": {
        "region": "N",
        "short_code": "KO",
        "full_code": "NKO",
        "capital": "Kabala",
        "chiefdoms": [
            "Dembelia Sinkunia", "Diang", "Folosaba Dembelia",
            "Kasunko", "Mongo", "Neya", "Nieni",
            "Sengbe", "Wara Wara Bafodia", "Wara Wara Yagala"
        ]
    },
    "Tonkolili": {
        "region": "N",
        "short_code": "TO",
        "full_code": "NTO",
        "capital": "Magburaka",
        "chiefdoms": [
            "Gbonkolenken", "Kafe Simiria", "Kalansogoia",
            "Kholifa Mabang", "Kholifa Rowalla", "Kunike",
            "Kunike Barina", "Malal Mara", "Sambaia Bendugu",
            "Tane", "Yoni"
        ]
    },
    "Karene": {
        "region": "N",
        "short_code": "KA",
        "full_code": "NKA",
        "capital": "Kamakwie",
        "chiefdoms": [
            "Bramaia", "Gbinleh Dixing", "Mambolo",
            "Samu", "Tambaka", "Tonko Limba"
        ]
    },

    # ============================================
    # NORTH WEST PROVINCE (NW)
    # ============================================
    "Kambia": {
        "region": "NW",
        "short_code": "KM",
        "full_code": "NWKM",
        "capital": "Kambia",
        "chiefdoms": [
            "Bramaia", "Gbinleh Dixing", "Magbema",
            "Mambolo", "Masungbala", "Samu", "Tonko Limba"
        ]
    },
    "Port Loko": {
        "region": "NW",
        "short_code": "PL",
        "full_code": "NWPL",
        "capital": "Port Loko",
        "chiefdoms": [
            "Buya Romende", "Dibia", "Kaffu Bullom",
            "Koya", "Lokomasama", "Maforki", "Marampa",
            "Masimera", "Sanda Magbolonthor", "TMS"
        ]
    },

    # ============================================
    # SOUTHERN PROVINCE (S)
    # ============================================
    "Bo": {
        "region": "S",
        "short_code": "BO",
        "full_code": "SBO",
        "capital": "Bo",
        "chiefdoms": [
            "Badjia", "Bagbo", "Bagbwe", "Baoma",
            "Bumpe Ngao", "Gbo", "Jaiama Bongor",
            "Kakua", "Komboya", "Lugbu", "Niawa Lenga",
            "Selenga", "Tikonko", "Valunia", "Wonde"
        ]
    },
    "Bonthe": {
        "region": "S",
        "short_code": "BN",
        "full_code": "SBN",
        "capital": "Mattru Jong",
        "chiefdoms": [
            "Bendu Cha", "Bum", "Dema", "Imperri",
            "Jong", "Kpanda Kemo", "Kwamebai Krim",
            "Nongoba Bullom", "Sittia", "Sogbini", "Yawbeko"
        ]
    },
    "Moyamba": {
        "region": "S",
        "short_code": "MO",
        "full_code": "SMO",
        "capital": "Moyamba",
        "chiefdoms": [
            "Bagbo", "Bagruwa", "Banta", "Banta Mokele",
            "Bumpe", "Dasse", "Fakunya", "Kagboro",
            "Kaiyamba", "Kamajei", "Kargboro", "Kori",
            "Kowa", "Lower Banta", "Ribbi", "Timdale", "Upper Banta"
        ]
    },
    "Pujehun": {
        "region": "S",
        "short_code": "PU",
        "full_code": "SPU",
        "capital": "Pujehun",
        "chiefdoms": [
            "Barri", "Gallinas Perri", "Kpaka", "Makpele",
            "Malen", "Mano Sakrim", "Panga Kabonde",
            "Panga Krim", "Peje Bongre", "Peje West",
            "Soro Gbema", "Sowa", "Yakemo Kpukumu"
        ]
    },

    # ============================================
    # EASTERN PROVINCE (E)
    # ============================================
    "Kailahun": {
        "region": "E",
        "short_code": "KL",
        "full_code": "EKL",
        "capital": "Kailahun",
        "chiefdoms": [
            "Dea", "Jawei", "Kissi Kama", "Kissi Teng",
            "Kissi Tongi", "Luawa", "Malema", "Mandu",
            "Njaluahun", "Penguia", "Upper Bambara", "Yawei"
        ]
    },
    "Kenema": {
        "region": "E",
        "short_code": "KE",
        "full_code": "EKE",
        "capital": "Kenema",
        "chiefdoms": [
            "Dama", "Dodo", "Gaura", "Gorama Mende",
            "Kandu Leppeama", "Koya", "Langrama",
            "Lower Bambara", "Malegohun", "Nomo",
            "Nongowa", "Simbaru", "Small Bo", "Tunkia", "Wandor"
        ]
    },
    "Kono": {
        "region": "E",
        "short_code": "KN",
        "full_code": "EKN",
        "capital": "Koidu",
        "chiefdoms": [
            "Fiama", "Gbane", "Gbane Kandor", "Gbense",
            "Gorama Kono", "Kamara", "Lei", "Mafindor",
            "Nimikoro", "Nimiyama", "Sandor", "Soa", "Tankoro", "Toli"
        ]
    },
}

# ============================================
# FREETOWN DETAILED ZONES (Starting Point)
# ============================================
# Freetown is divided into more granular zones for detailed mapping

FREETOWN_ZONES = {
    "East I": {
        "code": "E1",
        "neighborhoods": [
            {"name": "Cline Town", "code": "CT", "type": "mixed"},
            {"name": "Fourah Bay", "code": "FB", "type": "residential"},
            {"name": "Foulah Town", "code": "FT", "type": "residential"},
            {"name": "Grassfield", "code": "GF", "type": "residential"},
            {"name": "Magazine", "code": "MG", "type": "mixed"},
            {"name": "Mamba Ridge", "code": "MR", "type": "residential"},
        ]
    },
    "East II": {
        "code": "E2",
        "neighborhoods": [
            {"name": "Kissy", "code": "KS", "type": "mixed"},
            {"name": "Kissy Brook", "code": "KB", "type": "residential"},
            {"name": "Kissy Mess Mess", "code": "KM", "type": "residential"},
            {"name": "Wellington", "code": "WL", "type": "mixed"},
            {"name": "Portee", "code": "PT", "type": "residential"},
        ]
    },
    "East III": {
        "code": "E3",
        "neighborhoods": [
            {"name": "Calaba Town", "code": "CB", "type": "mixed"},
            {"name": "Allen Town", "code": "AT", "type": "residential"},
            {"name": "Grafton", "code": "GR", "type": "residential"},
            {"name": "Hastings", "code": "HS", "type": "mixed"},
        ]
    },
    "Central I": {
        "code": "C1",
        "neighborhoods": [
            {"name": "Tower Hill", "code": "TH", "type": "commercial"},
            {"name": "Wilberforce", "code": "WB", "type": "residential"},
            {"name": "Signal Hill", "code": "SH", "type": "residential"},
            {"name": "Hill Station", "code": "HI", "type": "residential"},
            {"name": "Brookfields", "code": "BK", "type": "mixed"},
        ]
    },
    "Central II": {
        "code": "C2",
        "neighborhoods": [
            {"name": "Kroo Town", "code": "KR", "type": "residential"},
            {"name": "Congo Town", "code": "CG", "type": "residential"},
            {"name": "Tengbeh Town", "code": "TT", "type": "residential"},
            {"name": "Kingtom", "code": "KT", "type": "mixed"},
            {"name": "Ascension Town", "code": "AS", "type": "residential"},
        ]
    },
    "West I": {
        "code": "W1",
        "neighborhoods": [
            {"name": "Aberdeen", "code": "AB", "type": "mixed"},
            {"name": "Murray Town", "code": "MT", "type": "residential"},
            {"name": "Cockle Bay", "code": "CK", "type": "residential"},
            {"name": "Lakka", "code": "LK", "type": "residential"},
        ]
    },
    "West II": {
        "code": "W2",
        "neighborhoods": [
            {"name": "Lumley", "code": "LM", "type": "mixed"},
            {"name": "Juba", "code": "JB", "type": "residential"},
            {"name": "Wilkinson Road", "code": "WK", "type": "commercial"},
            {"name": "Spur Road", "code": "SP", "type": "commercial"},
        ]
    },
    "West III": {
        "code": "W3",
        "neighborhoods": [
            {"name": "Goderich", "code": "GD", "type": "residential"},
            {"name": "Tokeh", "code": "TK", "type": "residential"},
            {"name": "Hamilton", "code": "HM", "type": "residential"},
            {"name": "Sussex", "code": "SX", "type": "residential"},
        ]
    },
}

# ============================================
# POSTAL CODE NUMBERING SYSTEM
# ============================================
"""
PDA-ID (Physical Digital Address ID) Format:
============================================

Full Format: SL-{DistrictCode}-{ZoneNumber}-{SequenceID}

Components:
-----------
1. Country Prefix: SL (Sierra Leone)
2. District Code: 2-4 characters (e.g., WU for Western Urban)
3. Zone Number: 3 digits (001-999)
4. Sequence ID: 1 letter + 4 digits (A0001-Z9999)

Examples:
---------
- SL-WU-001-A0001  (Freetown, East I, first address)
- SL-WU-015-B1234  (Freetown, Central, address #B1234)
- SL-NBO-003-C5678 (Bombali District, Zone 3)

Zone Numbering Convention:
--------------------------
- 001-099: Urban/Town centers
- 100-199: Residential areas
- 200-299: Commercial/Business districts
- 300-399: Industrial areas
- 400-499: Mixed-use zones
- 500-599: Rural settlements
- 600-699: Agricultural areas
- 700-799: Special zones (airports, ports, etc.)
- 800-899: Reserved for future expansion
- 900-999: Administrative/Government zones

Sequence ID:
------------
- Letter (A-Z): Sub-zone identifier
- Numbers (0001-9999): Sequential address number
- Capacity per zone: 26 × 9999 = 259,974 addresses

Total System Capacity:
----------------------
- Per district: ~260,000 addresses per zone × 999 zones
- National: Virtually unlimited for Sierra Leone's needs
"""

# Zone type definitions
ZONE_TYPES = {
    "urban": {"range": (1, 99), "description": "Urban/Town centers"},
    "residential": {"range": (100, 199), "description": "Residential areas"},
    "commercial": {"range": (200, 299), "description": "Commercial/Business districts"},
    "industrial": {"range": (300, 399), "description": "Industrial areas"},
    "mixed": {"range": (400, 499), "description": "Mixed-use zones"},
    "rural": {"range": (500, 599), "description": "Rural settlements"},
    "agricultural": {"range": (600, 699), "description": "Agricultural areas"},
    "special": {"range": (700, 799), "description": "Special zones (airports, ports)"},
    "reserved": {"range": (800, 899), "description": "Reserved for expansion"},
    "government": {"range": (900, 999), "description": "Administrative/Government"},
}
