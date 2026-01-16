"""
Expand Western Area Rural Postal Zones

Western Area Rural covers the peninsula outside Freetown city proper,
including Waterloo, Tombo, the mountain villages, and coastal communities.

This script adds ~200+ granular zones to provide proper coverage.

Usage:
    python -m scripts.expand_western_rural
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.services.plus_code import PlusCodeService
from app.services import geohash as GeohashService
from app.config import get_settings

settings = get_settings()

# Western Area Rural expanded zones
# Organized by primary postal code (1000-1099 range)
WESTERN_RURAL_EXPANDED = {
    # 1000 - Waterloo Main Area
    "1000": {
        "name": "Waterloo Central",
        "neighborhoods": [
            {"name": "Waterloo Town Center", "lat": 8.3320, "lng": -13.0620, "type": "commercial"},
            {"name": "Waterloo Market", "lat": 8.3350, "lng": -13.0650, "type": "commercial"},
            {"name": "Tombo Junction", "lat": 8.3280, "lng": -13.0580, "type": "mixed"},
            {"name": "Waterloo Police Station Area", "lat": 8.3340, "lng": -13.0600, "type": "government"},
            {"name": "Waterloo Hospital Area", "lat": 8.3360, "lng": -13.0680, "type": "mixed"},
            {"name": "Waterloo Lorry Park", "lat": 8.3310, "lng": -13.0640, "type": "commercial"},
            {"name": "Waterloo Main Road North", "lat": 8.3380, "lng": -13.0610, "type": "mixed"},
            {"name": "Waterloo Main Road South", "lat": 8.3290, "lng": -13.0590, "type": "mixed"},
            {"name": "Waterloo Mosque Area", "lat": 8.3330, "lng": -13.0630, "type": "residential"},
            {"name": "Waterloo Church Area", "lat": 8.3355, "lng": -13.0665, "type": "residential"},
        ]
    },
    # 1001 - Newton and Surrounding
    "1001": {
        "name": "Newton Area",
        "neighborhoods": [
            {"name": "Newton Village", "lat": 8.3400, "lng": -13.0700, "type": "residential"},
            {"name": "Newton Junction", "lat": 8.3420, "lng": -13.0720, "type": "mixed"},
            {"name": "Newton School Area", "lat": 8.3380, "lng": -13.0680, "type": "residential"},
            {"name": "Newton Farm Area", "lat": 8.3450, "lng": -13.0750, "type": "residential"},
            {"name": "Newton East", "lat": 8.3410, "lng": -13.0660, "type": "residential"},
            {"name": "Newton West", "lat": 8.3390, "lng": -13.0740, "type": "residential"},
            {"name": "Newton Market", "lat": 8.3405, "lng": -13.0710, "type": "commercial"},
            {"name": "Fogbo Village", "lat": 8.3480, "lng": -13.0780, "type": "residential"},
            {"name": "Fogbo Junction", "lat": 8.3460, "lng": -13.0760, "type": "mixed"},
        ]
    },
    # 1002 - Kossoh Town Area
    "1002": {
        "name": "Kossoh Town",
        "neighborhoods": [
            {"name": "Kossoh Town Center", "lat": 8.3200, "lng": -13.0550, "type": "residential"},
            {"name": "Kossoh Town Market", "lat": 8.3220, "lng": -13.0530, "type": "commercial"},
            {"name": "Kossoh Town North", "lat": 8.3250, "lng": -13.0560, "type": "residential"},
            {"name": "Kossoh Town South", "lat": 8.3170, "lng": -13.0540, "type": "residential"},
            {"name": "Kossoh Town East", "lat": 8.3210, "lng": -13.0500, "type": "residential"},
            {"name": "Kossoh Town School", "lat": 8.3230, "lng": -13.0545, "type": "mixed"},
            {"name": "Robis Village", "lat": 8.3150, "lng": -13.0520, "type": "residential"},
        ]
    },
    # 1003 - Benguema Area
    "1003": {
        "name": "Benguema",
        "neighborhoods": [
            {"name": "Benguema Village", "lat": 8.3100, "lng": -13.0500, "type": "residential"},
            {"name": "Benguema Barracks", "lat": 8.3080, "lng": -13.0480, "type": "government"},
            {"name": "Benguema Training Center", "lat": 8.3120, "lng": -13.0520, "type": "government"},
            {"name": "Benguema Junction", "lat": 8.3090, "lng": -13.0490, "type": "mixed"},
            {"name": "Benguema Market", "lat": 8.3110, "lng": -13.0510, "type": "commercial"},
            {"name": "Benguema School", "lat": 8.3095, "lng": -13.0505, "type": "mixed"},
            {"name": "Masiaka Junction", "lat": 8.3050, "lng": -13.0450, "type": "mixed"},
        ]
    },
    # 1004 - Tombo Fishing Community
    "1004": {
        "name": "Tombo",
        "neighborhoods": [
            {"name": "Tombo Town", "lat": 8.2800, "lng": -13.0800, "type": "fishing"},
            {"name": "Tombo Beach", "lat": 8.2780, "lng": -13.0850, "type": "fishing"},
            {"name": "Tombo Market", "lat": 8.2820, "lng": -13.0780, "type": "commercial"},
            {"name": "Tombo Wharf", "lat": 8.2760, "lng": -13.0820, "type": "fishing"},
            {"name": "Tombo Fish Processing", "lat": 8.2790, "lng": -13.0810, "type": "industrial"},
            {"name": "Tombo Village East", "lat": 8.2830, "lng": -13.0760, "type": "residential"},
            {"name": "Tombo Village West", "lat": 8.2770, "lng": -13.0870, "type": "residential"},
            {"name": "Tombo School Area", "lat": 8.2810, "lng": -13.0790, "type": "mixed"},
            {"name": "Tombo Health Center", "lat": 8.2805, "lng": -13.0805, "type": "mixed"},
        ]
    },
    # 1005 - Black Johnson Area
    "1005": {
        "name": "Black Johnson",
        "neighborhoods": [
            {"name": "Black Johnson Village", "lat": 8.2650, "lng": -13.1000, "type": "residential"},
            {"name": "Black Johnson Beach", "lat": 8.2620, "lng": -13.1050, "type": "mixed"},
            {"name": "Black Johnson Junction", "lat": 8.2680, "lng": -13.0970, "type": "mixed"},
            {"name": "Black Johnson North", "lat": 8.2700, "lng": -13.0980, "type": "residential"},
            {"name": "Black Johnson South", "lat": 8.2600, "lng": -13.1020, "type": "residential"},
            {"name": "Black Johnson School", "lat": 8.2660, "lng": -13.0990, "type": "mixed"},
        ]
    },
    # 1006 - Hastings Area
    "1006": {
        "name": "Hastings",
        "neighborhoods": [
            {"name": "Hastings Town", "lat": 8.3800, "lng": -13.1300, "type": "mixed"},
            {"name": "Hastings Airfield", "lat": 8.3850, "lng": -13.1350, "type": "government"},
            {"name": "Hastings Police Station", "lat": 8.3780, "lng": -13.1280, "type": "government"},
            {"name": "Hastings Market", "lat": 8.3790, "lng": -13.1310, "type": "commercial"},
            {"name": "Hastings Junction", "lat": 8.3810, "lng": -13.1270, "type": "mixed"},
            {"name": "Hastings School", "lat": 8.3770, "lng": -13.1320, "type": "mixed"},
            {"name": "Hastings North", "lat": 8.3870, "lng": -13.1250, "type": "residential"},
            {"name": "Hastings South", "lat": 8.3750, "lng": -13.1340, "type": "residential"},
            {"name": "Hastings West", "lat": 8.3760, "lng": -13.1400, "type": "residential"},
        ]
    },
    # 1007 - Grafton Area
    "1007": {
        "name": "Grafton",
        "neighborhoods": [
            {"name": "Grafton Village", "lat": 8.4000, "lng": -13.1400, "type": "residential"},
            {"name": "Grafton Junction", "lat": 8.4020, "lng": -13.1380, "type": "mixed"},
            {"name": "Grafton Cemetery Area", "lat": 8.3980, "lng": -13.1420, "type": "mixed"},
            {"name": "Grafton School", "lat": 8.4010, "lng": -13.1390, "type": "mixed"},
            {"name": "Grafton Farm Area", "lat": 8.4050, "lng": -13.1450, "type": "residential"},
            {"name": "Grafton East", "lat": 8.4030, "lng": -13.1360, "type": "residential"},
            {"name": "Grafton West", "lat": 8.3970, "lng": -13.1440, "type": "residential"},
        ]
    },
    # 1008 - Allen Town Rural Area
    "1008": {
        "name": "Allen Town Rural",
        "neighborhoods": [
            {"name": "Allen Town Village", "lat": 8.4200, "lng": -13.1450, "type": "residential"},
            {"name": "Allen Town Junction", "lat": 8.4180, "lng": -13.1430, "type": "mixed"},
            {"name": "Allen Town Farm", "lat": 8.4250, "lng": -13.1480, "type": "residential"},
            {"name": "Allen Town School", "lat": 8.4190, "lng": -13.1440, "type": "mixed"},
            {"name": "Allen Town Market", "lat": 8.4210, "lng": -13.1460, "type": "commercial"},
            {"name": "Allen Town East", "lat": 8.4230, "lng": -13.1420, "type": "residential"},
        ]
    },
    # 1009 - Jui Area
    "1009": {
        "name": "Jui",
        "neighborhoods": [
            {"name": "Jui Village", "lat": 8.3600, "lng": -13.1200, "type": "residential"},
            {"name": "Jui University Area", "lat": 8.3650, "lng": -13.1250, "type": "mixed"},
            {"name": "Jui Junction", "lat": 8.3580, "lng": -13.1180, "type": "mixed"},
            {"name": "Jui Hospital Area", "lat": 8.3620, "lng": -13.1220, "type": "mixed"},
            {"name": "Jui Market", "lat": 8.3590, "lng": -13.1210, "type": "commercial"},
            {"name": "Jui East", "lat": 8.3630, "lng": -13.1170, "type": "residential"},
            {"name": "Jui West", "lat": 8.3570, "lng": -13.1240, "type": "residential"},
            {"name": "Jui North", "lat": 8.3670, "lng": -13.1190, "type": "residential"},
        ]
    },
    # 1010 - Regent Rural Area
    "1010": {
        "name": "Regent Rural",
        "neighborhoods": [
            {"name": "Regent Village", "lat": 8.4100, "lng": -13.2200, "type": "residential"},
            {"name": "Regent Junction", "lat": 8.4080, "lng": -13.2180, "type": "mixed"},
            {"name": "Regent Mountain", "lat": 8.4150, "lng": -13.2250, "type": "residential"},
            {"name": "Regent School", "lat": 8.4090, "lng": -13.2190, "type": "mixed"},
            {"name": "Regent Church Area", "lat": 8.4110, "lng": -13.2210, "type": "residential"},
            {"name": "Regent Farm", "lat": 8.4130, "lng": -13.2230, "type": "residential"},
            {"name": "Regent West", "lat": 8.4070, "lng": -13.2240, "type": "residential"},
        ]
    },
    # 1011 - Leicester Rural Area
    "1011": {
        "name": "Leicester Rural",
        "neighborhoods": [
            {"name": "Leicester Village", "lat": 8.4200, "lng": -13.2300, "type": "residential"},
            {"name": "Leicester Peak", "lat": 8.4300, "lng": -13.2350, "type": "residential"},
            {"name": "Leicester Junction", "lat": 8.4180, "lng": -13.2280, "type": "mixed"},
            {"name": "Leicester School", "lat": 8.4210, "lng": -13.2310, "type": "mixed"},
            {"name": "Leicester East", "lat": 8.4230, "lng": -13.2270, "type": "residential"},
            {"name": "Leicester West", "lat": 8.4170, "lng": -13.2330, "type": "residential"},
            {"name": "Sugar Loaf Mountain", "lat": 8.4250, "lng": -13.2400, "type": "residential"},
        ]
    },
    # 1012 - Charlotte Rural Area
    "1012": {
        "name": "Charlotte Rural",
        "neighborhoods": [
            {"name": "Charlotte Village", "lat": 8.4050, "lng": -13.2400, "type": "residential"},
            {"name": "Charlotte Junction", "lat": 8.4030, "lng": -13.2380, "type": "mixed"},
            {"name": "Charlotte School", "lat": 8.4060, "lng": -13.2410, "type": "mixed"},
            {"name": "Charlotte Farm", "lat": 8.4080, "lng": -13.2430, "type": "residential"},
            {"name": "Charlotte East", "lat": 8.4070, "lng": -13.2370, "type": "residential"},
            {"name": "Charlotte West", "lat": 8.4020, "lng": -13.2420, "type": "residential"},
        ]
    },
    # 1013 - Bathurst Rural Area
    "1013": {
        "name": "Bathurst Rural",
        "neighborhoods": [
            {"name": "Bathurst Village", "lat": 8.3950, "lng": -13.2500, "type": "residential"},
            {"name": "Bathurst Junction", "lat": 8.3930, "lng": -13.2480, "type": "mixed"},
            {"name": "Bathurst School", "lat": 8.3960, "lng": -13.2510, "type": "mixed"},
            {"name": "Bathurst Beach", "lat": 8.3900, "lng": -13.2550, "type": "mixed"},
            {"name": "Bathurst East", "lat": 8.3970, "lng": -13.2470, "type": "residential"},
            {"name": "Bathurst West", "lat": 8.3920, "lng": -13.2530, "type": "residential"},
        ]
    },
    # 1014 - Gloucester Rural Area
    "1014": {
        "name": "Gloucester Rural",
        "neighborhoods": [
            {"name": "Gloucester Village", "lat": 8.4150, "lng": -13.2600, "type": "residential"},
            {"name": "Gloucester Junction", "lat": 8.4130, "lng": -13.2580, "type": "mixed"},
            {"name": "Gloucester School", "lat": 8.4160, "lng": -13.2610, "type": "mixed"},
            {"name": "Gloucester Farm", "lat": 8.4180, "lng": -13.2630, "type": "residential"},
            {"name": "Gloucester East", "lat": 8.4170, "lng": -13.2570, "type": "residential"},
            {"name": "Gloucester West", "lat": 8.4120, "lng": -13.2620, "type": "residential"},
        ]
    },
    # 1015 - York Village Area
    "1015": {
        "name": "York",
        "neighborhoods": [
            {"name": "York Village", "lat": 8.3500, "lng": -13.2800, "type": "residential"},
            {"name": "York Beach", "lat": 8.3450, "lng": -13.2850, "type": "mixed"},
            {"name": "York Junction", "lat": 8.3520, "lng": -13.2780, "type": "mixed"},
            {"name": "York School", "lat": 8.3510, "lng": -13.2810, "type": "mixed"},
            {"name": "York Wharf", "lat": 8.3430, "lng": -13.2870, "type": "fishing"},
            {"name": "York East", "lat": 8.3540, "lng": -13.2770, "type": "residential"},
            {"name": "York West", "lat": 8.3470, "lng": -13.2830, "type": "residential"},
        ]
    },
    # 1016 - Kent Village Area
    "1016": {
        "name": "Kent",
        "neighborhoods": [
            {"name": "Kent Village", "lat": 8.3300, "lng": -13.3000, "type": "residential"},
            {"name": "Kent Beach", "lat": 8.3250, "lng": -13.3050, "type": "mixed"},
            {"name": "Kent Junction", "lat": 8.3320, "lng": -13.2980, "type": "mixed"},
            {"name": "Kent School", "lat": 8.3310, "lng": -13.3010, "type": "mixed"},
            {"name": "Kent Fishing Area", "lat": 8.3230, "lng": -13.3070, "type": "fishing"},
            {"name": "Kent East", "lat": 8.3340, "lng": -13.2970, "type": "residential"},
            {"name": "Kent West", "lat": 8.3270, "lng": -13.3030, "type": "residential"},
        ]
    },
    # 1017 - Hamilton Area
    "1017": {
        "name": "Hamilton",
        "neighborhoods": [
            {"name": "Hamilton Village", "lat": 8.3600, "lng": -13.3100, "type": "residential"},
            {"name": "Hamilton Beach", "lat": 8.3550, "lng": -13.3150, "type": "mixed"},
            {"name": "Hamilton Junction", "lat": 8.3620, "lng": -13.3080, "type": "mixed"},
            {"name": "Hamilton School", "lat": 8.3610, "lng": -13.3110, "type": "mixed"},
            {"name": "Hamilton East", "lat": 8.3640, "lng": -13.3070, "type": "residential"},
            {"name": "Hamilton West", "lat": 8.3570, "lng": -13.3130, "type": "residential"},
        ]
    },
    # 1018 - Sussex Area
    "1018": {
        "name": "Sussex",
        "neighborhoods": [
            {"name": "Sussex Village", "lat": 8.3700, "lng": -13.3200, "type": "residential"},
            {"name": "Sussex Beach", "lat": 8.3650, "lng": -13.3250, "type": "mixed"},
            {"name": "Sussex Junction", "lat": 8.3720, "lng": -13.3180, "type": "mixed"},
            {"name": "Sussex School", "lat": 8.3710, "lng": -13.3210, "type": "mixed"},
            {"name": "Sussex East", "lat": 8.3740, "lng": -13.3170, "type": "residential"},
            {"name": "Sussex West", "lat": 8.3670, "lng": -13.3230, "type": "residential"},
        ]
    },
    # 1019 - Tokeh Area
    "1019": {
        "name": "Tokeh",
        "neighborhoods": [
            {"name": "Tokeh Village", "lat": 8.3400, "lng": -13.3400, "type": "residential"},
            {"name": "Tokeh Beach Resort", "lat": 8.3350, "lng": -13.3450, "type": "commercial"},
            {"name": "Tokeh Beach", "lat": 8.3330, "lng": -13.3480, "type": "mixed"},
            {"name": "Tokeh Junction", "lat": 8.3420, "lng": -13.3380, "type": "mixed"},
            {"name": "Tokeh School", "lat": 8.3410, "lng": -13.3410, "type": "mixed"},
            {"name": "Tokeh East", "lat": 8.3440, "lng": -13.3370, "type": "residential"},
            {"name": "Tokeh West", "lat": 8.3370, "lng": -13.3430, "type": "residential"},
            {"name": "Tokeh Hills", "lat": 8.3480, "lng": -13.3350, "type": "residential"},
        ]
    },
    # 1020 - Lakka Area
    "1020": {
        "name": "Lakka",
        "neighborhoods": [
            {"name": "Lakka Village", "lat": 8.3800, "lng": -13.3300, "type": "residential"},
            {"name": "Lakka Beach", "lat": 8.3750, "lng": -13.3350, "type": "mixed"},
            {"name": "Lakka Junction", "lat": 8.3820, "lng": -13.3280, "type": "mixed"},
            {"name": "Lakka School", "lat": 8.3810, "lng": -13.3310, "type": "mixed"},
            {"name": "Lakka Hospital", "lat": 8.3790, "lng": -13.3320, "type": "mixed"},
            {"name": "Lakka East", "lat": 8.3840, "lng": -13.3270, "type": "residential"},
            {"name": "Lakka West", "lat": 8.3770, "lng": -13.3330, "type": "residential"},
        ]
    },
    # 1021 - Banana Islands
    "1021": {
        "name": "Banana Islands",
        "neighborhoods": [
            {"name": "Dublin Village", "lat": 8.0800, "lng": -13.0700, "type": "residential"},
            {"name": "Dublin Beach", "lat": 8.0780, "lng": -13.0750, "type": "mixed"},
            {"name": "Ricketts Island Main", "lat": 8.0900, "lng": -13.0600, "type": "residential"},
            {"name": "Mes-Meheux", "lat": 8.0850, "lng": -13.0650, "type": "residential"},
            {"name": "Banana Island Jetty", "lat": 8.0820, "lng": -13.0720, "type": "mixed"},
            {"name": "Banana Island School", "lat": 8.0810, "lng": -13.0710, "type": "mixed"},
        ]
    },
    # 1022 - Turtle Islands (if applicable)
    "1022": {
        "name": "Turtle Islands",
        "neighborhoods": [
            {"name": "Turtle Island Main", "lat": 7.5800, "lng": -12.8500, "type": "fishing"},
            {"name": "Turtle Island Beach", "lat": 7.5750, "lng": -12.8550, "type": "fishing"},
            {"name": "Turtle Island Village", "lat": 7.5820, "lng": -12.8480, "type": "residential"},
        ]
    },
    # 1023 - Macdonald and Surrounding
    "1023": {
        "name": "Macdonald",
        "neighborhoods": [
            {"name": "Macdonald Village", "lat": 8.2900, "lng": -13.0900, "type": "residential"},
            {"name": "Macdonald Junction", "lat": 8.2920, "lng": -13.0880, "type": "mixed"},
            {"name": "Macdonald School", "lat": 8.2910, "lng": -13.0910, "type": "mixed"},
            {"name": "Macdonald Farm", "lat": 8.2940, "lng": -13.0930, "type": "residential"},
            {"name": "Macdonald East", "lat": 8.2930, "lng": -13.0870, "type": "residential"},
        ]
    },
    # 1024 - Goderich Rural
    "1024": {
        "name": "Goderich Rural",
        "neighborhoods": [
            {"name": "Goderich Village", "lat": 8.3900, "lng": -13.3150, "type": "residential"},
            {"name": "Goderich Beach", "lat": 8.3850, "lng": -13.3200, "type": "mixed"},
            {"name": "Goderich Junction", "lat": 8.3920, "lng": -13.3130, "type": "mixed"},
            {"name": "Goderich School", "lat": 8.3910, "lng": -13.3160, "type": "mixed"},
            {"name": "Goderich East", "lat": 8.3940, "lng": -13.3120, "type": "residential"},
            {"name": "Goderich West", "lat": 8.3870, "lng": -13.3180, "type": "residential"},
        ]
    },
    # 1025 - Juba Area
    "1025": {
        "name": "Juba",
        "neighborhoods": [
            {"name": "Juba Village", "lat": 8.4050, "lng": -13.3050, "type": "residential"},
            {"name": "Juba Junction", "lat": 8.4070, "lng": -13.3030, "type": "mixed"},
            {"name": "Juba School", "lat": 8.4060, "lng": -13.3060, "type": "mixed"},
            {"name": "Juba Farm", "lat": 8.4090, "lng": -13.3080, "type": "residential"},
            {"name": "Juba East", "lat": 8.4080, "lng": -13.3020, "type": "residential"},
            {"name": "Juba West", "lat": 8.4030, "lng": -13.3070, "type": "residential"},
        ]
    },
    # 1026 - Picket Hill Area
    "1026": {
        "name": "Picket Hill",
        "neighborhoods": [
            {"name": "Picket Hill Village", "lat": 8.4350, "lng": -13.2150, "type": "residential"},
            {"name": "Picket Hill Peak", "lat": 8.4400, "lng": -13.2200, "type": "residential"},
            {"name": "Picket Hill Junction", "lat": 8.4330, "lng": -13.2130, "type": "mixed"},
            {"name": "Picket Hill School", "lat": 8.4360, "lng": -13.2160, "type": "mixed"},
            {"name": "Picket Hill Farm", "lat": 8.4380, "lng": -13.2180, "type": "residential"},
        ]
    },
    # 1027 - Campbell Town Area
    "1027": {
        "name": "Campbell Town",
        "neighborhoods": [
            {"name": "Campbell Town Village", "lat": 8.3450, "lng": -13.1100, "type": "residential"},
            {"name": "Campbell Town Junction", "lat": 8.3470, "lng": -13.1080, "type": "mixed"},
            {"name": "Campbell Town School", "lat": 8.3460, "lng": -13.1110, "type": "mixed"},
            {"name": "Campbell Town Farm", "lat": 8.3490, "lng": -13.1130, "type": "residential"},
            {"name": "Campbell Town East", "lat": 8.3480, "lng": -13.1070, "type": "residential"},
        ]
    },
    # 1028 - Songo Area
    "1028": {
        "name": "Songo",
        "neighborhoods": [
            {"name": "Songo Village", "lat": 8.3000, "lng": -13.0400, "type": "residential"},
            {"name": "Songo Junction", "lat": 8.3020, "lng": -13.0380, "type": "mixed"},
            {"name": "Songo School", "lat": 8.3010, "lng": -13.0410, "type": "mixed"},
            {"name": "Songo Farm", "lat": 8.3040, "lng": -13.0430, "type": "residential"},
            {"name": "Songo Market", "lat": 8.3005, "lng": -13.0395, "type": "commercial"},
        ]
    },
    # 1029 - Rokel Area
    "1029": {
        "name": "Rokel",
        "neighborhoods": [
            {"name": "Rokel Village", "lat": 8.3550, "lng": -13.0900, "type": "residential"},
            {"name": "Rokel Junction", "lat": 8.3570, "lng": -13.0880, "type": "mixed"},
            {"name": "Rokel School", "lat": 8.3560, "lng": -13.0910, "type": "mixed"},
            {"name": "Rokel Bridge Area", "lat": 8.3530, "lng": -13.0870, "type": "mixed"},
            {"name": "Rokel Farm", "lat": 8.3590, "lng": -13.0930, "type": "residential"},
        ]
    },
}


async def expand_western_rural_zones():
    """Add expanded Western Area Rural zones to database."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 70)
    print("WESTERN AREA RURAL ZONE EXPANSION")
    print("=" * 70)
    print()

    total_zones = sum(len(data["neighborhoods"]) for data in WESTERN_RURAL_EXPANDED.values())
    print(f"Total zones to add: {total_zones}")
    print(f"Postal code areas: {len(WESTERN_RURAL_EXPANDED)}")
    print()

    imported = 0
    errors = 0

    async with async_session() as db:
        for primary_code, area_data in WESTERN_RURAL_EXPANDED.items():
            print(f"Processing {primary_code} - {area_data['name']}...")

            for idx, neighborhood in enumerate(area_data["neighborhoods"], start=1):
                try:
                    segment = f"{idx:03d}"
                    zone_code = f"{primary_code}-{segment}"

                    # Generate Plus Code
                    plus_code = PlusCodeService.encode(
                        neighborhood["lat"],
                        neighborhood["lng"],
                        code_length=11
                    )

                    # Generate Geohash
                    geohash = GeohashService.encode(
                        neighborhood["lat"],
                        neighborhood["lng"],
                        9
                    )

                    # Create polygon geometry (~200m x 200m)
                    size = 0.002
                    half = size / 2
                    lat, lng = neighborhood["lat"], neighborhood["lng"]
                    polygon_wkt = f"POLYGON(({lng-half} {lat-half}, {lng+half} {lat-half}, {lng+half} {lat+half}, {lng-half} {lat+half}, {lng-half} {lat-half}))"

                    # Insert zone
                    query = text("""
                        INSERT INTO postal_zones (
                            zone_code, primary_code, segment, zone_name,
                            region_code, region_name, district_code, district_name,
                            segment_type, geometry, center_lat, center_lng,
                            plus_code, geohash, address_sequence, created_at, updated_at
                        ) VALUES (
                            :zone_code, :primary_code, :segment, :zone_name,
                            1, 'Western Area', 0, 'Western Area Rural',
                            :segment_type, ST_GeomFromText(:geometry, 4326), :center_lat, :center_lng,
                            :plus_code, :geohash, 0, NOW(), NOW()
                        )
                        ON CONFLICT (zone_code) DO UPDATE SET
                            zone_name = EXCLUDED.zone_name,
                            segment_type = EXCLUDED.segment_type,
                            geometry = EXCLUDED.geometry,
                            center_lat = EXCLUDED.center_lat,
                            center_lng = EXCLUDED.center_lng,
                            plus_code = EXCLUDED.plus_code,
                            geohash = EXCLUDED.geohash,
                            updated_at = NOW()
                    """)

                    await db.execute(query, {
                        "zone_code": zone_code,
                        "primary_code": primary_code,
                        "segment": segment,
                        "zone_name": neighborhood["name"],
                        "segment_type": neighborhood["type"],
                        "geometry": polygon_wkt,
                        "center_lat": lat,
                        "center_lng": lng,
                        "plus_code": plus_code,
                        "geohash": geohash,
                    })

                    imported += 1

                except Exception as e:
                    errors += 1
                    print(f"  Error: {zone_code} - {e}")

            await db.commit()
            print(f"  Added {len(area_data['neighborhoods'])} zones")

    await engine.dispose()

    print()
    print("=" * 70)
    print("EXPANSION COMPLETE")
    print("=" * 70)
    print(f"Successfully imported: {imported} zones")
    print(f"Errors: {errors}")
    print()

    # Get final count
    async with async_session() as db:
        result = await db.execute(text("""
            SELECT COUNT(*) as count FROM postal_zones
            WHERE district_name = 'Western Area Rural'
        """))
        row = result.fetchone()
        print(f"Total Western Area Rural zones now: {row.count}")

    await engine.dispose()

    return imported, errors


if __name__ == "__main__":
    asyncio.run(expand_western_rural_zones())
