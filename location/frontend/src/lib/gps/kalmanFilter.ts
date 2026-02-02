/**
 * 1D Kalman Filter for GPS coordinate smoothing
 *
 * The Kalman filter helps reduce GPS jitter by combining:
 * - Prediction from the previous state
 * - New measurements with their uncertainty (accuracy)
 *
 * This creates a smoothed estimate that's more stable than raw GPS readings.
 */

export interface KalmanState {
  /** Current estimated value */
  value: number;
  /** Current uncertainty (variance) */
  uncertainty: number;
  /** Process noise - how much we expect the value to change naturally */
  processNoise: number;
  /** Timestamp of last update */
  lastTimestamp: number;
}

/**
 * Create a new Kalman filter state
 */
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

/**
 * Update Kalman filter with a new measurement
 *
 * @param state Current Kalman state
 * @param measurement New measurement value
 * @param measurementNoise Measurement uncertainty (GPS accuracy in degrees)
 * @param timestamp Timestamp of measurement
 * @returns Updated Kalman state
 */
export function updateKalman(
  state: KalmanState,
  measurement: number,
  measurementNoise: number,
  timestamp: number = Date.now()
): KalmanState {
  // Time delta in seconds
  const dt = (timestamp - state.lastTimestamp) / 1000;

  // Predict step: uncertainty grows with time
  // More time = more uncertainty about where we are
  const predictedUncertainty = state.uncertainty + state.processNoise * dt;

  // Kalman gain: how much we trust the new measurement vs prediction
  // Higher measurement noise = trust prediction more
  // Lower measurement noise = trust measurement more
  const kalmanGain = predictedUncertainty / (predictedUncertainty + measurementNoise);

  // Update step: blend prediction with measurement
  const newValue = state.value + kalmanGain * (measurement - state.value);
  const newUncertainty = (1 - kalmanGain) * predictedUncertainty;

  return {
    value: newValue,
    uncertainty: newUncertainty,
    processNoise: state.processNoise,
    lastTimestamp: timestamp,
  };
}

/**
 * GPS Kalman Filter for 2D coordinates (latitude, longitude)
 */
export interface GPSKalmanFilter {
  latState: KalmanState;
  lngState: KalmanState;
}

/**
 * Create a GPS Kalman filter for smoothing coordinates
 */
export function createGPSKalmanFilter(
  initialLat: number,
  initialLng: number,
  initialAccuracyMeters: number = 10
): GPSKalmanFilter {
  // Convert accuracy from meters to approximate degrees
  // At equator: 1 degree latitude ≈ 111,320 meters
  // Longitude varies by latitude, but we use latitude approximation for simplicity
  const accuracyDegrees = initialAccuracyMeters / 111320;

  return {
    latState: createKalmanState(initialLat, accuracyDegrees),
    lngState: createKalmanState(initialLng, accuracyDegrees),
  };
}

/**
 * Update GPS Kalman filter with new coordinates
 *
 * @param filter Current GPS Kalman filter
 * @param latitude New latitude measurement
 * @param longitude New longitude measurement
 * @param accuracyMeters GPS accuracy in meters
 * @param timestamp Measurement timestamp
 * @returns Updated filter and smoothed coordinates
 */
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
  // Convert accuracy from meters to degrees
  const accuracyDegrees = accuracyMeters / 111320;

  // Update both latitude and longitude filters
  const newLatState = updateKalman(filter.latState, latitude, accuracyDegrees, timestamp);
  const newLngState = updateKalman(filter.lngState, longitude, accuracyDegrees, timestamp);

  // Estimate combined accuracy (convert back to meters)
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

/**
 * Reset GPS Kalman filter with new initial position
 */
export function resetGPSKalman(
  latitude: number,
  longitude: number,
  accuracyMeters: number = 10
): GPSKalmanFilter {
  return createGPSKalmanFilter(latitude, longitude, accuracyMeters);
}
