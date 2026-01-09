'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { addressApi } from '@/lib/api';
import type { AddressCreateRequest, Address, ZoneInfo } from '@/types/address';

// Sierra Leone geographic bounds
const SL_BOUNDS = {
  minLat: 6.85,
  maxLat: 10.0,
  minLon: -13.5,
  maxLon: -10.25,
};

// Validate if coordinates are within Sierra Leone
const isWithinSierraLeone = (lat: number, lon: number): boolean => {
  return (
    lat >= SL_BOUNDS.minLat &&
    lat <= SL_BOUNDS.maxLat &&
    lon >= SL_BOUNDS.minLon &&
    lon <= SL_BOUNDS.maxLon
  );
};

export default function RegisterPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);

  const [formData, setFormData] = useState<AddressCreateRequest>({
    latitude: 0,
    longitude: 0,
    accuracy_m: undefined,
    street_name: '',
    block: '',
    house_number: '',
    building_name: '',
    landmark_primary: '',
    landmark_secondary: '',
    delivery_instructions: '',
    address_type: 'residential',
    contact_phone: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Address | null>(null);
  const [locationSet, setLocationSet] = useState(false);

  // New state for pin drop mode and zone info
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [isLoadingZone, setIsLoadingZone] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch zone info from coordinates
  const fetchZoneInfo = useCallback(async (lat: number, lon: number) => {
    setIsLoadingZone(true);
    try {
      const response = await addressApi.reverseGeocode(lat, lon, 100);
      if (response.zone) {
        setZoneInfo(response.zone);
      } else {
        setZoneInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch zone info:', err);
      setZoneInfo(null);
    } finally {
      setIsLoadingZone(false);
    }
  }, []);

  // Handle pin placement with validation
  const handlePinPlacement = useCallback(
    async (lng: number, lat: number, accuracy?: number) => {
      // Validate Sierra Leone bounds
      if (!isWithinSierraLeone(lat, lng)) {
        setLocationError('Location must be within Sierra Leone');
        return false;
      }

      setLocationError(null);
      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        accuracy_m: accuracy ?? 10,
      }));
      setLocationSet(true);
      updateMarker(lng, lat);

      // Fetch zone info
      await fetchZoneInfo(lat, lng);
      return true;
    },
    [fetchZoneInfo]
  );

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
      center: [-13.2317, 8.4657], // Freetown
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocate control
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    });
    map.current.addControl(geolocate, 'top-right');

    // Handle geolocation
    geolocate.on('geolocate', (e: any) => {
      const { latitude, longitude, accuracy } = e.coords;
      handlePinPlacement(longitude, latitude, accuracy);
    });

    // Handle map click
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      handlePinPlacement(lng, lat);
    });

    // Load and display postal zones
    map.current.on('load', async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/geography/zones/geojson`
        );
        const geojson = await response.json();

        if (map.current && geojson.features?.length > 0) {
          // Add the zones source
          map.current.addSource('postal-zones', {
            type: 'geojson',
            data: geojson,
          });

          // Add fill layer for zones
          map.current.addLayer({
            id: 'zones-fill',
            type: 'fill',
            source: 'postal-zones',
            paint: {
              'fill-color': '#1E40AF',
              'fill-opacity': 0.1,
            },
          });

          // Add border layer for zones
          map.current.addLayer({
            id: 'zones-border',
            type: 'line',
            source: 'postal-zones',
            paint: {
              'line-color': '#1E40AF',
              'line-width': 2,
              'line-opacity': 0.6,
            },
          });

          // Add labels for postal codes (showing ####-XXX format)
          map.current.addLayer({
            id: 'zones-labels',
            type: 'symbol',
            source: 'postal-zones',
            layout: {
              'text-field': ['concat', ['get', 'primary_code'], '-XXX'],
              'text-size': 10,
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': '#1E40AF',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
            },
          });

          // Add hover effect
          map.current.on('mouseenter', 'zones-fill', () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', 'zones-fill', () => {
            if (map.current && !isPinDropMode) {
              map.current.getCanvas().style.cursor = '';
            }
          });

          // Show zone info on click
          map.current.on('click', 'zones-fill', (e) => {
            if (e.features && e.features[0]) {
              const props = e.features[0].properties;
              new maplibregl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div class="p-2">
                    <div class="font-bold text-xeeno-primary text-lg">${props.primary_code}-XXX</div>
                    <div class="text-sm font-medium">${props.name}</div>
                    <div class="text-xs text-gray-500">${props.district_name}</div>
                    <div class="text-xs text-gray-400 mt-1">${props.address_count || 0} addresses</div>
                  </div>
                `)
                .addTo(map.current!);
            }
          });
        }
      } catch (err) {
        console.error('Failed to load postal zones:', err);
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [handlePinPlacement]);

  // Update cursor when pin drop mode changes
  useEffect(() => {
    if (!map.current) return;
    const canvas = map.current.getCanvas();
    if (isPinDropMode) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }
  }, [isPinDropMode]);

  const updateMarker = (lng: number, lat: number) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else if (map.current) {
      marker.current = new maplibregl.Marker({ color: '#1E40AF', draggable: true })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat();
        // Validate and update on drag end
        if (!isWithinSierraLeone(lngLat.lat, lngLat.lng)) {
          setLocationError('Location must be within Sierra Leone');
          // Snap back to previous valid position
          marker.current!.setLngLat([formData.longitude, formData.latitude]);
          return;
        }
        setLocationError(null);
        setFormData((prev) => ({
          ...prev,
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        }));
        // Fetch zone info for new position
        fetchZoneInfo(lngLat.lat, lngLat.lng);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!locationSet) {
      setError('Please set a location by clicking on the map or using GPS');
      setIsLoading(false);
      return;
    }

    try {
      const address = await addressApi.register(formData);
      setSuccess(address);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register address');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <svg
            className="h-16 w-16 text-green-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Address Registered!</h2>
          <p className="text-green-700 mb-6">Your address has been submitted for verification.</p>

          <div className="bg-white rounded-lg p-6 text-left mb-6">
            <h3 className="font-semibold text-lg mb-4">Your PDA-ID</h3>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-xl text-center text-xeeno-primary">
              {success.pda_id}
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Save this ID - you&apos;ll need it for deliveries and services
            </p>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Postal Code:</span>
                <span>{success.zone_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="badge badge-pending">{success.verification_status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Confidence:</span>
                <span>{Math.round(success.confidence_score * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                navigator.clipboard.writeText(success.pda_id);
              }}
              className="btn-outline"
            >
              Copy PDA-ID
            </button>
            <a href={`/address/${success.pda_id}`} className="btn-primary">
              View Address
            </a>
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({
                  latitude: 0,
                  longitude: 0,
                  street_name: '',
                  block: '',
                  house_number: '',
                  building_name: '',
                  landmark_primary: '',
                  landmark_secondary: '',
                  delivery_instructions: '',
                  address_type: 'residential',
                  contact_phone: '',
                });
                setLocationSet(false);
                setZoneInfo(null);
                setLocationError(null);
                setIsPinDropMode(false);
                if (marker.current) {
                  marker.current.remove();
                  marker.current = null;
                }
              }}
              className="btn-secondary"
            >
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Form Section */}
      <div className="lg:w-1/2 overflow-y-auto p-6 bg-white">
        <h1 className="text-2xl font-bold mb-2">Register New Address</h1>
        <p className="text-gray-600 mb-6">
          Click on the map or use GPS to set your location, then fill in the address details.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {locationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            {/* Drop Pin Toggle & Status */}
            <div className="flex items-center justify-between">
              <span className="font-medium">Location</span>
              <div className="flex items-center gap-3">
                {locationSet ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Set
                  </span>
                ) : (
                  <span className="text-yellow-600 text-sm">Not set</span>
                )}
              </div>
            </div>

            {/* Drop Pin Button */}
            <button
              type="button"
              onClick={() => setIsPinDropMode(!isPinDropMode)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                isPinDropMode
                  ? 'bg-xeeno-primary text-white border-xeeno-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-xeeno-primary hover:text-xeeno-primary'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isPinDropMode ? 'Click on map to drop pin...' : 'Drop Pin on Map'}
            </button>

            {/* Pin Drop Instructions */}
            {isPinDropMode && !locationSet && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Click anywhere on the map to place your pin. You can drag the pin to adjust the location.</span>
              </div>
            )}

            {/* Coordinates Display */}
            {locationSet && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Coordinates:</span>
                  <span className="font-mono text-gray-700">
                    {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </span>
                </div>
                {formData.accuracy_m && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Accuracy:</span>
                    <span className={`font-medium ${
                      formData.accuracy_m <= 10 ? 'text-green-600' :
                      formData.accuracy_m <= 25 ? 'text-yellow-600' : 'text-orange-600'
                    }`}>
                      ±{formData.accuracy_m.toFixed(0)}m
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Zone Info from Reverse Geocode */}
            {isLoadingZone && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-xeeno-primary border-t-transparent rounded-full"></div>
                Looking up zone information...
              </div>
            )}

            {zoneInfo && !isLoadingZone && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-xeeno-primary">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Zone Information
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Postal Code:</span>
                    <span className="ml-2 font-medium">{zoneInfo.postal_code}</span>
                  </div>
                  {zoneInfo.zone_name && (
                    <div>
                      <span className="text-gray-500">Zone:</span>
                      <span className="ml-2">{zoneInfo.zone_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">District:</span>
                    <span className="ml-2">{zoneInfo.district}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Region:</span>
                    <span className="ml-2">{zoneInfo.region}</span>
                  </div>
                </div>
              </div>
            )}

            {locationSet && !zoneInfo && !isLoadingZone && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm">
                No zone found for this location. The address will be assigned to the nearest zone.
              </div>
            )}
          </div>

          {/* Street Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Name *
            </label>
            <input
              type="text"
              value={formData.street_name}
              onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
              className="search-input"
              placeholder="e.g., Siaka Stevens Street"
              required
            />
          </div>

          {/* Block & House Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block / Section
              </label>
              <input
                type="text"
                value={formData.block}
                onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                className="search-input"
                placeholder="e.g., Block A, Section 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House Number
              </label>
              <input
                type="text"
                value={formData.house_number}
                onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                className="search-input"
                placeholder="e.g., 42"
              />
            </div>
          </div>

          {/* Building Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Name
            </label>
            <input
              type="text"
              value={formData.building_name}
              onChange={(e) => setFormData({ ...formData, building_name: e.target.value })}
              className="search-input"
              placeholder="e.g., Unity Building, Tower A"
            />
          </div>

          {/* Primary Landmark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Landmark *
            </label>
            <input
              type="text"
              value={formData.landmark_primary}
              onChange={(e) => setFormData({ ...formData, landmark_primary: e.target.value })}
              className="search-input"
              placeholder="e.g., Opposite National Stadium main gate"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              A well-known nearby location that helps find this address
            </p>
          </div>

          {/* Secondary Landmark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Landmark
            </label>
            <input
              type="text"
              value={formData.landmark_secondary}
              onChange={(e) => setFormData({ ...formData, landmark_secondary: e.target.value })}
              className="search-input"
              placeholder="e.g., Behind the yellow MTN kiosk"
            />
          </div>

          {/* Delivery Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Instructions
            </label>
            <textarea
              value={formData.delivery_instructions}
              onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
              className="search-input"
              rows={2}
              placeholder="e.g., Enter through side gate, ask for security"
            />
          </div>

          {/* Address Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Type
            </label>
            <select
              value={formData.address_type}
              onChange={(e) => setFormData({ ...formData, address_type: e.target.value as any })}
              className="search-input"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial / Business</option>
              <option value="industrial">Industrial</option>
              <option value="government">Government</option>
              <option value="institutional">Institutional (School, Hospital, etc.)</option>
              <option value="mixed">Mixed Use</option>
            </select>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="search-input"
              placeholder="+232-XX-XXX-XXX"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !locationSet}
            className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner" />
                Registering...
              </span>
            ) : (
              'Register Address'
            )}
          </button>
        </form>
      </div>

      {/* Map Section */}
      <div className="lg:w-1/2 h-64 lg:h-auto relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Pin Drop Mode Overlay */}
        {isPinDropMode && !locationSet && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-xeeno-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Click to drop pin</span>
            </div>
          </div>
        )}

        {/* Location Set Confirmation */}
        {locationSet && zoneInfo && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{zoneInfo.zone_name || zoneInfo.postal_code}</div>
                    <div className="text-xs text-gray-500">{zoneInfo.district}, {zoneInfo.region}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationSet(false);
                    setZoneInfo(null);
                    setFormData((prev) => ({ ...prev, latitude: 0, longitude: 0 }));
                    if (marker.current) {
                      marker.current.remove();
                      marker.current = null;
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Clear location"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
