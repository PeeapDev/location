/**
 * 1D Kalman Filter for GPS coordinate smoothing (Mobile)
 * Same implementation as web version - shared algorithm
 */

export interface KalmanState {
  value: number;
  uncertainty: number;
  processNoise: number;
  lastTimestamp: number;
}

export function createKalmanState(
  initialValue: number,
  initialUncertainty: number = 10,
  processNoise: number = 0.001
): KalmanState {
  return {
    value: initialValue,
    uncertainty: initialUncertainty,
    processNoise,
    lastTimestamp: Date.now(),
  };
}

export function updateKalman(
  state: KalmanState,
  measurement: number,
  measurementNoise: number,
  timestamp: number = Date.now()
): KalmanState {
  const dt = (timestamp - state.lastTimestamp) / 1000;
  const predictedUncertainty = state.uncertainty + state.processNoise * dt;
  const kalmanGain = predictedUncertainty / (predictedUncertainty + measurementNoise);
  const newValue = state.value + kalmanGain * (measurement - state.value);
  const newUncertainty = (1 - kalmanGain) * predictedUncertainty;

  return {
    value: newValue,
    uncertainty: newUncertainty,
    processNoise: state.processNoise,
    lastTimestamp: timestamp,
  };
}

export interface GPSKalmanFilter {
  latState: KalmanState;
  lngState: KalmanState;
}

export function createGPSKalmanFilter(
  initialLat: number,
  initialLng: number,
  initialAccuracyMeters: number = 10
): GPSKalmanFilter {
  const accuracyDegrees = initialAccuracyMeters / 111320;
  return {
    latState: createKalmanState(initialLat, accuracyDegrees),
    lngState: createKalmanState(initialLng, accuracyDegrees),
  };
}

export function updateGPSKalman(
  filter: GPSKalmanFilter,
  latitude: number,
  longitude: number,
  accuracyMeters: number,
  timestamp: number = Date.now()
): {
  filter: GPSKalmanFilter;
  latitude: number;
  longitude: number;
  estimatedAccuracy: number;
} {
  const accuracyDegrees = accuracyMeters / 111320;
  const newLatState = updateKalman(filter.latState, latitude, accuracyDegrees, timestamp);
  const newLngState = updateKalman(filter.lngState, longitude, accuracyDegrees, timestamp);

  const estimatedAccuracy = Math.sqrt(
    newLatState.uncertainty * newLatState.uncertainty +
    newLngState.uncertainty * newLngState.uncertainty
  ) * 111320;

  return {
    filter: {
      latState: newLatState,
      lngState: newLngState,
    },
    latitude: newLatState.value,
    longitude: newLngState.value,
    estimatedAccuracy,
  };
}

export function resetGPSKalman(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 10
): GPSKalmanFilter {
  return createGPSKalmanFilter(latitude, longitude, accuracyMeters);
}
