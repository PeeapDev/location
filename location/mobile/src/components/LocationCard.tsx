/**
 * LocationCard - Displays current location details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AccuracyIndicator } from './AccuracyIndicator';
import { useSettingsStore } from '@/stores';

interface LocationCardProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  sampleCount: number;
  targetSampleCount: number;
  status: 'idle' | 'acquiring' | 'acquired' | 'error';
}

export function LocationCard({
  latitude,
  longitude,
  accuracy,
  sampleCount,
  targetSampleCount,
  status,
}: LocationCardProps) {
  const showCoordinates = useSettingsStore((state) => state.showCoordinates);
  const showAccuracy = useSettingsStore((state) => state.showAccuracy);
  const minAccuracyThreshold = useSettingsStore((state) => state.minAccuracyThreshold);

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  status === 'acquiring'
                    ? '#3B82F6'
                    : status === 'acquired'
                    ? '#16A34A'
                    : status === 'error'
                    ? '#DC2626'
                    : '#9CA3AF',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {status === 'idle'
              ? 'Ready'
              : status === 'acquiring'
              ? 'Acquiring GPS...'
              : status === 'acquired'
              ? 'Location Set'
              : 'Error'}
          </Text>
        </View>

        {status === 'acquiring' && (
          <Text style={styles.sampleCount}>
            {sampleCount}/{targetSampleCount} samples
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      {status === 'acquiring' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(sampleCount / targetSampleCount) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Coordinates */}
      {showCoordinates && latitude !== null && longitude !== null && (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.coordinatesLabel}>Coordinates</Text>
          <Text style={styles.coordinatesText}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Accuracy */}
      {showAccuracy && (
        <View style={styles.accuracyContainer}>
          <Text style={styles.accuracyLabel}>Accuracy</Text>
          <AccuracyIndicator accuracy={accuracy} threshold={minAccuracyThreshold} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sampleCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  coordinatesText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#374151',
  },
  accuracyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default LocationCard;
