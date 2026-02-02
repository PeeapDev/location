/**
 * Settings Store - Zustand store for app preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlusCodePrecision = 10 | 11 | 12;
export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  // GPS Settings
  /** Minimum accuracy threshold in meters */
  minAccuracyThreshold: number;
  /** Number of GPS samples for averaging */
  sampleCount: number;
  /** Enable Kalman filter */
  enableKalmanFilter: boolean;
  /** Enable multi-sample averaging */
  enableAveraging: boolean;

  // Plus Code Settings
  /** Default Plus Code precision */
  plusCodePrecision: PlusCodePrecision;
  /** Auto-copy Plus Code to clipboard */
  autoCopyPlusCode: boolean;
  /** Enable haptic feedback */
  enableHaptics: boolean;

  // API Settings
  /** Backend API URL (optional, for syncing) */
  apiUrl: string | null;
  /** Enable auto-sync with backend */
  enableSync: boolean;

  // Display Settings
  /** Theme mode */
  themeMode: ThemeMode;
  /** Show coordinates on main screen */
  showCoordinates: boolean;
  /** Show accuracy on main screen */
  showAccuracy: boolean;

  // Actions
  setMinAccuracyThreshold: (threshold: number) => void;
  setSampleCount: (count: number) => void;
  setEnableKalmanFilter: (enabled: boolean) => void;
  setEnableAveraging: (enabled: boolean) => void;
  setPlusCodePrecision: (precision: PlusCodePrecision) => void;
  setAutoCopyPlusCode: (enabled: boolean) => void;
  setEnableHaptics: (enabled: boolean) => void;
  setApiUrl: (url: string | null) => void;
  setEnableSync: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setShowCoordinates: (show: boolean) => void;
  setShowAccuracy: (show: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS = {
  minAccuracyThreshold: 25,
  sampleCount: 5,
  enableKalmanFilter: true,
  enableAveraging: true,
  plusCodePrecision: 11 as PlusCodePrecision,
  autoCopyPlusCode: false,
  enableHaptics: true,
  apiUrl: 'https://mayor-foreign-neo-rebel.trycloudflare.com',
  enableSync: true,
  themeMode: 'system' as ThemeMode,
  showCoordinates: true,
  showAccuracy: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setMinAccuracyThreshold: (threshold) => set({ minAccuracyThreshold: threshold }),
      setSampleCount: (count) => set({ sampleCount: count }),
      setEnableKalmanFilter: (enabled) => set({ enableKalmanFilter: enabled }),
      setEnableAveraging: (enabled) => set({ enableAveraging: enabled }),
      setPlusCodePrecision: (precision) => set({ plusCodePrecision: precision }),
      setAutoCopyPlusCode: (enabled) => set({ autoCopyPlusCode: enabled }),
      setEnableHaptics: (enabled) => set({ enableHaptics: enabled }),
      setApiUrl: (url) => set({ apiUrl: url }),
      setEnableSync: (enabled) => set({ enableSync: enabled }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setShowCoordinates: (show) => set({ showCoordinates: show }),
      setShowAccuracy: (show) => set({ showAccuracy: show }),

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'xeeno-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
