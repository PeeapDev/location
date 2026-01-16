/**
 * Freetown (Western Area) boundary GeoJSON
 * Contains Western Area Urban (Freetown City) and Western Area Rural districts
 * Data source: OpenStreetMap via Overpass API
 */

/**
 * Western Area Urban District (Freetown City)
 * OSM Relation ID: 3242456
 * Admin Level: 5
 */
export const WESTERN_AREA_URBAN: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Western Area Urban',
    name_local: 'Freetown',
    admin_level: 5,
    osm_id: 3242456,
    wikidata: 'Q1673142',
    district_type: 'urban',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      // Simplified boundary polygon (clockwise)
      [-13.2985, 8.4276],
      [-13.2888, 8.4277],
      [-13.2800, 8.4350],
      [-13.2700, 8.4500],
      [-13.2600, 8.4700],
      [-13.2500, 8.4850],
      [-13.2400, 8.4950],
      [-13.2300, 8.4996],
      [-13.2200, 8.4950],
      [-13.2100, 8.4850],
      [-13.2000, 8.4700],
      [-13.1900, 8.4500],
      [-13.1850, 8.4300],
      [-13.1800, 8.4100],
      [-13.1746, 8.3900],
      [-13.1800, 8.3800],
      [-13.1900, 8.3750],
      [-13.2100, 8.3737],
      [-13.2300, 8.3750],
      [-13.2500, 8.3800],
      [-13.2700, 8.3900],
      [-13.2850, 8.4050],
      [-13.2950, 8.4150],
      [-13.2985, 8.4276],
    ]],
  },
};

/**
 * Western Area Rural District
 * OSM Relation ID: 2541225
 * Admin Level: 5
 */
export const WESTERN_AREA_RURAL: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Western Area Rural',
    admin_level: 5,
    osm_id: 2541225,
    wikidata: 'Q2030876',
    district_type: 'rural',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      // Simplified boundary polygon (clockwise)
      [-13.1177, 8.4138],
      [-13.1000, 8.4300],
      [-13.0500, 8.4500],
      [-13.0000, 8.4600],
      [-12.9500, 8.4650],
      [-12.9137, 8.4700],
      [-12.9200, 8.4400],
      [-12.9300, 8.4000],
      [-12.9400, 8.3500],
      [-12.9500, 8.3000],
      [-12.9600, 8.2500],
      [-12.9700, 8.2000],
      [-12.9800, 8.1500],
      [-13.0000, 8.1000],
      [-13.0500, 8.0930],
      [-13.1000, 8.1000],
      [-13.1500, 8.1200],
      [-13.2000, 8.1500],
      [-13.2300, 8.2000],
      [-13.2450, 8.2500],
      [-13.2521, 8.3000],
      [-13.2500, 8.3500],
      [-13.2400, 8.3800],
      [-13.2200, 8.4000],
      [-13.1800, 8.4100],
      [-13.1500, 8.4120],
      [-13.1177, 8.4138],
    ]],
  },
};

/**
 * Combined Freetown (Western Area) boundary
 * Includes both Urban and Rural districts
 */
export const FREETOWN_BOUNDARY: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: 'FeatureCollection',
  features: [WESTERN_AREA_URBAN, WESTERN_AREA_RURAL],
};

/**
 * Freetown center point (approximate city center)
 */
export const FREETOWN_CENTER: [number, number] = [-13.2343, 8.4657];

/**
 * Western Area Urban center
 */
export const WESTERN_AREA_URBAN_CENTER: [number, number] = [-13.2343, 8.4657];

/**
 * Western Area Rural center
 */
export const WESTERN_AREA_RURAL_CENTER: [number, number] = [-13.0829, 8.2815];

/**
 * Freetown bounds [southwest, northeast]
 * Encompasses both Urban and Rural districts
 */
export const FREETOWN_BOUNDS: [[number, number], [number, number]] = [
  [-13.2985, 8.0930], // Southwest
  [-12.9137, 8.4996], // Northeast
];

/**
 * Western Area Urban bounds [southwest, northeast]
 */
export const WESTERN_AREA_URBAN_BOUNDS: [[number, number], [number, number]] = [
  [-13.2985, 8.3737], // Southwest
  [-13.1746, 8.4996], // Northeast
];

/**
 * Western Area Rural bounds [southwest, northeast]
 */
export const WESTERN_AREA_RURAL_BOUNDS: [[number, number], [number, number]] = [
  [-13.2521, 8.0930], // Southwest
  [-12.9137, 8.4700], // Northeast
];

/**
 * World polygon with Freetown Urban area cut out (for masking)
 */
export const FREETOWN_URBAN_MASK: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      // Outer ring (world bounds)
      [
        [-180, -90],
        [-180, 90],
        [180, 90],
        [180, -90],
        [-180, -90],
      ],
      // Inner ring (Western Area Urban - reversed to cut out)
      WESTERN_AREA_URBAN.geometry.coordinates[0].slice().reverse(),
    ],
  },
};

/**
 * Notable neighborhoods/areas in Freetown
 */
export const FREETOWN_NEIGHBORHOODS = [
  { name: 'Aberdeen', center: [-13.2720, 8.4768] as [number, number], type: 'residential' },
  { name: 'Lumley', center: [-13.2680, 8.4550] as [number, number], type: 'beach/residential' },
  { name: 'Wilberforce', center: [-13.2450, 8.4550] as [number, number], type: 'residential' },
  { name: 'Congo Town', center: [-13.2350, 8.4700] as [number, number], type: 'residential' },
  { name: 'Brookfields', center: [-13.2280, 8.4650] as [number, number], type: 'residential' },
  { name: 'Circular Road', center: [-13.2250, 8.4630] as [number, number], type: 'commercial' },
  { name: 'Siaka Stevens Street', center: [-13.2343, 8.4830] as [number, number], type: 'commercial/central' },
  { name: 'Kissy', center: [-13.1900, 8.4600] as [number, number], type: 'industrial/residential' },
  { name: 'Cline Town', center: [-13.2050, 8.4700] as [number, number], type: 'residential' },
  { name: 'Wellington', center: [-13.1750, 8.4500] as [number, number], type: 'residential' },
  { name: 'Tower Hill', center: [-13.2300, 8.4800] as [number, number], type: 'government' },
  { name: 'Kroo Bay', center: [-13.2280, 8.4870] as [number, number], type: 'residential' },
  { name: 'Mamba Point', center: [-13.2450, 8.4820] as [number, number], type: 'diplomatic/residential' },
  { name: 'Hill Station', center: [-13.2400, 8.4500] as [number, number], type: 'residential' },
  { name: 'Juba', center: [-13.2600, 8.4400] as [number, number], type: 'residential' },
  { name: 'Goderich', center: [-13.2850, 8.4300] as [number, number], type: 'beach/residential' },
  { name: 'York', center: [-13.2000, 8.3500] as [number, number], type: 'rural/beach' },
  { name: 'Kent', center: [-13.0700, 8.2000] as [number, number], type: 'rural/beach' },
  { name: 'Waterloo', center: [-13.0700, 8.3400] as [number, number], type: 'suburban' },
] as const;

/**
 * Major landmarks in Freetown
 */
export const FREETOWN_LANDMARKS = [
  { name: 'Cotton Tree', center: [-13.2343, 8.4830] as [number, number], type: 'historical' },
  { name: 'State House', center: [-13.2350, 8.4810] as [number, number], type: 'government' },
  { name: 'National Stadium', center: [-13.2180, 8.4750] as [number, number], type: 'sports' },
  { name: 'King Jimmy Market', center: [-13.2290, 8.4860] as [number, number], type: 'market' },
  { name: 'Big Market', center: [-13.2320, 8.4850] as [number, number], type: 'market' },
  { name: 'St. George\'s Cathedral', center: [-13.2340, 8.4825] as [number, number], type: 'religious' },
  { name: 'Foulah Town Mosque', center: [-13.2280, 8.4810] as [number, number], type: 'religious' },
  { name: 'Tacugama Chimpanzee Sanctuary', center: [-13.2150, 8.4200] as [number, number], type: 'wildlife' },
  { name: 'Lumley Beach', center: [-13.2700, 8.4530] as [number, number], type: 'beach' },
  { name: 'Aberdeen Beach', center: [-13.2750, 8.4800] as [number, number], type: 'beach' },
  { name: 'Fourah Bay College', center: [-13.2200, 8.4700] as [number, number], type: 'education' },
  { name: 'University of Sierra Leone', center: [-13.2200, 8.4700] as [number, number], type: 'education' },
  { name: 'Queen Elizabeth II Quay', center: [-13.2350, 8.4880] as [number, number], type: 'port' },
  { name: 'Freetown International Airport', center: [-13.1956, 8.6167] as [number, number], type: 'transport' },
] as const;

/**
 * District type
 */
export type FreetownDistrict = 'western_area_urban' | 'western_area_rural';

/**
 * Get district feature by type
 */
export function getDistrictFeature(district: FreetownDistrict): GeoJSON.Feature<GeoJSON.Polygon> {
  return district === 'western_area_urban' ? WESTERN_AREA_URBAN : WESTERN_AREA_RURAL;
}

/**
 * Get district bounds by type
 */
export function getDistrictBounds(district: FreetownDistrict): [[number, number], [number, number]] {
  return district === 'western_area_urban' ? WESTERN_AREA_URBAN_BOUNDS : WESTERN_AREA_RURAL_BOUNDS;
}

/**
 * Get district center by type
 */
export function getDistrictCenter(district: FreetownDistrict): [number, number] {
  return district === 'western_area_urban' ? WESTERN_AREA_URBAN_CENTER : WESTERN_AREA_RURAL_CENTER;
}

/**
 * Check if a point is within Freetown bounds
 */
export function isWithinFreetown(lng: number, lat: number): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = FREETOWN_BOUNDS;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

/**
 * Check if a point is within Western Area Urban bounds
 */
export function isWithinUrbanArea(lng: number, lat: number): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = WESTERN_AREA_URBAN_BOUNDS;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

/**
 * Get the nearest neighborhood to a point
 */
export function getNearestNeighborhood(lng: number, lat: number): typeof FREETOWN_NEIGHBORHOODS[number] | null {
  let nearest = null;
  let minDist = Infinity;

  for (const neighborhood of FREETOWN_NEIGHBORHOODS) {
    const [nLng, nLat] = neighborhood.center;
    const dist = Math.sqrt(Math.pow(lng - nLng, 2) + Math.pow(lat - nLat, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = neighborhood;
    }
  }

  return nearest;
}

/**
 * Get the nearest landmark to a point
 */
export function getNearestLandmark(lng: number, lat: number, maxDistanceKm: number = 2): typeof FREETOWN_LANDMARKS[number] | null {
  let nearest = null;
  let minDist = Infinity;

  // Approximate conversion: 1 degree ≈ 111km at equator
  const maxDistDegrees = maxDistanceKm / 111;

  for (const landmark of FREETOWN_LANDMARKS) {
    const [lLng, lLat] = landmark.center;
    const dist = Math.sqrt(Math.pow(lng - lLng, 2) + Math.pow(lat - lLat, 2));
    if (dist < minDist && dist <= maxDistDegrees) {
      minDist = dist;
      nearest = landmark;
    }
  }

  return nearest;
}
