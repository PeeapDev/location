'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import { addressApi } from '@/lib/api';
import type { Address } from '@/types/address';

export default function AddressDetailPage() {
  const params = useParams();
  const pdaId = params.pda_id as string;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const [address, setAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPlusCode, setCopiedPlusCode] = useState(false);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const data = await addressApi.get(pdaId);
        setAddress(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Address not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddress();
  }, [pdaId]);

  // Initialize map when address loads
  useEffect(() => {
    if (!address || map.current || !mapContainer.current) return;

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
      center: [address.longitude, address.latitude],
      zoom: 16,
    });

    new maplibregl.Marker({ color: '#1E40AF' })
      .setLngLat([address.longitude, address.latitude])
      .addTo(map.current);

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [address]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(pdaId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="h-16 w-16 text-red-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-bold text-red-800 mb-2">Address Not Found</h2>
          <p className="text-red-600">{error}</p>
          <a href="/search" className="btn-primary mt-6 inline-block">
            Search Addresses
          </a>
        </div>
      </div>
    );
  }

  if (!address) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/" className="hover:text-xeeno-primary">Home</a>
          <span>/</span>
          <a href="/search" className="hover:text-xeeno-primary">Search</a>
          <span>/</span>
          <span className="text-gray-700">{address.zone_code}</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{address.display_address}</h1>
        <p className="text-gray-600">{address.zone_code}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="card p-0 overflow-hidden">
            <div ref={mapContainer} className="h-80 w-full" />
          </div>

          {/* Address Details */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Address Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {address.street_name && (
                <div>
                  <div className="text-sm text-gray-500">Street</div>
                  <div className="font-medium">{address.street_name}</div>
                </div>
              )}
              {address.block && (
                <div>
                  <div className="text-sm text-gray-500">Block / Section</div>
                  <div className="font-medium">{address.block}</div>
                </div>
              )}
              {address.house_number && (
                <div>
                  <div className="text-sm text-gray-500">House Number</div>
                  <div className="font-medium">{address.house_number}</div>
                </div>
              )}
              {address.building_name && (
                <div>
                  <div className="text-sm text-gray-500">Building</div>
                  <div className="font-medium">{address.building_name}</div>
                </div>
              )}
              {address.floor && (
                <div>
                  <div className="text-sm text-gray-500">Floor</div>
                  <div className="font-medium">{address.floor}</div>
                </div>
              )}
              {address.unit && (
                <div>
                  <div className="text-sm text-gray-500">Unit</div>
                  <div className="font-medium">{address.unit}</div>
                </div>
              )}
            </div>
          </div>

          {/* Landmarks & Instructions */}
          {(address.landmark_primary || address.delivery_instructions) && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Landmarks & Delivery</h2>

              {address.landmark_primary && (
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">Primary Landmark</div>
                  <div className="bg-gray-50 rounded-lg p-3">{address.landmark_primary}</div>
                </div>
              )}

              {address.landmark_secondary && (
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">Secondary Landmark</div>
                  <div className="bg-gray-50 rounded-lg p-3">{address.landmark_secondary}</div>
                </div>
              )}

              {address.delivery_instructions && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Delivery Instructions</div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    {address.delivery_instructions}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* PDA-ID Card */}
          <div className="card bg-xeeno-primary text-white">
            <div className="text-sm opacity-75 mb-1">PDA-ID</div>
            <div className="font-mono text-lg mb-4 break-all">{address.pda_id}</div>
            <button
              onClick={handleCopyId}
              className="w-full py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition"
            >
              {copied ? 'Copied!' : 'Copy PDA-ID'}
            </button>
          </div>

          {/* Status Card */}
          <div className="card">
            <h3 className="font-semibold mb-4">Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Verification</span>
                <span
                  className={`badge ${
                    address.verification_status === 'verified'
                      ? 'badge-verified'
                      : address.verification_status === 'pending'
                      ? 'badge-pending'
                      : 'badge-rejected'
                  }`}
                >
                  {address.verification_status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Confidence</span>
                <span
                  className={`font-medium ${
                    address.confidence_score >= 0.8
                      ? 'text-green-600'
                      : address.confidence_score >= 0.5
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {Math.round(address.confidence_score * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Type</span>
                <span className="capitalize">{address.address_type}</span>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="card">
            <h3 className="font-semibold mb-4">Location</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Postal Code</span>
                <span className="font-mono">{address.zone_code}</span>
              </div>

              {/* Plus Code */}
              {address.plus_code && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Plus Code</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {address.plus_code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address.plus_code!);
                        setCopiedPlusCode(true);
                        setTimeout(() => setCopiedPlusCode(false), 2000);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition"
                      title="Copy Plus Code"
                    >
                      {copiedPlusCode ? (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Latitude</span>
                <span className="font-mono">{address.latitude.toFixed(6)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Longitude</span>
                <span className="font-mono">{address.longitude.toFixed(6)}</span>
              </div>

              {address.accuracy_m && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">GPS Accuracy</span>
                  <span>{address.accuracy_m.toFixed(0)}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates Card */}
          <div className="card">
            <h3 className="font-semibold mb-4">Dates</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Registered</span>
                <span>{new Date(address.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Updated</span>
                <span>{new Date(address.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          {address.contact_phone && (
            <div className="card">
              <h3 className="font-semibold mb-4">Contact</h3>
              <a
                href={`tel:${address.contact_phone}`}
                className="flex items-center gap-2 text-xeeno-primary hover:underline"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {address.contact_phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
