'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  SIERRA_LEONE_CENTER,
  SIERRA_LEONE_BOUNDS,
} from '@/lib/sierra-leone-boundary';
import {
  FREETOWN_CENTER,
  FREETOWN_BOUNDS,
  FREETOWN_NEIGHBORHOODS,
  FREETOWN_LANDMARKS,
} from '@/lib/freetown-boundary';

interface MapProps {
  onMapClick?: (lat: number, lng: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  restrictToSierraLeone?: boolean;
  showBoundary?: boolean;
  focusFreetown?: boolean;
  showFreetownNeighborhoods?: boolean;
  showFreetownLandmarks?: boolean;
}

export default function Map({
  onMapClick,
  initialCenter = SIERRA_LEONE_CENTER,
  initialZoom = 8,
  restrictToSierraLeone = true,
  showBoundary = true,
  focusFreetown = false,
  showFreetownNeighborhoods = false,
  showFreetownLandmarks = false,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const neighborhoodMarkers = useRef<maplibregl.Marker[]>([]);
  const landmarkMarkers = useRef<maplibregl.Marker[]>([]);

  // Determine actual center and zoom based on focusFreetown
  const effectiveCenter = focusFreetown ? FREETOWN_CENTER : initialCenter;
  const effectiveZoom = focusFreetown ? 12 : initialZoom;

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: effectiveCenter,
      zoom: effectiveZoom,
      maxBounds: restrictToSierraLeone ? SIERRA_LEONE_BOUNDS : undefined,
      minZoom: restrictToSierraLeone ? 6 : undefined,
      maxZoom: 18,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    map.current.on('load', async () => {
      if (!map.current) return;

      if (showBoundary) {
        try {
          // Load GADM country boundary
          const countryRes = await fetch('/geodata/gadm41_SLE_0.json');
          const country = await countryRes.json();

          // Create world mask using GADM country boundary
          const countryCoords = country.features[0].geometry.coordinates;
          const worldMaskWithGADM: GeoJSON.Feature<GeoJSON.Polygon> = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                // Outer ring (world bounds)
                [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
                // Inner ring (Sierra Leone from GADM - reversed to cut out)
                ...(country.features[0].geometry.type === 'MultiPolygon'
                  ? countryCoords[0].map((ring: number[][]) => ring.slice().reverse())
                  : [countryCoords[0].slice().reverse()])
              ],
            },
          };

          // Add mask source
          map.current.addSource('world-mask', {
            type: 'geojson',
            data: worldMaskWithGADM,
          });

          // Add Sierra Leone boundary source
          map.current.addSource('sierra-leone', {
            type: 'geojson',
            data: country,
          });

          // Mask layer - completely hides everything outside Sierra Leone
          map.current.addLayer({
            id: 'outside-mask',
            type: 'fill',
            source: 'world-mask',
            paint: {
              'fill-color': '#f8fafc',
              'fill-opacity': 1,
            },
          });

          // Subtle border around Sierra Leone
          map.current.addLayer({
            id: 'sierra-leone-border',
            type: 'line',
            source: 'sierra-leone',
            paint: {
              'line-color': '#64748b',
              'line-width': 2,
              'line-opacity': 0.6,
            },
          });

          // Fit map to appropriate bounds
          if (focusFreetown) {
            // Focus on Freetown
            map.current.fitBounds(FREETOWN_BOUNDS, {
              padding: 20,
              duration: 1500,
              maxZoom: 13,
            });
          } else {
            // Fit map to Sierra Leone bounds from GADM
            const bbox = country.features[0].bbox || [-13.5, 6.9, -10.2, 10.0];
            map.current.fitBounds(
              [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
              { padding: 0, duration: 1500, maxZoom: 8.5 }
            );
          }
        } catch (err) {
          console.error('Failed to load GADM boundary:', err);
          // Fallback to simple bounds
          const fallbackBounds = focusFreetown ? FREETOWN_BOUNDS : SIERRA_LEONE_BOUNDS;
          const fallbackZoom = focusFreetown ? 13 : 8.5;
          map.current.fitBounds(fallbackBounds, {
            padding: focusFreetown ? 20 : 0,
            duration: 1500,
            maxZoom: fallbackZoom,
          });
        }
      } else {
        // No boundary, just fit to bounds
        const bounds = focusFreetown ? FREETOWN_BOUNDS : SIERRA_LEONE_BOUNDS;
        const maxZoom = focusFreetown ? 13 : 8.5;
        map.current.fitBounds(bounds, {
          padding: focusFreetown ? 20 : 0,
          duration: 1500,
          maxZoom,
        });
      }

      setIsLoaded(true);
    });

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [effectiveCenter, effectiveZoom, onMapClick, restrictToSierraLeone, showBoundary, focusFreetown]);

  // Toggle neighborhood markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing neighborhood markers
    neighborhoodMarkers.current.forEach(m => m.remove());
    neighborhoodMarkers.current = [];

    if (showFreetownNeighborhoods) {
      FREETOWN_NEIGHBORHOODS.forEach(neighborhood => {
        const el = document.createElement('div');
        el.style.cssText = `
          background: #6366f1;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
        `;
        el.textContent = neighborhood.name;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(neighborhood.center)
          .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
            <div style="padding: 8px;">
              <div style="font-weight: 600;">${neighborhood.name}</div>
              <div style="font-size: 12px; color: #666; text-transform: capitalize;">${neighborhood.type}</div>
            </div>
          `))
          .addTo(map.current!);
        neighborhoodMarkers.current.push(marker);
      });
    }
  }, [showFreetownNeighborhoods, isLoaded]);

  // Toggle landmark markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing landmark markers
    landmarkMarkers.current.forEach(m => m.remove());
    landmarkMarkers.current = [];

    if (showFreetownLandmarks) {
      FREETOWN_LANDMARKS.forEach(landmark => {
        const marker = new maplibregl.Marker({ color: '#ef4444', scale: 0.7 })
          .setLngLat(landmark.center)
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <div style="font-weight: 600;">${landmark.name}</div>
              <div style="font-size: 12px; color: #666; text-transform: capitalize;">${landmark.type}</div>
            </div>
          `))
          .addTo(map.current!);
        landmarkMarkers.current.push(marker);
      });
    }
  }, [showFreetownLandmarks, isLoaded]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      {/* Shadow layer (CSS-based) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.2) 100%)',
          zIndex: 1,
        }}
      />

      {/* Map container */}
      <div
        ref={mapContainer}
        className={`w-full h-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Loading animation */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-xeeno-primary rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 animate-pulse">
              Loading {focusFreetown ? 'Freetown' : 'Sierra Leone'}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function useMapInstance() {
  return null;
}
