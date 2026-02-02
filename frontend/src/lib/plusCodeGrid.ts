/**
 * Plus Code Grid Visualization Utilities
 *
 * Calculates Plus Code grid cells for map visualization based on zoom level.
 * Plus Codes use a grid system where:
 * - First 2 chars: 20° x 20° grid
 * - Next 2 chars: 1° x 1° grid
 * - Next 2 chars: 0.05° x 0.05° grid (~5.5km at equator)
 * - Next 2 chars (after +): 0.0025° x 0.0025° grid (~275m)
 * - Extra chars: Finer divisions (~14m, ~3m, etc.)
 */

// Plus Code character set (20 characters)
const CODE_ALPHABET = '23456789CFGHJMPQRVWX';

// Grid step sizes in degrees for each precision level
const GRID_STEPS = [
  20,        // First pair: 20°
  1,         // Second pair: 1°
  0.05,      // Third pair: 0.05°
  0.0025,    // Fourth pair (after +): 0.0025°
  0.000125,  // Fifth pair: 0.000125° (~14m)
];

export interface PlusCodeCell {
  code: string;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  center: {
    lat: number;
    lng: number;
  };
}

export interface GridOptions {
  minZoom?: number;  // Minimum zoom to show grid
  maxCells?: number; // Maximum cells to render
}

/**
 * Determine grid precision based on map zoom level
 */
export function getGridPrecision(zoom: number): number {
  if (zoom < 12) return 0;  // Don't show grid below zoom 12
  if (zoom < 14) return 6;  // Show ~5.5km cells (6 char code before +)
  if (zoom < 16) return 8;  // Show ~275m cells (full 8 char code)
  if (zoom < 18) return 10; // Show ~14m cells
  return 11;                // Show ~3m cells
}

/**
 * Get grid step size in degrees for a given precision
 */
export function getStepSize(precision: number): number {
  if (precision <= 2) return GRID_STEPS[0];
  if (precision <= 4) return GRID_STEPS[1];
  if (precision <= 6) return GRID_STEPS[2];
  if (precision <= 8) return GRID_STEPS[3];
  return GRID_STEPS[4];
}

/**
 * Encode a single coordinate pair to the specified precision
 */
function encodeCoordinate(lat: number, lng: number, precision: number): string {
  // Normalize coordinates
  lat = Math.max(-90, Math.min(90, lat)) + 90;
  lng = Math.max(-180, Math.min(180, lng)) + 180;

  let code = '';
  let latDiv = 20;
  let lngDiv = 20;

  for (let i = 0; i < precision; i += 2) {
    // After 8 characters, we're in the suffix
    if (i === 8 && code.length === 8) {
      code += '+';
    }

    const latIdx = Math.min(Math.floor(lat / latDiv), 19);
    const lngIdx = Math.min(Math.floor(lng / lngDiv), 19);

    code += CODE_ALPHABET[latIdx];
    code += CODE_ALPHABET[lngIdx];

    lat = lat - (latIdx * latDiv);
    lng = lng - (lngIdx * lngDiv);

    latDiv /= 20;
    lngDiv /= 20;
  }

  // Add + if not already present
  if (code.length >= 8 && !code.includes('+')) {
    code = code.slice(0, 8) + '+' + code.slice(8);
  }

  return code;
}

/**
 * Decode Plus Code to bounds
 */
function decodeToArea(code: string): { south: number; west: number; north: number; east: number } {
  // Remove +
  code = code.replace('+', '');

  let south = -90;
  let west = -180;
  let latSize = 20;
  let lngSize = 20;

  for (let i = 0; i < code.length; i += 2) {
    const latIdx = CODE_ALPHABET.indexOf(code[i]);
    const lngIdx = CODE_ALPHABET.indexOf(code[i + 1]);

    if (latIdx < 0 || lngIdx < 0) break;

    south += latIdx * latSize;
    west += lngIdx * lngSize;

    latSize /= 20;
    lngSize /= 20;
  }

  return {
    south,
    west,
    north: south + latSize * 20,
    east: west + lngSize * 20,
  };
}

/**
 * Generate Plus Code grid cells for the visible map bounds
 */
export function generatePlusCodeGrid(
  bounds: { north: number; south: number; east: number; west: number },
  zoom: number,
  options: GridOptions = {}
): PlusCodeCell[] {
  const { minZoom = 12, maxCells = 500 } = options;

  if (zoom < minZoom) {
    return [];
  }

  const precision = getGridPrecision(zoom);
  if (precision === 0) return [];

  const step = getStepSize(precision);
  const cells: PlusCodeCell[] = [];

  // Snap bounds to grid
  const startLat = Math.floor(bounds.south / step) * step;
  const startLng = Math.floor(bounds.west / step) * step;
  const endLat = Math.ceil(bounds.north / step) * step;
  const endLng = Math.ceil(bounds.east / step) * step;

  // Generate grid cells
  for (let lat = startLat; lat < endLat; lat += step) {
    for (let lng = startLng; lng < endLng; lng += step) {
      if (cells.length >= maxCells) {
        return cells;
      }

      const centerLat = lat + step / 2;
      const centerLng = lng + step / 2;

      // Generate Plus Code for this cell
      const code = encodeCoordinate(centerLat, centerLng, precision);

      cells.push({
        code,
        bounds: {
          south: lat,
          west: lng,
          north: lat + step,
          east: lng + step,
        },
        center: {
          lat: centerLat,
          lng: centerLng,
        },
      });
    }
  }

  return cells;
}

/**
 * Convert Plus Code grid cells to GeoJSON for MapLibre
 */
export function gridToGeoJSON(cells: PlusCodeCell[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature' as const,
      properties: {
        code: cell.code,
        shortCode: cell.code.replace(/^.{4}/, '').replace('+', ''),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [cell.bounds.west, cell.bounds.south],
          [cell.bounds.east, cell.bounds.south],
          [cell.bounds.east, cell.bounds.north],
          [cell.bounds.west, cell.bounds.north],
          [cell.bounds.west, cell.bounds.south],
        ]],
      },
    })),
  };
}

/**
 * Format Plus Code for display (with short code option)
 */
export function formatPlusCode(code: string, short: boolean = false): string {
  if (short && code.length > 6) {
    // Return just the local part (after the area code)
    const plusIndex = code.indexOf('+');
    if (plusIndex > 4) {
      return code.slice(4);
    }
  }
  return code;
}
