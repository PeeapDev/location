"""
Geohash Service for Spatial Indexing.

Provides efficient spatial indexing using geohash encoding.
Geohash precision levels:
- 4 chars: ~39km x 20km (regional)
- 5 chars: ~5km x 5km (district level)
- 6 chars: ~1.2km x 0.6km (ward level)
- 7 chars: ~150m x 150m (zone level)
- 8 chars: ~38m x 19m (block level)
- 9 chars: ~5m x 5m (address level)

Sierra Leone bounds: lat 6.9-10.0, lng -13.5 to -10.3
"""

from typing import List, Tuple, Optional
import math

# Geohash base32 alphabet
BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'
BASE32_MAP = {c: i for i, c in enumerate(BASE32)}


def encode(latitude: float, longitude: float, precision: int = 9) -> str:
    """
    Encode latitude/longitude to geohash string.

    Args:
        latitude: Latitude in degrees (-90 to 90)
        longitude: Longitude in degrees (-180 to 180)
        precision: Number of characters (1-12)

    Returns:
        Geohash string of specified precision
    """
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


def decode(geohash: str) -> Tuple[float, float, float, float]:
    """
    Decode geohash to bounding box.

    Args:
        geohash: Geohash string

    Returns:
        Tuple of (min_lat, min_lng, max_lat, max_lng)
    """
    lat_range = [-90.0, 90.0]
    lng_range = [-180.0, 180.0]
    is_longitude = True

    for char in geohash.lower():
        if char not in BASE32_MAP:
            continue

        bits = BASE32_MAP[char]

        for i in range(4, -1, -1):
            bit = (bits >> i) & 1
            if is_longitude:
                mid = (lng_range[0] + lng_range[1]) / 2
                if bit:
                    lng_range[0] = mid
                else:
                    lng_range[1] = mid
            else:
                mid = (lat_range[0] + lat_range[1]) / 2
                if bit:
                    lat_range[0] = mid
                else:
                    lat_range[1] = mid
            is_longitude = not is_longitude

    return (lat_range[0], lng_range[0], lat_range[1], lng_range[1])


def decode_center(geohash: str) -> Tuple[float, float]:
    """
    Decode geohash to center point.

    Args:
        geohash: Geohash string

    Returns:
        Tuple of (latitude, longitude)
    """
    min_lat, min_lng, max_lat, max_lng = decode(geohash)
    return ((min_lat + max_lat) / 2, (min_lng + max_lng) / 2)


def neighbors(geohash: str) -> dict:
    """
    Get all 8 neighboring geohashes.

    Returns:
        Dict with keys: n, ne, e, se, s, sw, w, nw
    """
    lat, lng = decode_center(geohash)
    precision = len(geohash)

    # Calculate approximate step sizes
    lat_step = 180.0 / (2 ** (precision * 2.5))
    lng_step = 360.0 / (2 ** (precision * 2.5))

    return {
        'n': encode(lat + lat_step, lng, precision),
        'ne': encode(lat + lat_step, lng + lng_step, precision),
        'e': encode(lat, lng + lng_step, precision),
        'se': encode(lat - lat_step, lng + lng_step, precision),
        's': encode(lat - lat_step, lng, precision),
        'sw': encode(lat - lat_step, lng - lng_step, precision),
        'w': encode(lat, lng - lng_step, precision),
        'nw': encode(lat + lat_step, lng - lng_step, precision),
    }


def expand(geohash: str) -> List[str]:
    """
    Get geohash and all its neighbors (9 total).

    Useful for proximity queries.
    """
    result = [geohash]
    result.extend(neighbors(geohash).values())
    return list(set(result))


def bounding_box(geohash: str) -> dict:
    """
    Get bounding box as a dictionary.

    Returns:
        Dict with min_lat, min_lng, max_lat, max_lng, center_lat, center_lng
    """
    min_lat, min_lng, max_lat, max_lng = decode(geohash)
    return {
        'min_lat': min_lat,
        'min_lng': min_lng,
        'max_lat': max_lat,
        'max_lng': max_lng,
        'center_lat': (min_lat + max_lat) / 2,
        'center_lng': (min_lng + max_lng) / 2,
    }


def distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.

    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def precision_for_distance(distance_meters: float) -> int:
    """
    Get appropriate geohash precision for a given distance.

    Args:
        distance_meters: Search radius in meters

    Returns:
        Recommended geohash precision
    """
    # Approximate geohash cell sizes at equator
    precisions = {
        1: 5000000,   # ~5000km
        2: 1250000,   # ~1250km
        3: 156000,    # ~156km
        4: 39000,     # ~39km
        5: 5000,      # ~5km
        6: 1200,      # ~1.2km
        7: 150,       # ~150m
        8: 38,        # ~38m
        9: 5,         # ~5m
    }

    for precision, size in sorted(precisions.items()):
        if size <= distance_meters:
            return precision

    return 9  # Maximum precision


def geohashes_in_radius(center_lat: float, center_lng: float,
                         radius_meters: float, precision: int = None) -> List[str]:
    """
    Get all geohashes that intersect with a circle.

    Args:
        center_lat: Center latitude
        center_lng: Center longitude
        radius_meters: Radius in meters
        precision: Geohash precision (auto-calculated if None)

    Returns:
        List of geohash strings covering the area
    """
    if precision is None:
        precision = precision_for_distance(radius_meters)

    # Start with center geohash
    center_hash = encode(center_lat, center_lng, precision)
    result = set([center_hash])

    # Expand outward until we cover the radius
    # This is a simple implementation - production should use proper spatial algorithms
    to_check = [center_hash]
    checked = set()

    while to_check:
        current = to_check.pop(0)
        if current in checked:
            continue
        checked.add(current)

        current_center = decode_center(current)
        dist = distance_meters(center_lat, center_lng,
                              current_center[0], current_center[1])

        if dist <= radius_meters * 1.5:  # Include some margin
            result.add(current)
            for neighbor in neighbors(current).values():
                if neighbor not in checked:
                    to_check.append(neighbor)

    return list(result)


# Sierra Leone specific
SIERRA_LEONE_BOUNDS = {
    'min_lat': 6.9,
    'max_lat': 10.0,
    'min_lng': -13.5,
    'max_lng': -10.3,
}


def is_in_sierra_leone(lat: float, lng: float) -> bool:
    """Check if coordinates are within Sierra Leone bounds."""
    return (SIERRA_LEONE_BOUNDS['min_lat'] <= lat <= SIERRA_LEONE_BOUNDS['max_lat'] and
            SIERRA_LEONE_BOUNDS['min_lng'] <= lng <= SIERRA_LEONE_BOUNDS['max_lng'])


def get_region_from_geohash(geohash: str) -> Optional[str]:
    """
    Determine Sierra Leone region from geohash prefix.

    Returns region name or None if outside Sierra Leone.
    """
    lat, lng = decode_center(geohash)

    if not is_in_sierra_leone(lat, lng):
        return None

    # Rough region boundaries (simplified)
    if lng > -12.0:
        if lat > 8.5:
            return "Northern Province"
        else:
            return "Eastern Province"
    elif lng > -13.0:
        if lat > 8.5:
            return "North West Province"
        elif lat > 7.5:
            return "Southern Province"
        else:
            return "Southern Province"
    else:
        return "Western Area"
