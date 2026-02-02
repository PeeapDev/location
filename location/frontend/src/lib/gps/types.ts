/**
 * GPS type definitions for high-accuracy location acquisition
 */

/**
 * Raw GPS reading from the browser's Geolocation API
 */
export interface GPSReading {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

/**
 * Filtered GPS position after Kalman filter processing
 */
export interface FilteredPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Averaged GPS position from multiple samples
 */
export interface AveragedPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // Estimated combined accuracy
  sampleCount: number;
  timestamp: number;
}

/**
 * GPS acquisition status
 */
export type GPSStatus = 'idle' | 'acquiring' | 'acquired' | 'error';

/**
 * GPS error types
 */
export type GPSErrorType =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'not_supported'
  | 'accuracy_insufficient'
  | 'unknown';

/**
 * GPS error information
 */
export interface GPSError {
  type: GPSErrorType;
  message: string;
  code?: number;
}

/**
 * Options for the high accuracy location hook
 */
export interface HighAccuracyLocationOptions {
  /** Minimum accuracy required in meters (default: 25) */
  minAccuracyThreshold?: number;
  /** Number of samples to collect for averaging (default: 5) */
  sampleCount?: number;
  /** Enable Kalman filter smoothing (default: true) */
  enableKalmanFilter?: boolean;
  /** Enable multi-sample averaging (default: true) */
  enableAveraging?: boolean;
  /** Maximum time to wait for a single reading in ms (default: 30000) */
  timeout?: number;
  /** Maximum age of cached position in ms (default: 0 - always fresh) */
  maximumAge?: number;
}

/**
 * Return type for the high accuracy location hook
 */
export interface HighAccuracyLocationResult {
  /** Current acquisition status */
  status: GPSStatus;
  /** Error information if status is 'error' */
  error: GPSError | null;
  /** Raw GPS reading (latest) */
  currentReading: GPSReading | null;
  /** Position after Kalman filter (if enabled) */
  filteredReading: FilteredPosition | null;
  /** Position after multi-sample averaging (if enabled) */
  averagedPosition: AveragedPosition | null;
  /** Number of samples collected */
  sampleCount: number;
  /** Target number of samples */
  targetSampleCount: number;
  /** Current accuracy in meters */
  currentAccuracy: number | null;
  /** Best accuracy achieved across all samples */
  bestAccuracy: number | null;
  /** Whether accuracy threshold has been met */
  accuracyMet: boolean;
  /** Start GPS acquisition */
  startAcquisition: () => void;
  /** Stop GPS acquisition */
  stopAcquisition: () => void;
  /** Accept the current averaged/filtered location */
  acceptCurrentLocation: () => GPSReading | FilteredPosition | AveragedPosition | null;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Sample stored for averaging
 */
export interface GPSSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  weight: number; // Higher accuracy = higher weight
}
