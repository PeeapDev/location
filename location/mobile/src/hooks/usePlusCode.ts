/**
 * Hook for generating Plus Codes from location data
 */

import { useMemo } from 'react';
import { encodePlusCode, encodePlusCodeWithShort, type PlusCodeResult } from '@/lib/plusCode';

// Sierra Leone reference point (Freetown)
const SL_REFERENCE = {
  latitude: 8.4657,
  longitude: -13.2317,
};

export interface UsePlusCodeOptions {
  /** Precision level (10, 11, or 12) */
  precision?: 10 | 11 | 12;
  /** Use Sierra Leone as reference for short codes */
  useLocalReference?: boolean;
  /** Custom reference point */
  customReference?: { latitude: number; longitude: number };
}

export interface UsePlusCodeResult {
  /** Plus Code result (null if no location) */
  plusCode: PlusCodeResult | null;
  /** Formatted full code for display */
  formattedCode: string | null;
  /** Short code if available */
  shortCode: string | null;
  /** Area size description */
  areaSizeDescription: string | null;
}

/**
 * Generate a Plus Code from coordinates
 */
export function usePlusCode(
  latitude: number | null,
  longitude: number | null,
  options: UsePlusCodeOptions = {}
): UsePlusCodeResult {
  const {
    precision = 11,
    useLocalReference = true,
    customReference,
  } = options;

  const plusCode = useMemo(() => {
    if (latitude === null || longitude === null) {
      return null;
    }

    const reference = customReference || (useLocalReference ? SL_REFERENCE : null);

    if (reference) {
      return encodePlusCodeWithShort(
        latitude,
        longitude,
        reference.latitude,
        reference.longitude,
        precision
      );
    }

    return encodePlusCode(latitude, longitude, precision);
  }, [latitude, longitude, precision, useLocalReference, customReference]);

  const formattedCode = plusCode?.fullCode || null;
  const shortCode = plusCode?.shortCode || null;

  const areaSizeDescription = useMemo(() => {
    if (!plusCode) return null;
    const [width, height] = plusCode.areaSizeMeters;
    return `${width}m x ${height}m`;
  }, [plusCode]);

  return {
    plusCode,
    formattedCode,
    shortCode,
    areaSizeDescription,
  };
}

export default usePlusCode;
