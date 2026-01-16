'use client';

import { useMapContext } from '@/contexts/MapContext';
import MapLibreView, { MapMarker } from './MapLibreView';
import GoogleMapView from './GoogleMapView';
import MapControls from './MapControls';

interface UnifiedMapProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
  showControls?: boolean;
}

export default function UnifiedMap({
  center,
  zoom,
  markers = [],
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  className = '',
  showControls = true,
}: UnifiedMapProps) {
  const { provider, showPlusCodeGrid, isGoogleMapsLoaded } = useMapContext();

  // Use Google Maps only if selected AND loaded
  const useGoogle = provider === 'google' && isGoogleMapsLoaded;

  return (
    <div className={`relative ${className}`}>
      {useGoogle ? (
        <GoogleMapView
          center={center}
          zoom={zoom}
          markers={markers}
          showPlusCodeGrid={showPlusCodeGrid}
          onMarkerClick={onMarkerClick}
          onMapClick={onMapClick}
          onBoundsChange={onBoundsChange}
          className="w-full h-full"
        />
      ) : (
        <MapLibreView
          center={center}
          zoom={zoom}
          markers={markers}
          showPlusCodeGrid={showPlusCodeGrid}
          onMarkerClick={onMarkerClick}
          onMapClick={onMapClick}
          onBoundsChange={onBoundsChange}
          className="w-full h-full"
        />
      )}

      {showControls && (
        <div className="absolute top-4 left-4 z-10">
          <MapControls />
        </div>
      )}
    </div>
  );
}

// Re-export types
export type { MapMarker };
