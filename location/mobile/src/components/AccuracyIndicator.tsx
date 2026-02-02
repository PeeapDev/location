/**
 * AccuracyIndicator - Visual indicator for GPS accuracy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AccuracyIndicatorProps {
  accuracy: number | null;
  threshold?: number;
  showLabel?: boolean;
}

function getAccuracyColor(accuracy: number, threshold: number): string {
  if (accuracy <= threshold * 0.4) return '#16A34A'; // Green - excellent
  if (accuracy <= threshold) return '#EAB308'; // Yellow - good
  if (accuracy <= threshold * 2) return '#F97316'; // Orange - fair
  return '#DC2626'; // Red - poor
}

function getAccuracyLabel(accuracy: number, threshold: number): string {
  if (accuracy <= threshold * 0.4) return 'Excellent';
  if (accuracy <= threshold) return 'Good';
  if (accuracy <= threshold * 2) return 'Fair';
  return 'Poor';
}

export function AccuracyIndicator({
  accuracy,
  threshold = 25,
  showLabel = true,
}: AccuracyIndicatorProps) {
  if (accuracy === null) {
    return (
      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: '#9CA3AF' }]} />
        {showLabel && <Text style={styles.text}>--</Text>}
      </View>
    );
  }

  const color = getAccuracyColor(accuracy, threshold);
  const label = getAccuracyLabel(accuracy, threshold);

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>
        ±{accuracy.toFixed(0)}m
        {showLabel && ` (${label})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AccuracyIndicator;
