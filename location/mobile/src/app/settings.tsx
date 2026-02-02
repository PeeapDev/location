/**
 * Settings Screen - App preferences and configuration
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSettingsStore, type PlusCodePrecision } from '@/stores';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const PRECISION_OPTIONS: { value: PlusCodePrecision; label: string; description: string }[] = [
  { value: 10, label: '10', description: '~14m x 14m' },
  { value: 11, label: '11', description: '~3m x 3m' },
  { value: 12, label: '12', description: '~0.6m x 0.6m' },
];

const ACCURACY_OPTIONS = [10, 15, 25, 50];
const SAMPLE_OPTIONS = [3, 5, 7, 10];

export default function SettingsScreen() {
  const settings = useSettingsStore();

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to their defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: settings.resetToDefaults },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* GPS Settings */}
      <Section title="GPS Settings">
        <SettingRow
          label="Accuracy Threshold"
          description="Minimum GPS accuracy required (meters)"
        >
          <View style={styles.buttonGroup}>
            {ACCURACY_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.optionButton,
                  settings.minAccuracyThreshold === value && styles.optionButtonActive,
                ]}
                onPress={() => settings.setMinAccuracyThreshold(value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    settings.minAccuracyThreshold === value && styles.optionButtonTextActive,
                  ]}
                >
                  {value}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <SettingRow label="Sample Count" description="Number of GPS readings to average">
          <View style={styles.buttonGroup}>
            {SAMPLE_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.optionButton,
                  settings.sampleCount === value && styles.optionButtonActive,
                ]}
                onPress={() => settings.setSampleCount(value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    settings.sampleCount === value && styles.optionButtonTextActive,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <SettingRow label="Kalman Filter" description="Smooth GPS jitter">
          <Switch
            value={settings.enableKalmanFilter}
            onValueChange={settings.setEnableKalmanFilter}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.enableKalmanFilter ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>

        <SettingRow label="Multi-Sample Averaging" description="Average multiple readings">
          <Switch
            value={settings.enableAveraging}
            onValueChange={settings.setEnableAveraging}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.enableAveraging ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>
      </Section>

      {/* Plus Code Settings */}
      <Section title="Plus Code Settings">
        <SettingRow label="Precision" description="Code length and area size">
          <View style={styles.buttonGroup}>
            {PRECISION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  settings.plusCodePrecision === option.value && styles.optionButtonActive,
                ]}
                onPress={() => settings.setPlusCodePrecision(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    settings.plusCodePrecision === option.value && styles.optionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <View style={styles.precisionInfo}>
          <Text style={styles.precisionInfoText}>
            Current: {PRECISION_OPTIONS.find((o) => o.value === settings.plusCodePrecision)?.description}
          </Text>
        </View>

        <SettingRow label="Auto-Copy" description="Copy Plus Code when acquired">
          <Switch
            value={settings.autoCopyPlusCode}
            onValueChange={settings.setAutoCopyPlusCode}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.autoCopyPlusCode ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>
      </Section>

      {/* Display Settings */}
      <Section title="Display">
        <SettingRow label="Show Coordinates" description="Display lat/lng on main screen">
          <Switch
            value={settings.showCoordinates}
            onValueChange={settings.setShowCoordinates}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.showCoordinates ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>

        <SettingRow label="Show Accuracy" description="Display GPS accuracy indicator">
          <Switch
            value={settings.showAccuracy}
            onValueChange={settings.setShowAccuracy}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.showAccuracy ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>

        <SettingRow label="Haptic Feedback" description="Vibrate on actions">
          <Switch
            value={settings.enableHaptics}
            onValueChange={settings.setEnableHaptics}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.enableHaptics ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>
      </Section>

      {/* Sync Settings */}
      <Section title="Backend Sync (Optional)">
        <SettingRow label="Enable Sync" description="Sync locations to Xeeno Map server">
          <Switch
            value={settings.enableSync}
            onValueChange={settings.setEnableSync}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={settings.enableSync ? '#1E40AF' : '#9CA3AF'}
          />
        </SettingRow>

        {settings.enableSync && (
          <View style={styles.apiUrlContainer}>
            <Text style={styles.apiUrlLabel}>API URL</Text>
            <TextInput
              style={styles.apiUrlInput}
              value={settings.apiUrl ?? ''}
              onChangeText={(text) => settings.setApiUrl(text || null)}
              placeholder="https://api.xeenomap.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        )}
      </Section>

      {/* Reset Button */}
      <View style={styles.resetContainer}>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetDefaults}>
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Xeeno Map Mobile v1.0.0</Text>
        <Text style={styles.versionSubtext}>Plus Codes powered by Open Location Code</Text>
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
    paddingBottom: 32,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  settingControl: {
    flexShrink: 0,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  optionButtonTextActive: {
    color: '#FFFFFF',
  },
  precisionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  precisionInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  apiUrlContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  apiUrlLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  apiUrlInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
  },
  resetContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  versionContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  versionSubtext: {
    fontSize: 10,
    color: '#D1D5DB',
    marginTop: 4,
  },
});
