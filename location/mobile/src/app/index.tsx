/**
 * Main Screen - Location acquisition and Plus Code generation
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useHighAccuracyLocation } from '@/hooks/useHighAccuracyLocation';
import { usePlusCode } from '@/hooks/usePlusCode';
import { LocationCard, PlusCodeDisplay } from '@/components';
import { useSettingsStore, useLocationStore } from '@/stores';

export default function MainScreen() {
  // Get settings
  const {
    minAccuracyThreshold,
    sampleCount,
    enableKalmanFilter,
    enableAveraging,
    plusCodePrecision,
    autoCopyPlusCode,
    enableHaptics,
  } = useSettingsStore();

  // GPS hook with settings
  const gps = useHighAccuracyLocation({
    minAccuracyThreshold,
    sampleCount,
    enableKalmanFilter,
    enableAveraging,
  });

  // Location store for saving
  const { saveLocation } = useLocationStore();

  // Get the best available position
  const position = gps.averagedPosition || gps.filteredReading || gps.currentReading;

  // Plus Code generation
  const { plusCode, formattedCode, shortCode, areaSizeDescription } = usePlusCode(
    position?.latitude ?? null,
    position?.longitude ?? null,
    { precision: plusCodePrecision }
  );

  // Haptic feedback on acquisition complete
  useEffect(() => {
    if (gps.status === 'acquired' && enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [gps.status, enableHaptics]);

  // Handle start/stop button
  const handleToggleAcquisition = useCallback(async () => {
    if (gps.status === 'acquiring') {
      gps.stopAcquisition();
    } else {
      gps.reset();
      await gps.startAcquisition();
    }
  }, [gps]);

  // Handle save location
  const handleSaveLocation = useCallback(() => {
    if (!position || !formattedCode) {
      Alert.alert('Error', 'No location to save');
      return;
    }

    const saved = saveLocation({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy ?? 0,
      plusCode: formattedCode,
      shortCode: shortCode ?? undefined,
      isFavorite: false,
    });

    if (enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert('Saved!', `Location saved with Plus Code: ${saved.plusCode}`);
  }, [position, formattedCode, shortCode, saveLocation, enableHaptics]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Plus Code Display */}
      <View style={styles.plusCodeSection}>
        <PlusCodeDisplay
          fullCode={formattedCode}
          shortCode={shortCode}
          areaSizeDescription={areaSizeDescription}
        />
      </View>

      {/* Location Card */}
      <LocationCard
        latitude={position?.latitude ?? null}
        longitude={position?.longitude ?? null}
        accuracy={position?.accuracy ?? null}
        sampleCount={gps.sampleCount}
        targetSampleCount={gps.targetSampleCount}
        status={gps.status}
      />

      {/* Error Message */}
      {gps.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{gps.error.message}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            gps.status === 'acquiring' && styles.stopButton,
            gps.status === 'acquired' && styles.successButton,
          ]}
          onPress={handleToggleAcquisition}
          disabled={gps.status === 'acquired'}
        >
          <Text style={styles.mainButtonText}>
            {gps.status === 'idle' || gps.status === 'error'
              ? 'Get Location'
              : gps.status === 'acquiring'
              ? 'Stop'
              : 'Location Acquired'}
          </Text>
        </TouchableOpacity>

        {gps.status === 'acquired' && (
          <View style={styles.secondaryButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveLocation}>
              <Text style={styles.secondaryButtonText}>Save Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                gps.reset();
              }}
            >
              <Text style={styles.secondaryButtonText}>New Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Navigation Links */}
      <View style={styles.navContainer}>
        <Link href="/history" asChild>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navButtonText}>View History</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/settings" asChild>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navButtonText}>Settings</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Plus Codes are generated offline using the Open Location Code algorithm.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingVertical: 16,
  },
  plusCodeSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  mainButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  successButton: {
    backgroundColor: '#16A34A',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  navContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});
