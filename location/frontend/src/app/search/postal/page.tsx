'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { postalCodeApi } from '@/lib/api';
import type { PostalCodeDetailsResponse, PostalAddressItem, PostalCodeAutocompleteItem } from '@/types/address';

export default function PostalCodeSearchPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PostalCodeAutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [zoneDetails, setZoneDetails] = useState<PostalCodeDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<PostalAddressItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce autocomplete
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

    return () => {
      map.current?.remove();
    };
  }, []);

  // Clear map layers and markers
  const clearMap = useCallback(() => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    if (map.current) {
      if (map.current.getLayer('zone-fill')) {
        map.current.removeLayer('zone-fill');
      }
      if (map.current.getLayer('zone-outline')) {
        map.current.removeLayer('zone-outline');
      }
      if (map.current.getSource('zone-boundary')) {
        map.current.removeSource('zone-boundary');
      }
    }
  }, []);

  // Handle autocomplete input
  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await postalCodeApi.autocomplete(value, 8);
        setSuggestions(response.suggestions);
        setShowSuggestions(response.suggestions.length > 0);
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 200);
  };

  // Handle search/selection
  const handleSearch = async (postalCode?: string) => {
    const code = postalCode || searchQuery.trim();
    if (!code) return;

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);
    setSelectedAddress(null);
    clearMap();

    try {
      const response = await postalCodeApi.getDetails(code, {
        include_addresses: true,
        address_limit: 100,
        include_geometry: true,
      });

      setZoneDetails(response);
      setSearchQuery(response.zone_code);

      // Add zone boundary to map
      if (response.geometry && map.current) {
        const geojson = JSON.parse(response.geometry);

        map.current.addSource('zone-boundary', {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: 'zone-fill',
          type: 'fill',
          source: 'zone-boundary',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.15,
          },
        });

        map.current.addLayer({
          id: 'zone-outline',
          type: 'line',
          source: 'zone-boundary',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 3,
          },
        });
      }

      // Add address markers
      if (response.addresses.length > 0 && map.current) {
        const bounds = new maplibregl.LngLatBounds();

        response.addresses.forEach((addr) => {
          const marker = new maplibregl.Marker({
            color: addr.verification_status === 'verified' ? '#059669' : '#F59E0B',
            scale: 0.7,
          })
            .setLngLat([addr.longitude, addr.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-bold text-sm">${addr.display_address}</h3>
                  <p class="text-xs text-gray-600 mt-1">PDA-ID: ${addr.pda_id}</p>
                  ${addr.plus_code_local ? `<p class="text-xs text-gray-500">GeoCode: ${addr.plus_code_local}</p>` : ''}
                </div>
              `)
            )
            .addTo(map.current!);

          markers.current.push(marker);
          bounds.extend([addr.longitude, addr.latitude]);
        });

        map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      } else if (response.center_lat && response.center_lng && map.current) {
        map.current.flyTo({
          center: [response.center_lng, response.center_lat],
          zoom: 14,
        });
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.detail || 'Postal code not found');
      setZoneDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle address click
  const handleAddressClick = (addr: PostalAddressItem) => {
    setSelectedAddress(addr);
    map.current?.flyTo({
      center: [addr.longitude, addr.latitude],
      zoom: 17,
      duration: 1000,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Search Panel */}
      <div className="lg:w-1/3 bg-white border-r overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Postal Code Search</h1>
          <p className="text-gray-600 text-sm mb-6">
            Search by postal code (e.g., 1100 or 1100-001) to view zone details and addresses.
          </p>

          {/* Search Input */}
          <div className="relative">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Enter postal code (e.g., 1100)"
                    className="search-input w-full pr-10"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setZoneDetails(null);
                        clearMap();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="btn-primary px-6"
                >
                  {isLoading ? '...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Autocomplete Suggestions */}
            {showSuggestions && (
              <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((item) => (
                  <button
                    key={item.zone_code}
                    onClick={() => {
                      setSearchQuery(item.zone_code);
                      setShowSuggestions(false);
                      handleSearch(item.zone_code);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono font-semibold text-xeeno-primary">
                          {item.zone_code}
                        </span>
                        {item.zone_name && (
                          <span className="text-gray-600 ml-2">{item.zone_name}</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {item.address_count} addr
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{item.district_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Zone Details */}
          {zoneDetails && (
            <div className="mt-6">
              {/* Zone Info Card */}
              <div className="card bg-gradient-to-br from-xeeno-primary to-blue-600 text-white mb-4">
                <h2 className="text-xl font-bold">{zoneDetails.zone_code}</h2>
                {zoneDetails.zone_name && (
                  <p className="text-blue-100">{zoneDetails.zone_name}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-200">District</p>
                    <p className="font-medium">{zoneDetails.district_name}</p>
                  </div>
                  <div>
                    <p className="text-blue-200">Region</p>
                    <p className="font-medium">{zoneDetails.region_name}</p>
                  </div>
                  <div>
                    <p className="text-blue-200">Type</p>
                    <p className="font-medium capitalize">{zoneDetails.segment_type}</p>
                  </div>
                  <div>
                    <p className="text-blue-200">Addresses</p>
                    <p className="font-medium">{zoneDetails.address_count}</p>
                  </div>
                </div>

                {zoneDetails.plus_code_local && (
                  <div className="mt-4 pt-4 border-t border-blue-400">
                    <p className="text-blue-200 text-sm">GeoCode (Local)</p>
                    <p className="font-mono font-bold text-lg">{zoneDetails.plus_code_local}</p>
                  </div>
                )}
              </div>

              {/* Addresses List */}
              {zoneDetails.addresses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">
                    Addresses ({zoneDetails.addresses.length} of {zoneDetails.address_count})
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {zoneDetails.addresses.map((addr) => (
                      <div
                        key={addr.pda_id}
                        onClick={() => handleAddressClick(addr)}
                        className={`p-3 rounded-lg border cursor-pointer transition ${
                          selectedAddress?.pda_id === addr.pda_id
                            ? 'border-xeeno-primary bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{addr.display_address}</p>
                            <p className="font-mono text-xs text-gray-500 mt-1">{addr.pda_id}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              addr.verification_status === 'verified'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {addr.verification_status}
                          </span>
                        </div>
                        {addr.plus_code_local && (
                          <p className="text-xs text-gray-500 mt-1">
                            GeoCode: <span className="font-mono">{addr.plus_code_local}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="lg:w-2/3 h-64 lg:h-auto relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">Legend</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-600"></div>
              <span>Verified Address</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>Pending Address</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 opacity-20 border-2 border-blue-500"></div>
              <span>Zone Boundary</span>
            </div>
          </div>
        </div>

        {/* Selected Address Details */}
        {selectedAddress && (
          <div className="absolute top-4 right-4 w-72 bg-white rounded-lg shadow-xl p-4">
            <button
              onClick={() => setSelectedAddress(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="font-bold pr-6">{selectedAddress.display_address}</h3>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">PDA-ID:</span>
                <span className="font-mono text-xeeno-primary">{selectedAddress.pda_id}</span>
              </div>
              {selectedAddress.plus_code && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Plus Code:</span>
                  <span className="font-mono">{selectedAddress.plus_code}</span>
                </div>
              )}
              {selectedAddress.plus_code_local && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GeoCode:</span>
                  <span className="font-mono font-semibold">{selectedAddress.plus_code_local}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Confidence:</span>
                <span>{Math.round(selectedAddress.confidence_score * 100)}%</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={`/address/${selectedAddress.pda_id}`}
                className="btn-primary flex-1 text-center text-sm"
              >
                View Details
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(selectedAddress.pda_id)}
                className="btn-outline text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
