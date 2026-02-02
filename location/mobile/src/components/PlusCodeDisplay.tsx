/**
 * PlusCodeDisplay - Large Plus Code display with copy button
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/stores';

interface PlusCodeDisplayProps {
  fullCode: string | null;
  shortCode?: string | null;
  areaSizeDescription?: string | null;
  onCopy?: (code: string) => void;
}

export function PlusCodeDisplay({
  fullCode,
  shortCode,
  areaSizeDescription,
  onCopy,
}: PlusCodeDisplayProps) {
  const enableHaptics = useSettingsStore((state) => state.enableHaptics);

  const handleCopy = useCallback(async () => {
    if (!fullCode) return;

    try {
      await Clipboard.setStringAsync(fullCode);

      if (enableHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onCopy?.(fullCode);
      Alert.alert('Copied!', 'Plus Code copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  }, [fullCode, enableHaptics, onCopy]);

  if (!fullCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>Get location to generate Plus Code</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.codeContainer} onPress={handleCopy} activeOpacity={0.7}>
        <Text style={styles.codeText}>{fullCode}</Text>
        <View style={styles.copyBadge}>
          <Text style={styles.copyText}>TAP TO COPY</Text>
        </View>
      </TouchableOpacity>

      {shortCode && (
        <View style={styles.shortCodeContainer}>
          <Text style={styles.shortCodeLabel}>Short Code:</Text>
          <Text style={styles.shortCodeText}>{shortCode}</Text>
        </View>
      )}

      {areaSizeDescription && (
        <Text style={styles.areaSize}>Area: {areaSizeDescription}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  copyText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
  shortCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  shortCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  shortCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'monospace',
  },
  areaSize: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default PlusCodeDisplay;
