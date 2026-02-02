'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generatePlusCodeGrid, gridToGeoJSON } from '@/lib/plusCodeGrid';

export interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  color?: string;
  title?: string;
  description?: string;
}

interface MapLibreViewProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
  markers?: MapMarker[];
  showPlusCodeGrid?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  className?: string;
}

const GRID_SOURCE_ID = 'pluscode-grid';
const GRID_LAYER_ID = 'pluscode-grid-fill';
const GRID_LINE_LAYER_ID = 'pluscode-grid-line';
const GRID_LABEL_LAYER_ID = 'pluscode-grid-label';

export default function MapLibreView({
  center,
  zoom,
  markers = [],
  showPlusCodeGrid = false,
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  className = '',
}: MapLibreViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Update Plus Code grid
  const updateGrid = useCallback(() => {
    if (!map.current || !showPlusCodeGrid) return;

    const bounds = map.current.getBounds();
    const currentZoom = map.current.getZoom();

    const cells = generatePlusCodeGrid(
      {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      currentZoom
    );

    const geojson = gridToGeoJSON(cells);
    const source = map.current.getSource(GRID_SOURCE_ID) as maplibregl.GeoJSONSource;

    if (source) {
      source.setData(geojson);
    }
  }, [showPlusCodeGrid]);

  // Initialize map
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
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center,
      zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add Plus Code grid source and layers
    map.current.on('load', () => {
      if (!map.current) return;

      // Add grid source
      map.current.addSource(GRID_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Add fill layer
      map.current.addLayer({
        id: GRID_LAYER_ID,
        type: 'fill',
        source: GRID_SOURCE_ID,
        paint: {
          'fill-color': '#3B82F6',
          'fill-opacity': 0.1,
        },
      });

      // Add line layer
      map.current.addLayer({
        id: GRID_LINE_LAYER_ID,
        type: 'line',
        source: GRID_SOURCE_ID,
        paint: {
          'line-color': '#3B82F6',
          'line-width': 1,
          'line-opacity': 0.5,
        },
      });

      // Add label layer
      map.current.addLayer({
        id: GRID_LABEL_LAYER_ID,
        type: 'symbol',
        source: GRID_SOURCE_ID,
        layout: {
          'text-field': ['get', 'shortCode'],
          'text-size': 10,
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#1E40AF',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      updateGrid();
    });

    // Handle map move for grid updates
    map.current.on('moveend', () => {
      updateGrid();
      if (onBoundsChange && map.current) {
        const bounds = map.current.getBounds();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    });

    // Handle click
    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    });

    // Click on grid cell
    map.current.on('click', GRID_LAYER_ID, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const code = feature.properties?.code;
        if (code) {
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<div class="p-2"><strong>Plus Code:</strong><br/><span class="font-mono">${code}</span></div>`)
            .addTo(map.current!);
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update grid visibility
  useEffect(() => {
    if (!map.current) return;

    const visibility = showPlusCodeGrid ? 'visible' : 'none';

    try {
      map.current.setLayoutProperty(GRID_LAYER_ID, 'visibility', visibility);
      map.current.setLayoutProperty(GRID_LINE_LAYER_ID, 'visibility', visibility);
      map.current.setLayoutProperty(GRID_LABEL_LAYER_ID, 'visibility', visibility);
    } catch {
      // Layers may not be ready yet
    }

    if (showPlusCodeGrid) {
      updateGrid();
    }
  }, [showPlusCodeGrid, updateGrid]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markerRefs.current.forEach((marker, id) => {
      if (!markers.find((m) => m.id === id)) {
        marker.remove();
        markerRefs.current.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((markerData) => {
      let marker = markerRefs.current.get(markerData.id);

      if (!marker) {
        marker = new maplibregl.Marker({
          color: markerData.color || '#1E40AF',
        });
        markerRefs.current.set(markerData.id, marker);

        if (onMarkerClick) {
          marker.getElement().addEventListener('click', () => {
            onMarkerClick(markerData);
          });
        }
      }

      marker.setLngLat([markerData.lng, markerData.lat]);

      if (markerData.title || markerData.description) {
        marker.setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              ${markerData.title ? `<strong>${markerData.title}</strong>` : ''}
              ${markerData.description ? `<p class="text-sm text-gray-600">${markerData.description}</p>` : ''}
            </div>
          `)
        );
      }

      marker.addTo(map.current!);
    });
  }, [markers, onMarkerClick]);

  // Update center and zoom
  useEffect(() => {
    if (!map.current) return;
    map.current.setCenter(center);
    map.current.setZoom(zoom);
  }, [center, zoom]);

  return <div ref={mapContainer} className={`w-full h-full ${className}`} />;
}
