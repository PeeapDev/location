'use client';

import { useEffect, useRef, useCallback } from 'react';
import { generatePlusCodeGrid } from '@/lib/plusCodeGrid';

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  color?: string;
  title?: string;
  description?: string;
}

interface GoogleMapViewProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
  markers?: MapMarker[];
  showPlusCodeGrid?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function GoogleMapView({
  center,
  zoom,
  markers = [],
  showPlusCodeGrid = false,
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  className = '',
}: GoogleMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const gridRectangles = useRef<google.maps.Rectangle[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);

  // Clear grid rectangles
  const clearGrid = useCallback(() => {
    gridRectangles.current.forEach((rect) => rect.setMap(null));
    gridRectangles.current = [];
  }, []);

  // Update Plus Code grid
  const updateGrid = useCallback(() => {
    if (!map.current || !showPlusCodeGrid) {
      clearGrid();
      return;
    }

    const bounds = map.current.getBounds();
    if (!bounds) return;

    const currentZoom = map.current.getZoom() || zoom;

    const cells = generatePlusCodeGrid(
      {
        north: bounds.getNorthEast().lat(),
        south: bounds.getSouthWest().lat(),
        east: bounds.getNorthEast().lng(),
        west: bounds.getSouthWest().lng(),
      },
      currentZoom
    );

    // Clear existing rectangles
    clearGrid();

    // Create new rectangles
    cells.forEach((cell) => {
      const rectangle = new google.maps.Rectangle({
        bounds: {
          north: cell.bounds.north,
          south: cell.bounds.south,
          east: cell.bounds.east,
          west: cell.bounds.west,
        },
        map: map.current,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        clickable: true,
      });

      // Add click listener
      rectangle.addListener('click', () => {
        if (!infoWindow.current) {
          infoWindow.current = new google.maps.InfoWindow();
        }
        infoWindow.current.setContent(`
          <div style="padding: 8px;">
            <strong>Plus Code:</strong><br/>
            <span style="font-family: monospace;">${cell.code}</span>
          </div>
        `);
        infoWindow.current.setPosition({
          lat: cell.center.lat,
          lng: cell.center.lng,
        });
        infoWindow.current.open(map.current);
      });

      gridRectangles.current.push(rectangle);
    });
  }, [showPlusCodeGrid, zoom, clearGrid]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !window.google?.maps) return;

    map.current = new google.maps.Map(mapContainer.current, {
      center: { lat: center[1], lng: center[0] },
      zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Handle bounds change
    map.current.addListener('idle', () => {
      updateGrid();
      if (onBoundsChange && map.current) {
        const bounds = map.current.getBounds();
        if (bounds) {
          onBoundsChange({
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng(),
          });
        }
      }
    });

    // Handle click
    map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (onMapClick && e.latLng) {
        onMapClick({ lng: e.latLng.lng(), lat: e.latLng.lat() });
      }
    });

    return () => {
      clearGrid();
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current.clear();
    };
  }, []);

  // Update grid visibility
  useEffect(() => {
    if (showPlusCodeGrid) {
      updateGrid();
    } else {
      clearGrid();
    }
  }, [showPlusCodeGrid, updateGrid, clearGrid]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markerRefs.current.forEach((marker, id) => {
      if (!markers.find((m) => m.id === id)) {
        marker.setMap(null);
        markerRefs.current.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      let marker = markerRefs.current.get(markerData.id);

      if (!marker) {
        marker = new google.maps.Marker({
          map: map.current,
        });
        markerRefs.current.set(markerData.id, marker);

        if (onMarkerClick) {
          marker.addListener('click', () => {
            onMarkerClick(markerData);
          });
        }

        if (markerData.title || markerData.description) {
          const infoWindowContent = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                ${markerData.title ? `<strong>${markerData.title}</strong>` : ''}
                ${markerData.description ? `<p style="color: #666; font-size: 14px;">${markerData.description}</p>` : ''}
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindowContent.open(map.current, marker);
          });
        }
      }

      marker.setPosition({ lat: markerData.lat, lng: markerData.lng });

      // Update icon color if specified
      if (markerData.color) {
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: markerData.color,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff',
        });
      }
    });
  }, [markers, onMarkerClick]);

  // Update center and zoom
  useEffect(() => {
    if (!map.current) return;
    map.current.setCenter({ lat: center[1], lng: center[0] });
    map.current.setZoom(zoom);
  }, [center, zoom]);

  // Show fallback if Google Maps not loaded
  if (typeof window !== 'undefined' && !window.google?.maps) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-4">
          <p className="text-gray-600 mb-2">Google Maps is not available</p>
          <p className="text-sm text-gray-400">Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={`w-full h-full ${className}`} />;
}
