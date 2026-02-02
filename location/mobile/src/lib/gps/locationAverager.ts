/**
 * Location Averager for GPS multi-sample averaging (Mobile)
 * Same implementation as web version - shared algorithm
 */

import type { GPSSample, AveragedPosition } from './types';

export interface LocationAverager {
  samples: GPSSample[];
  maxSamples: number;
}

export function createLocationAverager(maxSamples: number = 5): LocationAverager {
  return {
    samples: [],
    maxSamples,
  };
}

function calculateWeight(accuracyMeters: number): number {
  const clampedAccuracy = Math.max(1, Math.min(1000, accuracyMeters));
  return 1 / (clampedAccuracy * clampedAccuracy);
}

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

  const newSamples = [...averager.samples, newSample];
  if (newSamples.length > averager.maxSamples) {
    newSamples.shift();
  }

  return {
    ...averager,
    samples: newSamples,
  };
}

export function computeAveragePosition(averager: LocationAverager): AveragedPosition | null {
  if (averager.samples.length === 0) {
    return null;
  }

  const totalWeight = averager.samples.reduce((sum, sample) => sum + sample.weight, 0);

  if (totalWeight === 0) {
    return null;
  }

  let avgLat = 0;
  let avgLng = 0;

  for (const sample of averager.samples) {
    avgLat += sample.latitude * sample.weight;
    avgLng += sample.longitude * sample.weight;
  }

  avgLat /= totalWeight;
  avgLng /= totalWeight;

  let weightedAccuracySum = 0;
  for (const sample of averager.samples) {
    weightedAccuracySum += sample.weight * sample.accuracy;
  }
  const estimatedAccuracy = weightedAccuracySum / totalWeight;

  const latestTimestamp = Math.max(...averager.samples.map((s) => s.timestamp));

  return {
    latitude: avgLat,
    longitude: avgLng,
    accuracy: estimatedAccuracy,
    sampleCount: averager.samples.length,
    timestamp: latestTimestamp,
  };
}

export function getBestAccuracy(averager: LocationAverager): number | null {
  if (averager.samples.length === 0) {
    return null;
  }
  return Math.min(...averager.samples.map((s) => s.accuracy));
}

export function hasEnoughSamples(averager: LocationAverager): boolean {
  return averager.samples.length >= averager.maxSamples;
}

export function getSampleCount(averager: LocationAverager): number {
  return averager.samples.length;
}

export function clearSamples(averager: LocationAverager): LocationAverager {
  return {
    ...averager,
    samples: [],
  };
}
