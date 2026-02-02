'use client';

/**
 * High Accuracy Location Hook
 *
 * Provides GPS acquisition with:
 * - Kalman filter for smoothing jitter
 * - Multi-sample weighted averaging
 * - Accuracy threshold enforcement
 * - watchPosition for continuous tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  GPSReading,
  FilteredPosition,
  AveragedPosition,
  GPSStatus,
  GPSError,
  GPSErrorType,
  HighAccuracyLocationOptions,
  HighAccuracyLocationResult,
} from './types';
import {
  createGPSKalmanFilter,
  updateGPSKalman,
  resetGPSKalman,
  type GPSKalmanFilter,
} from './kalmanFilter';
import {
  createLocationAverager,
  addSample,
  computeAveragePosition,
  getBestAccuracy,
  hasEnoughSamples,
  getSampleCount,
  clearSamples,
  type LocationAverager,
} from './locationAverager';

const DEFAULT_OPTIONS: Required<HighAccuracyLocationOptions> = {
  minAccuracyThreshold: 25,
  sampleCount: 5,
  enableKalmanFilter: true,
  enableAveraging: true,
  timeout: 30000,
  maximumAge: 0,
};

function getErrorType(code: number): GPSErrorType {
  switch (code) {
    case 1:
      return 'permission_denied';
    case 2:
      return 'position_unavailable';
    case 3:
      return 'timeout';
    default:
      return 'unknown';
  }
}

function getErrorMessage(type: GPSErrorType): string {
  switch (type) {
    case 'permission_denied':
      return 'Location permission was denied. Please allow location access in your browser settings.';
    case 'position_unavailable':
      return 'Unable to determine your location. Please ensure GPS is enabled.';
    case 'timeout':
      return 'Location request timed out. Please try again.';
    case 'not_supported':
      return 'Geolocation is not supported by your browser.';
    case 'accuracy_insufficient':
      return 'Unable to get a sufficiently accurate location. Please try in an open area.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}

export function useHighAccuracyLocation(
  options: HighAccuracyLocationOptions = {}
): HighAccuracyLocationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [status, setStatus] = useState<GPSStatus>('idle');
  const [error, setError] = useState<GPSError | null>(null);
  const [currentReading, setCurrentReading] = useState<GPSReading | null>(null);
  const [filteredReading, setFilteredReading] = useState<FilteredPosition | null>(null);
  const [averagedPosition, setAveragedPosition] = useState<AveragedPosition | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [bestAccuracy, setBestAccuracy] = useState<number | null>(null);

  // Refs for mutable state
  const watchIdRef = useRef<number | null>(null);
  const kalmanFilterRef = useRef<GPSKalmanFilter | null>(null);
  const averagerRef = useRef<LocationAverager>(createLocationAverager(opts.sampleCount));
  const isAcquiredRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle incoming GPS position
  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const reading: GPSReading = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      setCurrentReading(reading);
      setCurrentAccuracy(reading.accuracy);

      // Apply Kalman filter if enabled
      let processedLat = reading.latitude;
      let processedLng = reading.longitude;
      let processedAccuracy = reading.accuracy;

      if (opts.enableKalmanFilter) {
        if (!kalmanFilterRef.current) {
          kalmanFilterRef.current = createGPSKalmanFilter(
            reading.latitude,
            reading.longitude,
            reading.accuracy
          );
        }

        const result = updateGPSKalman(
          kalmanFilterRef.current,
          reading.latitude,
          reading.longitude,
          reading.accuracy,
          reading.timestamp
        );

        kalmanFilterRef.current = result.filter;
        processedLat = result.latitude;
        processedLng = result.longitude;
        processedAccuracy = result.estimatedAccuracy;

        setFilteredReading({
          latitude: processedLat,
          longitude: processedLng,
          accuracy: processedAccuracy,
          timestamp: reading.timestamp,
        });
      }

      // Add to averager if enabled
      if (opts.enableAveraging) {
        averagerRef.current = addSample(
          averagerRef.current,
          processedLat,
          processedLng,
          processedAccuracy,
          reading.timestamp
        );

        const avgPos = computeAveragePosition(averagerRef.current);
        setAveragedPosition(avgPos);
        setSampleCount(getSampleCount(averagerRef.current));

        const best = getBestAccuracy(averagerRef.current);
        setBestAccuracy(best);

        // Check if we've collected enough samples with sufficient accuracy
        if (hasEnoughSamples(averagerRef.current) && avgPos) {
          const meetsThreshold = avgPos.accuracy <= opts.minAccuracyThreshold;
          if (meetsThreshold && !isAcquiredRef.current) {
            isAcquiredRef.current = true;
            setStatus('acquired');
            // Stop watching once acquired
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          }
        }
      } else {
        // Without averaging, check accuracy directly
        setSampleCount(1);
        if (processedAccuracy <= opts.minAccuracyThreshold && !isAcquiredRef.current) {
          isAcquiredRef.current = true;
          setStatus('acquired');
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        }
      }
    },
    [opts.enableKalmanFilter, opts.enableAveraging, opts.minAccuracyThreshold]
  );

  // Handle GPS error
  const handleError = useCallback((positionError: GeolocationPositionError) => {
    const errorType = getErrorType(positionError.code);
    setError({
      type: errorType,
      message: getErrorMessage(errorType),
      code: positionError.code,
    });
    setStatus('error');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Start GPS acquisition
  const startAcquisition = useCallback(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError({
        type: 'not_supported',
        message: getErrorMessage('not_supported'),
      });
      setStatus('error');
      return;
    }

    // Reset state
    setStatus('acquiring');
    setError(null);
    setCurrentReading(null);
    setFilteredReading(null);
    setAveragedPosition(null);
    setSampleCount(0);
    setCurrentAccuracy(null);
    setBestAccuracy(null);
    kalmanFilterRef.current = null;
    averagerRef.current = createLocationAverager(opts.sampleCount);
    isAcquiredRef.current = false;

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      timeout: opts.timeout,
      maximumAge: opts.maximumAge,
    });
  }, [handlePosition, handleError, opts.sampleCount, opts.timeout, opts.maximumAge]);

  // Stop GPS acquisition
  const stopAcquisition = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Accept current location (returns the best available position)
  const acceptCurrentLocation = useCallback(() => {
    if (opts.enableAveraging && averagedPosition) {
      return averagedPosition;
    }
    if (opts.enableKalmanFilter && filteredReading) {
      return filteredReading;
    }
    return currentReading;
  }, [opts.enableAveraging, opts.enableKalmanFilter, averagedPosition, filteredReading, currentReading]);

  // Reset to initial state
  const reset = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
    setError(null);
    setCurrentReading(null);
    setFilteredReading(null);
    setAveragedPosition(null);
    setSampleCount(0);
    setCurrentAccuracy(null);
    setBestAccuracy(null);
    kalmanFilterRef.current = null;
    averagerRef.current = createLocationAverager(opts.sampleCount);
    isAcquiredRef.current = false;
  }, [opts.sampleCount]);

  // Compute derived values
  const accuracyMet = averagedPosition
    ? averagedPosition.accuracy <= opts.minAccuracyThreshold
    : currentAccuracy !== null && currentAccuracy <= opts.minAccuracyThreshold;

  return {
    status,
    error,
    currentReading,
    filteredReading,
    averagedPosition,
    sampleCount,
    targetSampleCount: opts.sampleCount,
    currentAccuracy,
    bestAccuracy,
    accuracyMet,
    startAcquisition,
    stopAcquisition,
    acceptCurrentLocation,
    reset,
  };
}

export default useHighAccuracyLocation;
