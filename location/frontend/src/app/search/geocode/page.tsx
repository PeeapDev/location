'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { geocodeApi } from '@/lib/api';
import type { GeoCodeSearchResponse, GeoCodeAddress, GeoCodeAutocompleteItem } from '@/types/address';

// Valid Plus Code characters
const VALID_CHARS = '23456789CFGHJMPQRVWX';

export default function GeoCodeSearchPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoCodeAutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResult, setSearchResult] = useState<GeoCodeSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<GeoCodeAddress | null>(null);
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

  // Clear markers
  const clearMarkers = useCallback(() => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];
  }, []);

  // Filter input to valid Plus Code characters
  const filterInput = (value: string): string => {
    return value
      .toUpperCase()
      .split('')
      .filter((c) => VALID_CHARS.includes(c))
      .join('')
      .slice(0, 4);
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    const filtered = filterInput(value);
    setSearchQuery(filtered);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (filtered.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await geocodeApi.autocomplete(filtered, 10);
        setSuggestions(response.suggestions);
        setShowSuggestions(response.suggestions.length > 0);
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 150);
  };

  // Handle search
  const handleSearch = async (localCode?: string) => {
    const code = localCode || searchQuery;
    if (!code || code.length !== 4) {
      setError('Please enter exactly 4 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);
    setSelectedAddress(null);
    clearMarkers();

    try {
      const response = await geocodeApi.search(code, { limit: 100 });
      setSearchResult(response);
      setSearchQuery(response.local_code);

      // Add markers for addresses
      if (response.addresses.length > 0 && map.current) {
        const bounds = new maplibregl.LngLatBounds();

        response.addresses.forEach((addr) => {
          const marker = new maplibregl.Marker({
            color: addr.verification_status === 'verified' ? '#059669' : '#F59E0B',
          })
            .setLngLat([addr.longitude, addr.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-bold text-sm">${addr.display_address}</h3>
                  <p class="text-xs text-gray-600 mt-1">PDA-ID: ${addr.pda_id}</p>
                  <p class="text-xs text-gray-500">GeoCode: ${addr.plus_code_local}</p>
                </div>
              `)
            )
            .addTo(map.current!);

          markers.current.push(marker);
          bounds.extend([addr.longitude, addr.latitude]);
        });

        map.current.fitBounds(bounds, { padding: 50, maxZoom: 16 });
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.detail || 'Search failed');
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle address click
  const handleAddressClick = (addr: GeoCodeAddress) => {
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
          <h1 className="text-2xl font-bold mb-2">GeoCode Search</h1>
          <p className="text-gray-600 text-sm mb-4">
            Search by 4-digit Plus Code local identifier (e.g., VX22, CPH5).
          </p>

          {/* Valid Characters Hint */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-500 mb-1">Valid characters:</p>
            <p className="font-mono text-sm tracking-wider text-gray-700">
              {VALID_CHARS.split('').join(' ')}
            </p>
          </div>

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
                    placeholder="Enter 4-char code"
                    className="search-input w-full font-mono text-2xl text-center tracking-[0.3em] uppercase"
                    maxLength={4}
                    autoComplete="off"
                    style={{ letterSpacing: '0.3em' }}
                  />

                  {/* Character Count Indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {searchQuery.length}/4
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || searchQuery.length !== 4}
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
                    key={item.local_code}
                    onClick={() => {
                      setSearchQuery(item.local_code);
                      setShowSuggestions(false);
                      handleSearch(item.local_code);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-lg text-xeeno-primary tracking-wider">
                        {item.local_code}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.address_count} address{item.address_count !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {item.sample_address && (
                      <p className="text-sm text-gray-500 truncate mt-1">{item.sample_address}</p>
                    )}
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

          {/* Search Results */}
          {searchResult && (
            <div className="mt-6">
              {/* Result Header */}
              <div className="card bg-gradient-to-br from-green-600 to-emerald-600 text-white mb-4">
                <div className="text-center">
                  <p className="text-green-200 text-sm">GeoCode</p>
                  <p className="font-mono text-4xl font-bold tracking-widest">
                    {searchResult.local_code}
                  </p>
                </div>

                <div className="mt-4 flex justify-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-green-200">Addresses</p>
                    <p className="text-2xl font-bold">{searchResult.total_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-200">Query Time</p>
                    <p className="text-2xl font-bold">{searchResult.query_time_ms}ms</p>
                  </div>
                </div>
              </div>

              {/* Addresses List */}
              {searchResult.addresses.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-3">
                    Addresses ({searchResult.addresses.length})
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {searchResult.addresses.map((addr) => (
                      <div
                        key={addr.pda_id}
                        onClick={() => handleAddressClick(addr)}
                        className={`p-3 rounded-lg border cursor-pointer transition ${
                          selectedAddress?.pda_id === addr.pda_id
                            ? 'border-green-500 bg-green-50'
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
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>Zone: {addr.zone_code}</span>
                          <span>Confidence: {Math.round(addr.confidence_score * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="h-12 w-12 mx-auto mb-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
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
                  <p>No addresses found for this GeoCode</p>
                  <p className="text-sm mt-1">Try a different code</p>
                </div>
              )}
            </div>
          )}

          {/* Help Section */}
          {!searchResult && !error && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">What is a GeoCode?</h3>
              <p className="text-sm text-blue-700">
                A GeoCode is the 4-character local identifier extracted from a Plus Code.
                For example, in the Plus Code <span className="font-mono">6WQPVX22+5WX</span>,
                the GeoCode is <span className="font-mono font-bold">VX22</span>.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                GeoCodes help identify local areas within a ~1km region, making it easy
                to group and find nearby addresses.
              </p>
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
              <div className="flex justify-between">
                <span className="text-gray-500">GeoCode:</span>
                <span className="font-mono font-bold text-green-600">{selectedAddress.plus_code_local}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Zone:</span>
                <span>{selectedAddress.zone_code}</span>
              </div>
              {selectedAddress.plus_code && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Plus Code:</span>
                  <span className="font-mono text-xs">{selectedAddress.plus_code}</span>
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
