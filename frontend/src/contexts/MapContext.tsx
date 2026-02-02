'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MapProvider = 'maplibre' | 'google';

interface MapContextType {
  provider: MapProvider;
  setProvider: (provider: MapProvider) => void;
  toggleProvider: () => void;
  showPlusCodeGrid: boolean;
  setShowPlusCodeGrid: (show: boolean) => void;
  isGoogleMapsLoaded: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

const STORAGE_KEY = 'xeeno-map-provider';
const GRID_STORAGE_KEY = 'xeeno-pluscode-grid';

interface MapProviderProps {
  children: ReactNode;
}

export function MapProviderContext({ children }: MapProviderProps) {
  const [provider, setProviderState] = useState<MapProvider>('maplibre');
  const [showPlusCodeGrid, setShowPlusCodeGridState] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEY) as MapProvider;
    if (savedProvider && (savedProvider === 'maplibre' || savedProvider === 'google')) {
      setProviderState(savedProvider);
    }

    const savedGrid = localStorage.getItem(GRID_STORAGE_KEY);
    if (savedGrid === 'true') {
      setShowPlusCodeGridState(true);
    }
  }, []);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        setIsGoogleMapsLoaded(true);
      }
    };

    checkGoogleMaps();

    // Also check after a delay in case it loads later
    const timer = setTimeout(checkGoogleMaps, 2000);
    return () => clearTimeout(timer);
  }, []);

  const setProvider = (newProvider: MapProvider) => {
    setProviderState(newProvider);
    localStorage.setItem(STORAGE_KEY, newProvider);
  };

  const toggleProvider = () => {
    const newProvider = provider === 'maplibre' ? 'google' : 'maplibre';
    setProvider(newProvider);
  };

  const setShowPlusCodeGrid = (show: boolean) => {
    setShowPlusCodeGridState(show);
    localStorage.setItem(GRID_STORAGE_KEY, String(show));
  };

  return (
    <MapContext.Provider
      value={{
        provider,
        setProvider,
        toggleProvider,
        showPlusCodeGrid,
        setShowPlusCodeGrid,
        isGoogleMapsLoaded,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProviderContext');
  }
  return context;
}
