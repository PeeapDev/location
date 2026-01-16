'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { poiApi } from '@/lib/api';
import type { POI } from '@/types/address';

const CATEGORY_COLORS: Record<string, string> = {
  healthcare: '#EF4444',
  education: '#3B82F6',
  government: '#8B5CF6',
  finance: '#10B981',
  food: '#F97316',
  shopping: '#EAB308',
  tourism: '#EC4899',
  transport: '#06B6D4',
  religious: '#6366F1',
  other: '#6B7280',
};

const CATEGORY_ICONS: Record<string, string> = {
  healthcare: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  education: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222',
  government: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  finance: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  food: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  shopping: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  tourism: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  transport: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  religious: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  other: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
};

export default function POIDetailPage() {
  const params = useParams();
  const poiId = params.id as string;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [poi, setPoi] = useState<POI | null>(null);
  const [nearbyPois, setNearbyPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPlusCode, setCopiedPlusCode] = useState(false);

  useEffect(() => {
    const fetchPoi = async () => {
      try {
        console.log('Fetching POI with ID:', poiId);
        const id = parseInt(poiId);
        if (isNaN(id)) {
          throw new Error(`Invalid POI ID: ${poiId}`);
        }
        const data = await poiApi.get(id);
        console.log('POI data received:', data);
        setPoi(data);

        // Fetch nearby POIs
        try {
          const nearby = await poiApi.nearby(data.latitude, data.longitude, {
            radius_m: 500,
            limit: 5,
          });
          setNearbyPois(nearby.pois.filter((p: any) => p.id !== data.id));
        } catch (nearbyErr) {
          console.log('Could not fetch nearby POIs:', nearbyErr);
        }
      } catch (err: any) {
        console.error('POI fetch error:', err);
        const errorMsg = err.response?.data?.detail || err.message || 'POI not found';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoi();
  }, [poiId]);

  // Initialize map when POI loads
  useEffect(() => {
    if (!poi || map.current || !mapContainer.current) return;

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
      center: [poi.longitude, poi.latitude],
      zoom: 16,
    });

    // Add marker for POI
    new maplibregl.Marker({ color: CATEGORY_COLORS[poi.category] || '#1E40AF' })
      .setLngLat([poi.longitude, poi.latitude])
      .addTo(map.current);

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [poi]);

  const handleCopyPlusCode = () => {
    if (poi?.plus_code) {
      navigator.clipboard.writeText(poi.plus_code);
      setCopiedPlusCode(true);
      setTimeout(() => setCopiedPlusCode(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading POI</h2>
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-red-400 text-sm">POI ID: {poiId}</p>
          <a href="/directory" className="mt-6 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Back to Directory
          </a>
        </div>
      </div>
    );
  }

  if (!poi) return null;

  const categoryColor = CATEGORY_COLORS[poi.category] || CATEGORY_COLORS.other;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-indigo-600">Home</a>
        <span>/</span>
        <a href="/directory" className="hover:text-indigo-600">Directory</a>
        <span>/</span>
        <span className="text-gray-700">{poi.name || 'Place'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${categoryColor}20` }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: categoryColor }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={CATEGORY_ICONS[poi.category] || CATEGORY_ICONS.other}
            />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{poi.name || 'Unnamed Place'}</h1>
          <p className="text-lg text-gray-600 mt-1">
            {poi.subcategory?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || poi.category}
          </p>
        </div>
        <span
          className="px-4 py-2 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
        >
          {poi.category.charAt(0).toUpperCase() + poi.category.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div ref={mapContainer} className="h-80 w-full" />
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {poi.street_name && (
                <div>
                  <div className="text-sm text-gray-500">Street</div>
                  <div className="font-medium">{poi.street_name}</div>
                </div>
              )}
              {poi.house_number && (
                <div>
                  <div className="text-sm text-gray-500">Number</div>
                  <div className="font-medium">{poi.house_number}</div>
                </div>
              )}
              {poi.opening_hours && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Opening Hours</div>
                  <div className="font-medium">{poi.opening_hours}</div>
                </div>
              )}
            </div>
          </div>

          {/* Nearby POIs */}
          {nearbyPois.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Nearby Places</h2>
              <div className="space-y-3">
                {nearbyPois.map((nearby) => (
                  <a
                    key={nearby.id}
                    href={`/poi/${nearby.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${CATEGORY_COLORS[nearby.category] || '#6B7280'}20` }}
                    >
                      <svg
                        className="w-5 h-5"
                        style={{ color: CATEGORY_COLORS[nearby.category] || '#6B7280' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={CATEGORY_ICONS[nearby.category] || CATEGORY_ICONS.other}
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{nearby.name}</div>
                      <div className="text-sm text-gray-500">{nearby.subcategory?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {(nearby as any).distance_m ? `${Math.round((nearby as any).distance_m)}m` : ''}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plus Code Card */}
          {poi.plus_code && (
            <div className="bg-blue-600 text-white rounded-xl p-6">
              <div className="text-sm opacity-75 mb-1">Plus Code</div>
              <div className="font-mono text-lg mb-4 break-all">{poi.plus_code}</div>
              <button
                onClick={handleCopyPlusCode}
                className="w-full py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition"
              >
                {copiedPlusCode ? 'Copied!' : 'Copy Plus Code'}
              </button>
            </div>
          )}

          {/* Location Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Location</h3>
            <div className="space-y-3 text-sm">
              {poi.zone_code && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Zone Code</span>
                  <span className="font-mono">{poi.zone_code}</span>
                </div>
              )}
              {poi.district_name && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">District</span>
                  <span>{poi.district_name}</span>
                </div>
              )}
              {poi.region_name && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Region</span>
                  <span>{poi.region_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Latitude</span>
                <span className="font-mono">{poi.latitude.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Longitude</span>
                <span className="font-mono">{poi.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          {(poi.phone || poi.website) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-3">
                {poi.phone && (
                  <a
                    href={`tel:${poi.phone}`}
                    className="flex items-center gap-2 text-indigo-600 hover:underline"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {poi.phone}
                  </a>
                )}
                {poi.website && (
                  <a
                    href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:underline"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Actions</h3>
            <div className="space-y-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Get Directions
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(`${poi.latitude},${poi.longitude}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Coordinates
              </button>
            </div>
          </div>

          {/* OSM Attribution */}
          <div className="text-xs text-gray-400 text-center">
            Data from OpenStreetMap
            {poi.osm_id && (
              <a
                href={`https://www.openstreetmap.org/${poi.osm_type || 'node'}/${poi.osm_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-indigo-500 hover:underline"
              >
                View on OSM
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
