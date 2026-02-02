/**
 * Location Store - Zustand store for managing saved locations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedLocation {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  plusCode: string;
  shortCode?: string;
  name?: string;
  notes?: string;
  createdAt: number;
  isFavorite: boolean;
}

interface LocationState {
  /** List of saved locations */
  savedLocations: SavedLocation[];
  /** Current location being viewed/edited */
  currentLocation: SavedLocation | null;

  // Actions
  saveLocation: (location: Omit<SavedLocation, 'id' | 'createdAt'>) => SavedLocation;
  deleteLocation: (id: string) => void;
  updateLocation: (id: string, updates: Partial<SavedLocation>) => void;
  toggleFavorite: (id: string) => void;
  setCurrentLocation: (location: SavedLocation | null) => void;
  getLocationByPlusCode: (plusCode: string) => SavedLocation | undefined;
  clearAllLocations: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      savedLocations: [],
      currentLocation: null,

      saveLocation: (location) => {
        const newLocation: SavedLocation = {
          ...location,
          id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        };

        set((state) => ({
          savedLocations: [newLocation, ...state.savedLocations],
          currentLocation: newLocation,
        }));

        return newLocation;
      },

      deleteLocation: (id) => {
        set((state) => ({
          savedLocations: state.savedLocations.filter((loc) => loc.id !== id),
          currentLocation: state.currentLocation?.id === id ? null : state.currentLocation,
        }));
      },

      updateLocation: (id, updates) => {
        set((state) => ({
          savedLocations: state.savedLocations.map((loc) =>
            loc.id === id ? { ...loc, ...updates } : loc
          ),
          currentLocation:
            state.currentLocation?.id === id
              ? { ...state.currentLocation, ...updates }
              : state.currentLocation,
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          savedLocations: state.savedLocations.map((loc) =>
            loc.id === id ? { ...loc, isFavorite: !loc.isFavorite } : loc
          ),
        }));
      },

      setCurrentLocation: (location) => {
        set({ currentLocation: location });
      },

      getLocationByPlusCode: (plusCode) => {
        return get().savedLocations.find((loc) => loc.plusCode === plusCode);
      },

      clearAllLocations: () => {
        set({ savedLocations: [], currentLocation: null });
      },
    }),
    {
      name: 'xeeno-locations',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useLocationStore;
