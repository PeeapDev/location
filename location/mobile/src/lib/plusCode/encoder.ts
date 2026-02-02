/**
 * Plus Code (Open Location Code) encoder for offline use
 *
 * Uses the open-location-code npm package to generate Plus Codes
 * entirely on the device without needing network access.
 */

import OpenLocationCode from 'open-location-code';

const olc = OpenLocationCode;

export interface PlusCodeResult {
  /** Full Plus Code (e.g., "6FG22222+22") */
  fullCode: string;
  /** Short Plus Code if reference available (e.g., "2222+22") */
  shortCode?: string;
  /** Center latitude of the code area */
  latitude: number;
  /** Center longitude of the code area */
  longitude: number;
  /** Precision level (10, 11, or 12 characters) */
  precision: number;
  /** Approximate area in meters [width, height] */
  areaSizeMeters: [number, number];
}

export interface CodeArea {
  latitudeLo: number;
  latitudeHi: number;
  longitudeLo: number;
  longitudeHi: number;
  latitudeCenter: number;
  longitudeCenter: number;
  codeLength: number;
}

/**
 * Encode coordinates to a Plus Code
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @param precision Code length (10 = ~14m x 14m, 11 = ~3m x 3m, 12 = ~0.6m x 0.6m)
 * @returns Plus Code result with full code and metadata
 */
export function encodePlusCode(
  latitude: number,
  longitude: number,
  precision: 10 | 11 | 12 = 11
): PlusCodeResult {
  // Encode to Plus Code
  const fullCode = olc.encode(latitude, longitude, precision);

  // Get the code area for additional info
  const codeArea = olc.decode(fullCode);

  // Calculate approximate area size in meters
  const latHeight = (codeArea.latitudeHi - codeArea.latitudeLo) * 111320;
  const lngWidth = (codeArea.longitudeHi - codeArea.longitudeLo) * 111320 *
    Math.cos((codeArea.latitudeCenter * Math.PI) / 180);

  return {
    fullCode,
    latitude: codeArea.latitudeCenter,
    longitude: codeArea.longitudeCenter,
    precision,
    areaSizeMeters: [Math.round(lngWidth * 10) / 10, Math.round(latHeight * 10) / 10],
  };
}

/**
 * Encode coordinates to a Plus Code with a short code option
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @param referenceLatitude Reference point latitude for shortening
 * @param referenceLongitude Reference point longitude for shortening
 * @param precision Code length
 * @returns Plus Code result with full and short codes
 */
export function encodePlusCodeWithShort(
  latitude: number,
  longitude: number,
  referenceLatitude: number,
  referenceLongitude: number,
  precision: 10 | 11 | 12 = 11
): PlusCodeResult {
  const result = encodePlusCode(latitude, longitude, precision);

  // Try to shorten the code using the reference point
  try {
    const shortCode = olc.shorten(result.fullCode, referenceLatitude, referenceLongitude);
    if (shortCode !== result.fullCode) {
      result.shortCode = shortCode;
    }
  } catch {
    // Shortening failed - reference point too far, just use full code
  }

  return result;
}

/**
 * Decode a Plus Code to coordinates
 *
 * @param plusCode The Plus Code to decode (can be full or short)
 * @param referenceLatitude Reference latitude for short codes
 * @param referenceLongitude Reference longitude for short codes
 * @returns Code area with bounds and center
 */
export function decodePlusCode(
  plusCode: string,
  referenceLatitude?: number,
  referenceLongitude?: number
): CodeArea | null {
  try {
    let codeToUse = plusCode;

    // If it's a short code, recover it using the reference
    if (!olc.isFull(plusCode) && referenceLatitude !== undefined && referenceLongitude !== undefined) {
      codeToUse = olc.recoverNearest(plusCode, referenceLatitude, referenceLongitude);
    }

    if (!olc.isValid(codeToUse)) {
      return null;
    }

    const decoded = olc.decode(codeToUse);
    return {
      latitudeLo: decoded.latitudeLo,
      latitudeHi: decoded.latitudeHi,
      longitudeLo: decoded.longitudeLo,
      longitudeHi: decoded.longitudeHi,
      latitudeCenter: decoded.latitudeCenter,
      longitudeCenter: decoded.longitudeCenter,
      codeLength: decoded.codeLength,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a Plus Code
 */
export function isValidPlusCode(plusCode: string): boolean {
  try {
    return olc.isValid(plusCode);
  } catch {
    return false;
  }
}

/**
 * Check if a Plus Code is a full code
 */
export function isFullPlusCode(plusCode: string): boolean {
  try {
    return olc.isFull(plusCode);
  } catch {
    return false;
  }
}

/**
 * Check if a Plus Code is a short code
 */
export function isShortPlusCode(plusCode: string): boolean {
  try {
    return olc.isShort(plusCode);
  } catch {
    return false;
  }
}

/**
 * Format Plus Code for display with proper spacing
 */
export function formatPlusCode(plusCode: string): string {
  // Plus codes are already formatted with + separator
  return plusCode.toUpperCase();
}

/**
 * Get the precision description for a Plus Code length
 */
export function getPrecisionDescription(precision: number): string {
  switch (precision) {
    case 10:
      return '~14m x 14m';
    case 11:
      return '~3m x 3m';
    case 12:
      return '~0.6m x 0.6m';
    default:
      return 'Unknown';
  }
}
