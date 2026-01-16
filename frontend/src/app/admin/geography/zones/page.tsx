'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geographyApi } from '@/lib/api';
import {
  SIERRA_LEONE_CENTER,
  SIERRA_LEONE_BOUNDS,
} from '@/lib/sierra-leone-boundary';
import {
  FREETOWN_BOUNDS,
  FREETOWN_CENTER,
  FREETOWN_NEIGHBORHOODS,
  FREETOWN_LANDMARKS,
  WESTERN_AREA_URBAN_BOUNDS,
  getNearestNeighborhood,
} from '@/lib/freetown-boundary';
import {
  useNetworkStatus,
  useRegions,
  useDistricts,
  useZones,
} from '@/hooks/useOffline';
import { fetchGeodata } from '@/lib/offline-store';
import { OfflineIndicator } from '@/components/OfflineStatusBar';

// Icon components
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    city?: string;
  };
}

interface Region {
  id: number;
  code: string;
  name: string;
  short_code: string;
}

interface District {
  id: number;
  region_id: number;
  full_code: string;
  name: string;
  short_code: string;
  region_name: string;
}

interface Zone {
  id: number;
  district_id: number;
  zone_number: string;
  primary_code: string;
  name?: string | null;
  zone_type: string;
  ward?: string | null;
  is_locked: boolean;
  address_count: number;
  district_name?: string;
  geometry?: GeoJSON.Geometry | null;
}

export default function ZonesMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Network status
  const isOnline = useNetworkStatus();

  // Use offline-first hooks for data
  const { regions, loading: regionsLoading } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const { districts } = useDistricts(selectedRegion);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const { zones, createZone: createZoneOffline, deleteZone: deleteZoneOffline } = useZones(selectedDistrict);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const drawingMarkers = useRef<maplibregl.Marker[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchMarker = useRef<maplibregl.Marker | null>(null);

  // Edit mode state for drag-and-drop
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ lng: number; lat: number } | null>(null);
  const originalGeometry = useRef<GeoJSON.Polygon | null>(null);
  const currentGeojsonData = useRef<GeoJSON.FeatureCollection | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modal states
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Geometry | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    zone_type: 'mixed',
    ward: '',
    street: '',
    block: '',
    compound: '',
  });

  // Boundary layer visibility
  const [showProvinces, setShowProvinces] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showChiefdoms, setShowChiefdoms] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);

  // Store neighborhood/landmark markers
  const neighborhoodMarkers = useRef<maplibregl.Marker[]>([]);
  const landmarkMarkers = useRef<maplibregl.Marker[]>([]);

  // Toggle layer visibility
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const setVisibility = (layerId: string, visible: boolean) => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVisibility('provinces-border', showProvinces);
    setVisibility('districts-border', showDistricts);
    setVisibility('chiefdoms-border', showChiefdoms);
  }, [showProvinces, showDistricts, showChiefdoms]);

  // Toggle neighborhood markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing neighborhood markers
    neighborhoodMarkers.current.forEach(m => m.remove());
    neighborhoodMarkers.current = [];

    if (showNeighborhoods) {
      FREETOWN_NEIGHBORHOODS.forEach(neighborhood => {
        const el = document.createElement('div');
        el.className = 'neighborhood-marker';
        el.style.cssText = `
          background: #6366f1;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `;
        el.textContent = neighborhood.name;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(neighborhood.center)
          .addTo(map.current!);
        neighborhoodMarkers.current.push(marker);
      });
    }
  }, [showNeighborhoods]);

  // Toggle landmark markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing landmark markers
    landmarkMarkers.current.forEach(m => m.remove());
    landmarkMarkers.current = [];

    if (showLandmarks) {
      FREETOWN_LANDMARKS.forEach(landmark => {
        const marker = new maplibregl.Marker({ color: '#ef4444', scale: 0.7 })
          .setLngLat(landmark.center)
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <div class="font-semibold">${landmark.name}</div>
              <div class="text-xs text-gray-500 capitalize">${landmark.type}</div>
            </div>
          `))
          .addTo(map.current!);
        landmarkMarkers.current.push(marker);
      });
    }
  }, [showLandmarks]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
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
      center: SIERRA_LEONE_CENTER,
      zoom: 7,
      maxBounds: SIERRA_LEONE_BOUNDS,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', async () => {
      if (!map.current) return;
      console.log('Map loaded, fetching GADM boundaries (offline-first)...');

      // Load GADM boundary data with offline support
      try {
        const [country, provinces, districtsGeo, chiefdoms] = await Promise.all([
          fetchGeodata('gadm_country', '/geodata/gadm41_SLE_0.json'),
          fetchGeodata('gadm_provinces', '/geodata/gadm41_SLE_1.json'),
          fetchGeodata('gadm_districts', '/geodata/gadm41_SLE_2.json'),
          fetchGeodata('gadm_chiefdoms', '/geodata/gadm41_SLE_3.json'),
        ]);

        if (!country || !provinces || !districtsGeo || !chiefdoms) {
          throw new Error('Failed to load GADM files (offline data may not be available)');
        }

        console.log('GADM data loaded:', { country: country.features.length, provinces: provinces.features.length });
        console.log('Country geometry type:', country.features[0].geometry.type);

        // Create world mask using GADM country boundary
        const countryGeom = country.features[0].geometry;
        let innerRings: number[][][] = [];

        if (countryGeom.type === 'MultiPolygon') {
          // For MultiPolygon, get the exterior ring of each polygon and reverse it
          innerRings = countryGeom.coordinates.map((polygon: number[][][]) =>
            polygon[0].slice().reverse()
          );
        } else if (countryGeom.type === 'Polygon') {
          // For Polygon, just get the exterior ring and reverse it
          innerRings = [countryGeom.coordinates[0].slice().reverse()];
        }

        console.log('Inner rings for mask:', innerRings.length);

        const worldMaskWithGADM: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
          type: 'Feature',
          properties: {},
          geometry: innerRings.length === 1 ? {
            type: 'Polygon',
            coordinates: [
              // Outer ring (world bounds)
              [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
              // Inner ring (Sierra Leone - reversed to cut out)
              innerRings[0]
            ],
          } : {
            // For multiple polygons, use MultiPolygon approach
            type: 'Polygon',
            coordinates: [
              [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]],
              ...innerRings
            ],
          },
        };

        // Add mask source using GADM boundary
        map.current.addSource('world-mask', {
          type: 'geojson',
          data: worldMaskWithGADM,
        });

        // Mask layer - hide everything outside Sierra Leone
        map.current.addLayer({
          id: 'outside-mask',
          type: 'fill',
          source: 'world-mask',
          paint: {
            'fill-color': '#f1f5f9',
            'fill-opacity': 0.95,
          },
        });

        // Fit to Sierra Leone bounds from GADM
        const bbox = country.features[0].bbox || [-13.5, 6.9, -10.2, 10.0];
        console.log('Fitting to bounds:', bbox);
        map.current.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          { padding: 20, duration: 1000 }
        );

        // Add sources
        map.current.addSource('country', { type: 'geojson', data: country });
        map.current.addSource('provinces', { type: 'geojson', data: provinces });
        map.current.addSource('districts-geo', { type: 'geojson', data: districtsGeo });
        map.current.addSource('chiefdoms', { type: 'geojson', data: chiefdoms });

        // Country border (thick)
        map.current.addLayer({
          id: 'country-border',
          type: 'line',
          source: 'country',
          paint: {
            'line-color': '#1e293b',
            'line-width': 3,
          },
        });

        // Province borders
        map.current.addLayer({
          id: 'provinces-border',
          type: 'line',
          source: 'provinces',
          paint: {
            'line-color': '#dc2626',
            'line-width': 2,
            'line-dasharray': [4, 2],
          },
        });

        // Province labels removed - font not available on demo server

        // District borders
        map.current.addLayer({
          id: 'districts-border',
          type: 'line',
          source: 'districts-geo',
          paint: {
            'line-color': '#2563eb',
            'line-width': 1.5,
          },
        });

        // District labels removed - font not available on demo server

        // Chiefdom borders (hidden by default)
        map.current.addLayer({
          id: 'chiefdoms-border',
          type: 'line',
          source: 'chiefdoms',
          paint: {
            'line-color': '#16a34a',
            'line-width': 1,
            'line-opacity': 0.7,
          },
          layout: {
            visibility: 'none',
          },
        });

        // Chiefdom labels removed - font not available on demo server

        console.log('GADM boundaries loaded successfully');
      } catch (err) {
        console.error('Failed to load GADM boundaries:', err);
      }

      setLoading(false);
      loadZonesGeoJSON();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle map clicks for drawing
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing) return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setDrawingPoints((prev) => [...prev, point]);

      // Add marker
      const marker = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat(point)
        .addTo(map.current!);
      drawingMarkers.current.push(marker);

      // Update drawing layer
      updateDrawingLayer([...drawingPoints, point]);
    };

    map.current.on('click', handleClick);
    return () => {
      map.current?.off('click', handleClick);
    };
  }, [isDrawing, drawingPoints]);

  const updateDrawingLayer = (points: [number, number][]) => {
    if (!map.current || points.length === 0) return;

    const sourceId = 'drawing';
    const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource;

    const geojson: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: points.length >= 3
        ? { type: 'Polygon', coordinates: [[...points, points[0]]] }
        : points.length === 2
        ? { type: 'LineString', coordinates: points }
        : { type: 'Point', coordinates: points[0] },
    };

    if (source) {
      source.setData(geojson);
    } else {
      map.current.addSource(sourceId, { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.3 },
      });
      map.current.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#10b981', 'line-width': 2 },
      });
    }
  };

  const clearDrawing = () => {
    drawingMarkers.current.forEach((m) => m.remove());
    drawingMarkers.current = [];
    setDrawingPoints([]);

    if (map.current?.getSource('drawing')) {
      map.current.removeLayer('drawing-fill');
      map.current.removeLayer('drawing-line');
      map.current.removeSource('drawing');
    }
  };

  // Reset selected district when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setSelectedDistrict(null);
    }
  }, [selectedRegion]);

  const loadZonesGeoJSON = async () => {
    if (!map.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

      try {
        geojson = await geographyApi.getZonesGeoJSON();
      } catch (apiErr) {
        console.warn('Could not load zones GeoJSON (may need login):', apiErr);
        // Continue with empty feature collection
      }

      if (map.current.getSource('zones')) {
        (map.current.getSource('zones') as maplibregl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource('zones', { type: 'geojson', data: geojson });

        map.current.addLayer({
          id: 'zones-fill',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': [
              'match',
              ['get', 'zone_type'],
              'residential', '#4CAF50',
              'commercial', '#2196F3',
              'industrial', '#FF9800',
              'mixed', '#9C27B0',
              '#607D8B',
            ],
            'fill-opacity': 0.3,
          },
        });

        map.current.addLayer({
          id: 'zones-outline',
          type: 'line',
          source: 'zones',
          paint: { 'line-color': '#333', 'line-width': 2 },
        });

        // Zone labels removed - requires glyphs which aren't available
        // Zone codes visible via popup on click

        map.current.on('click', 'zones-fill', (e) => {
          if (isDrawing) return;
          if (e.features && e.features[0]) {
            const props = e.features[0].properties;
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-2">
                  <div class="font-bold">${props?.primary_code}</div>
                  <div class="text-sm">${props?.name || 'Unnamed Zone'}</div>
                  <div class="text-xs text-gray-500">${props?.district_name}</div>
                  <div class="text-xs">${props?.address_count || 0} addresses</div>
                </div>
              `)
              .addTo(map.current!);
          }
        });

        map.current.on('mouseenter', 'zones-fill', () => {
          if (map.current && !isDrawing) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current.on('mouseleave', 'zones-fill', () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = isDrawing ? 'crosshair' : '';
          }
        });
      }
    } catch (err) {
      console.error('Failed to load zones GeoJSON:', err);
    }
  };

  const startDrawing = () => {
    if (!selectedDistrict) {
      setError('Please select a district first');
      return;
    }
    setIsDrawing(true);
    if (map.current) {
      map.current.getCanvas().style.cursor = 'crosshair';
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    clearDrawing();
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      setError('Please draw at least 3 points to create a polygon');
      return;
    }

    const geometry: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[...drawingPoints, drawingPoints[0]]],
    };

    setDrawnGeometry(geometry);
    setShowZoneModal(true);
    setIsDrawing(false);
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrict || !drawnGeometry) return;

    try {
      const coords = (drawnGeometry as GeoJSON.Polygon).coordinates[0];
      const lats = coords.map((c) => c[1]);
      const lngs = coords.map((c) => c[0]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      // Use offline-first zone creation
      await createZoneOffline({
        district_id: selectedDistrict,
        name: zoneForm.name || undefined,
        description: zoneForm.description || undefined,
        zone_type: zoneForm.zone_type,
        geometry: drawnGeometry,
        center_lat: centerLat.toString(),
        center_lng: centerLng.toString(),
      });

      clearDrawing();
      setShowZoneModal(false);
      setDrawnGeometry(null);
      setZoneForm({ name: '', description: '', zone_type: 'mixed', ward: '', street: '', block: '', compound: '' });

      // Reload zones GeoJSON for map display
      loadZonesGeoJSON();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create zone');
    }
  };

  const focusOnZone = (zone: Zone) => {
    setSelectedZone(zone);
    if (zone.geometry && map.current) {
      const coords = (zone.geometry as GeoJSON.Polygon).coordinates[0];
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])
      );
      map.current.fitBounds(bounds, { padding: 100 });
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    if (!confirm(`Delete zone ${zone.primary_code}?`)) return;
    try {
      // Use offline-first zone deletion
      await deleteZoneOffline(zone.id);
      loadZonesGeoJSON();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete zone');
    }
  };

  // Zoom to Freetown (Western Urban)
  const zoomToFreetown = () => {
    if (map.current) {
      map.current.fitBounds(FREETOWN_BOUNDS, { padding: 20, duration: 1000 });
    }
    // Auto-select Western Area and Western Urban
    const westernRegion = regions.find((r) => r.code === 'W');
    if (westernRegion) {
      setSelectedRegion(westernRegion.id);
    }
  };

  // Zoom to full Sierra Leone
  const zoomToCountry = () => {
    if (map.current) {
      map.current.fitBounds(SIERRA_LEONE_BOUNDS, { padding: 20, duration: 1000 });
    }
  };

  // Search for places using OpenStreetMap Nominatim
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search within Freetown bounding box - bounded search to get local results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=15` +
        `&viewbox=-13.32,8.52,-13.08,8.36` +
        `&bounded=1` +
        `&dedupe=0`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search result selection
  const selectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Remove existing search marker
    if (searchMarker.current) {
      searchMarker.current.remove();
    }

    // Add marker at location
    searchMarker.current = new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat([lng, lat])
      .setPopup(
        new maplibregl.Popup().setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm">${result.address?.road || result.address?.neighbourhood || result.type}</div>
            <div class="text-xs text-gray-500">${result.address?.suburb || result.address?.city || ''}</div>
            <div class="text-xs mt-1 font-mono">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>
        `)
      )
      .addTo(map.current!);

    // Fly to location
    map.current?.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1500,
    });

    // Open popup
    searchMarker.current.togglePopup();

    // Clear search
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load geojson data for editing
  useEffect(() => {
    if (isEditMode && !currentGeojsonData.current) {
      fetch('/api/geography/zones/geojson')
        .then(res => res.json())
        .then(data => {
          currentGeojsonData.current = data;
        });
    }
  }, [isEditMode]);

  // Edit mode - zone dragging functionality
  useEffect(() => {
    if (!map.current) return;

    const handleZoneClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!isEditMode || isDrawing) return;
      if (e.features && e.features[0]) {
        const zoneId = e.features[0].properties?.id;
        setEditingZoneId(zoneId);
        // Store original geometry for potential cancel
        const geom = e.features[0].geometry as GeoJSON.Polygon;
        originalGeometry.current = JSON.parse(JSON.stringify(geom));
      }
    };

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (!isEditMode || !editingZoneId) return;

      // Check if clicking on the selected zone
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ['zones-fill'] });
      if (features && features.length > 0 && features[0].properties?.id === editingZoneId) {
        setIsDragging(true);
        dragStartPos.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        map.current!.getCanvas().style.cursor = 'grabbing';
        map.current!.dragPan.disable(); // Disable map panning while dragging zone
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (!isDragging || !editingZoneId || !dragStartPos.current) return;
      if (!currentGeojsonData.current || !currentGeojsonData.current.features) return;

      const deltaLng = e.lngLat.lng - dragStartPos.current.lng;
      const deltaLat = e.lngLat.lat - dragStartPos.current.lat;

      // Update the zone geometry locally
      const source = map.current?.getSource('zones') as maplibregl.GeoJSONSource;
      if (source && currentGeojsonData.current && currentGeojsonData.current.features) {
        const updatedFeatures = currentGeojsonData.current.features.map(feature => {
          if (feature.properties?.id === editingZoneId) {
            const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
            const newCoords = coords.map(coord => [
              coord[0] + deltaLng,
              coord[1] + deltaLat
            ]);
            return {
              ...feature,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [newCoords]
              }
            };
          }
          return feature;
        });

        currentGeojsonData.current = { ...currentGeojsonData.current, features: updatedFeatures };
        source.setData(currentGeojsonData.current);
        setHasUnsavedChanges(true);
      }

      dragStartPos.current = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        map.current!.getCanvas().style.cursor = isEditMode ? 'pointer' : '';
        map.current!.dragPan.enable(); // Re-enable map panning
      }
    };

    if (isEditMode) {
      map.current.on('click', 'zones-fill', handleZoneClick);
      map.current.on('mousedown', handleMouseDown);
      map.current.on('mousemove', handleMouseMove);
      map.current.on('mouseup', handleMouseUp);
      map.current.getCanvas().style.cursor = 'pointer';
    }

    return () => {
      map.current?.off('click', 'zones-fill', handleZoneClick);
      map.current?.off('mousedown', handleMouseDown);
      map.current?.off('mousemove', handleMouseMove);
      map.current?.off('mouseup', handleMouseUp);
    };
  }, [isEditMode, editingZoneId, isDragging]);

  // Save zone position after drag
  const saveZonePosition = async () => {
    if (!editingZoneId || !currentGeojsonData.current) return;

    try {
      // Find the updated zone from local data
      const zone = currentGeojsonData.current.features.find(
        (f: any) => f.properties.id === editingZoneId
      );

      if (zone) {
        // Save to backend
        const response = await fetch(`/api/geography/zones/${editingZoneId}/geometry`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geometry: zone.geometry })
        });

        if (!response.ok) {
          throw new Error('Failed to save');
        }
      }

      setEditingZoneId(null);
      setHasUnsavedChanges(false);
      setError(null);
    } catch (err: any) {
      setError('Failed to save zone position');
    }
  };

  // Save all zone positions
  const saveAllZonePositions = async () => {
    if (!currentGeojsonData.current) return;

    try {
      setLoading(true);
      // Save all zones that have been modified
      for (const feature of currentGeojsonData.current.features) {
        await fetch(`/api/geography/zones/${feature.properties?.id}/geometry`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geometry: feature.geometry })
        });
      }

      setHasUnsavedChanges(false);
      setEditingZoneId(null);
      setError(null);
    } catch (err: any) {
      setError('Failed to save zone positions');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingZoneId(null);
    setIsEditMode(false);
    setHasUnsavedChanges(false);
    currentGeojsonData.current = null;
    loadZonesGeoJSON(); // Reload original positions
  };

  // Group zones by ward
  const zonesByWard = zones.reduce((acc, zone) => {
    const ward = zone.ward || 'Unassigned';
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(zone);
    return acc;
  }, {} as Record<string, Zone[]>);

  // Check if zone has geometry drawn
  const hasGeometry = (zone: Zone) => zone.geometry !== null;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Zone Management</h2>
            <OfflineIndicator />
          </div>

          {/* Place Search */}
          <div className="relative">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setShowSearchResults(false);
                }}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Search places (Aberdeen, Lumley...)"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-xeeno-primary focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-xeeno-primary"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => selectSearchResult(result)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.address?.road || result.address?.neighbourhood || result.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.address?.suburb || result.address?.city || result.display_name.split(',').slice(1, 3).join(',')}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm text-gray-500 text-center">
                No places found
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={zoomToFreetown}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center gap-1"
            >
              <MapPinIcon className="w-3.5 h-3.5" />
              Freetown
            </button>
            <button
              onClick={zoomToCountry}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-slate-500 text-white hover:bg-slate-600 flex items-center justify-center gap-1"
            >
              <GlobeIcon className="w-3.5 h-3.5" />
              Full Map
            </button>
          </div>

          {/* Edit Mode Toggle */}
          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) {
                  setEditingZoneId(null);
                }
              }}
              className={`w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                isEditMode
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {isEditMode ? 'Exit Edit Mode' : 'Edit Zones (Drag & Drop)'}
            </button>

            {isEditMode && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                <p className="font-medium">Edit Mode Active</p>
                <p>Click a zone to select it, then drag to move.</p>
                {editingZoneId && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveZonePosition}
                      className="flex-1 py-1 px-2 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      Save This Zone
                    </button>
                    <button
                      onClick={() => setEditingZoneId(null)}
                      className="flex-1 py-1 px-2 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                    >
                      Deselect
                    </button>
                  </div>
                )}
                {hasUnsavedChanges && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveAllZonePositions}
                      disabled={loading}
                      className="flex-1 py-1.5 px-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save All Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-1.5 px-2 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      Discard All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select
              value={selectedRegion || ''}
              onChange={(e) => setSelectedRegion(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
            <select
              value={selectedDistrict || ''}
              onChange={(e) => setSelectedDistrict(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={!selectedRegion}
            >
              <option value="">Select District</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name} ({district.full_code})
                </option>
              ))}
            </select>
          </div>

          {!isDrawing ? (
            <button
              onClick={startDrawing}
              disabled={!selectedDistrict}
              className="w-full py-2 rounded-lg text-sm font-medium bg-xeeno-primary text-white hover:bg-xeeno-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Draw New Zone
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={finishDrawing}
                  disabled={drawingPoints.length < 3}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  Finish ({drawingPoints.length} pts)
                </button>
                <button
                  onClick={cancelDrawing}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Click on the map to add points. Need at least 3 points.
              </p>
            </div>
          )}
        </div>

        {/* Zones list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Zones {zones.length > 0 && `(${zones.length})`}
            </h3>
            {zones.length > 0 && (
              <span className="text-xs text-gray-500">
                {zones.filter(hasGeometry).length} mapped
              </span>
            )}
          </div>
          {zones.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {selectedDistrict ? 'No zones in this district.' : 'Select a district to view zones.'}
            </div>
          ) : (
            <div>
              {Object.entries(zonesByWard).map(([wardName, wardZones]) => (
                <div key={wardName}>
                  {/* Ward header */}
                  <div className="px-4 py-2 bg-gray-50 border-y border-gray-100 sticky top-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {wardName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {wardZones.filter(hasGeometry).length}/{wardZones.length}
                      </span>
                    </div>
                  </div>
                  {/* Ward zones */}
                  <div className="divide-y divide-gray-100">
                    {wardZones.map((zone) => (
                      <div
                        key={zone.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer ${
                          selectedZone?.id === zone.id ? 'bg-xeeno-primary/5' : ''
                        } ${!hasGeometry(zone) ? 'opacity-60' : ''}`}
                        onClick={() => focusOnZone(zone)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">{zone.primary_code}</span>
                              {!hasGeometry(zone) && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                  needs boundary
                                </span>
                              )}
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  zone.zone_type === 'residential'
                                    ? 'bg-green-100 text-green-700'
                                    : zone.zone_type === 'commercial'
                                    ? 'bg-blue-100 text-blue-700'
                                    : zone.zone_type === 'industrial'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {zone.zone_type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {zone.name || 'Unnamed'} | {zone.address_count} addresses
                            </p>
                          </div>
                          {!zone.is_locked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteZone(zone);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-xeeno-primary"></div>
          </div>
        )}

        {/* Legend & Layer Controls */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-3">
          {/* Boundary Layers */}
          <div>
            <h4 className="font-medium mb-2">Boundaries</h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProvinces}
                  onChange={(e) => setShowProvinces(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="w-4 h-0.5 bg-red-600" style={{ borderBottom: '2px dashed #dc2626' }}></span>
                <span>Provinces</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDistricts}
                  onChange={(e) => setShowDistricts(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="w-4 h-0.5 bg-blue-600"></span>
                <span>Districts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showChiefdoms}
                  onChange={(e) => setShowChiefdoms(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="w-4 h-0.5 bg-green-600"></span>
                <span>Chiefdoms</span>
              </label>
            </div>
          </div>

          {/* Freetown Location Services */}
          <div className="border-t border-gray-200 pt-2">
            <h4 className="font-medium mb-2">Freetown</h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNeighborhoods}
                  onChange={(e) => setShowNeighborhoods(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="w-3 h-3 bg-indigo-500 rounded"></span>
                <span>Neighborhoods</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLandmarks}
                  onChange={(e) => setShowLandmarks(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>Landmarks</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-2">
            <h4 className="font-medium mb-2">Zone Types</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500/50 rounded"></span>
                <span>Residential</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500/50 rounded"></span>
                <span>Commercial</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500/50 rounded"></span>
                <span>Industrial</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500/50 rounded"></span>
                <span>Mixed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Zone</h3>
            </div>
            <form onSubmit={handleCreateZone}>
              <div className="px-6 py-4 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  Zone boundary drawn successfully! The zone number will be auto-generated.
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Name (optional)
                  </label>
                  <input
                    type="text"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    placeholder="e.g., Downtown, Industrial Park"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone Type</label>
                  <select
                    value={zoneForm.zone_type}
                    onChange={(e) => setZoneForm({ ...zoneForm, zone_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="mixed">Mixed Use</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={zoneForm.description}
                    onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                    placeholder="Brief description of this zone"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Metadata Fields */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Location Metadata</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ward</label>
                      <input
                        type="text"
                        value={zoneForm.ward}
                        onChange={(e) => setZoneForm({ ...zoneForm, ward: e.target.value })}
                        placeholder="e.g., Ward 390"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Street</label>
                      <input
                        type="text"
                        value={zoneForm.street}
                        onChange={(e) => setZoneForm({ ...zoneForm, street: e.target.value })}
                        placeholder="e.g., Wilkinson Road"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Block</label>
                      <input
                        type="text"
                        value={zoneForm.block}
                        onChange={(e) => setZoneForm({ ...zoneForm, block: e.target.value })}
                        placeholder="e.g., Block A"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Compound</label>
                      <input
                        type="text"
                        value={zoneForm.compound}
                        onChange={(e) => setZoneForm({ ...zoneForm, compound: e.target.value })}
                        placeholder="e.g., ABC Compound"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowZoneModal(false);
                    clearDrawing();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90"
                >
                  Create Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
