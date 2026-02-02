/**
 * High Accuracy Location Hook for Expo/React Native
 *
 * Uses expo-location with BestForNavigation accuracy
 * Combined with Kalman filter and multi-sample averaging.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import type {
  GPSReading,
  FilteredPosition,
  AveragedPosition,
  GPSStatus,
  GPSError,
  HighAccuracyLocationOptions,
  HighAccuracyLocationResult,
} from '@/lib/gps/types';
import {
  createGPSKalmanFilter,
  updateGPSKalman,
  type GPSKalmanFilter,
} from '@/lib/gps/kalmanFilter';
import {
  createLocationAverager,
  addSample,
  computeAveragePosition,
  getBestAccuracy,
  hasEnoughSamples,
  getSampleCount,
  type LocationAverager,
} from '@/lib/gps/locationAverager';

const DEFAULT_OPTIONS: Required<HighAccuracyLocationOptions> = {
  minAccuracyThreshold: 25,
  sampleCount: 5,
  enableKalmanFilter: true,
  enableAveraging: true,
  updateInterval: 1000,
};

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
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const kalmanFilterRef = useRef<GPSKalmanFilter | null>(null);
  const averagerRef = useRef<LocationAverager>(createLocationAverager(opts.sampleCount));
  const isAcquiredRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  // Handle incoming location update
  const handleLocation = useCallback(
    (location: Location.LocationObject) => {
      const reading: GPSReading = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        altitudeAccuracy: location.coords.altitudeAccuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
      };

      setCurrentReading(reading);
      setCurrentAccuracy(reading.accuracy);

      // Skip if accuracy is null
      if (reading.accuracy === null) {
        return;
      }

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
            if (subscriptionRef.current) {
              subscriptionRef.current.remove();
              subscriptionRef.current = null;
            }
          }
        }
      } else {
        // Without averaging, check accuracy directly
        setSampleCount(1);
        if (processedAccuracy <= opts.minAccuracyThreshold && !isAcquiredRef.current) {
          isAcquiredRef.current = true;
          setStatus('acquired');
          if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
          }
        }
      }
    },
    [opts.enableKalmanFilter, opts.enableAveraging, opts.minAccuracyThreshold]
  );

  // Start GPS acquisition
  const startAcquisition = useCallback(async () => {
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

    try {
      // Request permissions
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setError({
          type: 'permission_denied',
          message: 'Location permission was denied. Please enable location access in settings.',
        });
        setStatus('error');
        return;
      }

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setError({
          type: 'services_disabled',
          message: 'Location services are disabled. Please enable GPS in your device settings.',
        });
        setStatus('error');
        return;
      }

      // Start watching position with high accuracy
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: opts.updateInterval,
          distanceInterval: 0, // Update based on time, not distance
        },
        handleLocation
      );
    } catch (err) {
      console.error('Location error:', err);
      setError({
        type: 'unknown',
        message: 'Failed to start location tracking. Please try again.',
      });
      setStatus('error');
    }
  }, [handleLocation, opts.sampleCount, opts.updateInterval]);

  // Stop GPS acquisition
  const stopAcquisition = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Accept current location
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
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
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
