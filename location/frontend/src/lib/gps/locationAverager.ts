/**
 * Location Averager for GPS multi-sample averaging
 *
 * Collects multiple GPS samples and computes a weighted average
 * based on accuracy - better accuracy readings get higher weight.
 */

import type { GPSSample, AveragedPosition } from './types';

export interface LocationAverager {
  samples: GPSSample[];
  maxSamples: number;
}

/**
 * Create a new location averager
 */
export function createLocationAverager(maxSamples: number = 5): LocationAverager {
  return {
    samples: [],
    maxSamples,
  };
}

/**
 * Calculate weight for a GPS reading based on accuracy
 * Better accuracy = higher weight
 * Using inverse square of accuracy for stronger weighting
 */
function calculateWeight(accuracyMeters: number): number {
  // Clamp accuracy to reasonable bounds (1m to 1000m)
  const clampedAccuracy = Math.max(1, Math.min(1000, accuracyMeters));
  // Inverse square weighting - readings with half the accuracy get 4x the weight
  return 1 / (clampedAccuracy * clampedAccuracy);
}

/**
 * Add a sample to the averager
 */
export function addSample(
  averager: LocationAverager,
  latitude: number,
  longitude: number,
  accuracyMeters: number,
  timestamp: number = Date.now()
): LocationAverager {
  const weight = calculateWeight(accuracyMeters);

  const newSample: GPSSample = {
    latitude,
    longitude,
    accuracy: accuracyMeters,
    timestamp,
    weight,
  };

  // Add sample, keeping only the most recent maxSamples
  const newSamples = [...averager.samples, newSample];
  if (newSamples.length > averager.maxSamples) {
    newSamples.shift(); // Remove oldest sample
  }

  return {
    ...averager,
    samples: newSamples,
  };
}

/**
 * Compute the weighted average position from collected samples
 */
export function computeAveragePosition(averager: LocationAverager): AveragedPosition | null {
  if (averager.samples.length === 0) {
    return null;
  }

  // Calculate total weight
  const totalWeight = averager.samples.reduce((sum, sample) => sum + sample.weight, 0);

  if (totalWeight === 0) {
    return null;
  }

  // Calculate weighted average latitude and longitude
  let avgLat = 0;
  let avgLng = 0;

  for (const sample of averager.samples) {
    avgLat += sample.latitude * sample.weight;
    avgLng += sample.longitude * sample.weight;
  }

  avgLat /= totalWeight;
  avgLng /= totalWeight;

  // Estimate combined accuracy
  // Use weighted harmonic mean of accuracies for a conservative estimate
  // This gives more weight to the better readings in the final accuracy estimate
  let weightedAccuracySum = 0;
  for (const sample of averager.samples) {
    weightedAccuracySum += sample.weight * sample.accuracy;
  }
  const estimatedAccuracy = weightedAccuracySum / totalWeight;

  // Use the latest timestamp
  const latestTimestamp = Math.max(...averager.samples.map((s) => s.timestamp));

  return {
    latitude: avgLat,
    longitude: avgLng,
    accuracy: estimatedAccuracy,
    sampleCount: averager.samples.length,
    timestamp: latestTimestamp,
  };
}

/**
 * Get the best accuracy from all samples
 */
export function getBestAccuracy(averager: LocationAverager): number | null {
  if (averager.samples.length === 0) {
    return null;
  }
  return Math.min(...averager.samples.map((s) => s.accuracy));
}

/**
 * Check if enough samples have been collected
 */
export function hasEnoughSamples(averager: LocationAverager): boolean {
  return averager.samples.length >= averager.maxSamples;
}

/**
 * Get the current sample count
 */
export function getSampleCount(averager: LocationAverager): number {
  return averager.samples.length;
}

/**
 * Clear all samples
 */
export function clearSamples(averager: LocationAverager): LocationAverager {
  return {
    ...averager,
    samples: [],
  };
}

/**
 * Remove samples older than a certain age
 */
export function removeOldSamples(
  averager: LocationAverager,
  maxAgeMs: number = 60000
): LocationAverager {
  const cutoff = Date.now() - maxAgeMs;
  return {
    ...averager,
    samples: averager.samples.filter((s) => s.timestamp >= cutoff),
  };
}
