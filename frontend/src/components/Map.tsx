'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  SIERRA_LEONE_CENTER,
  SIERRA_LEONE_BOUNDS,
} from '@/lib/sierra-leone-boundary';

interface MapProps {
  onMapClick?: (lat: number, lng: number) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  restrictToSierraLeone?: boolean;
  showBoundary?: boolean;
}

export default function Map({
  onMapClick,
  initialCenter = SIERRA_LEONE_CENTER,
  initialZoom = 8,
  restrictToSierraLeone = true,
  showBoundary = true,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      center: initialCenter,
      zoom: initialZoom,
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

          // Fit map to Sierra Leone bounds from GADM
          const bbox = country.features[0].bbox || [-13.5, 6.9, -10.2, 10.0];
          map.current.fitBounds(
            [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
            { padding: 0, duration: 1500, maxZoom: 8.5 }
          );
        } catch (err) {
          console.error('Failed to load GADM boundary:', err);
          // Fallback to simple bounds
          map.current.fitBounds(SIERRA_LEONE_BOUNDS, {
            padding: 0,
            duration: 1500,
            maxZoom: 8.5,
          });
        }
      } else {
        // No boundary, just fit to bounds
        map.current.fitBounds(SIERRA_LEONE_BOUNDS, {
          padding: 0,
          duration: 1500,
          maxZoom: 8.5,
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
  }, [initialCenter, initialZoom, onMapClick, restrictToSierraLeone, showBoundary]);

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
            <p className="text-slate-500 animate-pulse">Loading Sierra Leone...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function useMapInstance() {
  return null;
}
