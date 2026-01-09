'use client';

import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { addressApi, zonesApi } from '@/lib/api';
import type { AddressSearchResult } from '@/types/address';

export default function SearchPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AddressSearchResult | null>(null);

  // Filters
  const [districts, setDistricts] = useState<{ district_name: string; region_name: string }[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);

  // Load districts
  useEffect(() => {
    zonesApi.listDistricts().then(setDistricts).catch(console.error);
  }, []);

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
      center: [-11.7799, 8.4606],
      zoom: 7,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Clear markers
  const clearMarkers = () => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];
  };

  // Add markers for results
  const addMarkersForResults = (addresses: AddressSearchResult[]) => {
    clearMarkers();
    if (!map.current) return;

    const bounds = new maplibregl.LngLatBounds();

    addresses.forEach((addr, index) => {
      const marker = new maplibregl.Marker({
        color: addr.confidence_score >= 0.8 ? '#059669' : addr.confidence_score >= 0.5 ? '#F59E0B' : '#EF4444',
      })
        .setLngLat([addr.longitude, addr.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold">${addr.display_address}</h3>
              <p class="text-sm text-gray-600">${addr.postal_code}</p>
              <p class="text-xs text-gray-500 mt-1">PDA-ID: ${addr.pda_id}</p>
            </div>
          `)
        )
        .addTo(map.current!);

      markers.current.push(marker);
      bounds.extend([addr.longitude, addr.latitude]);
    });

    if (addresses.length > 0) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  };

  // Handle search
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setSelectedResult(null);

    try {
      const filters: Record<string, any> = {};
      if (selectedDistrict) filters.district = selectedDistrict;
      if (minConfidence > 0) filters.min_confidence = minConfidence / 100;

      const response = await addressApi.search(searchQuery, { filters, limit: 50 });
      setResults(response.results);
      setTotalCount(response.total_count);
      addMarkersForResults(response.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle result click
  const handleResultClick = (result: AddressSearchResult) => {
    setSelectedResult(result);
    map.current?.flyTo({
      center: [result.longitude, result.latitude],
      zoom: 16,
      duration: 1500,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Search Panel */}
      <div className="lg:w-1/3 bg-white border-r overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Search Addresses</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by street, building, landmark, or PDA-ID..."
                className="search-input"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="search-input text-sm"
                >
                  <option value="">All Districts</option>
                  {districts.map((d) => (
                    <option key={d.district_name} value={d.district_name}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min. Confidence
                </label>
                <select
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="search-input text-sm"
                >
                  <option value={0}>Any</option>
                  <option value={50}>50%+</option>
                  <option value={70}>70%+</option>
                  <option value={90}>90%+</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results */}
          <div className="mt-6">
            {totalCount > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                Found {totalCount} result{totalCount !== 1 ? 's' : ''}
              </p>
            )}

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.pda_id}
                  onClick={() => handleResultClick(result)}
                  className={`card cursor-pointer border-2 transition ${
                    selectedResult?.pda_id === result.pda_id
                      ? 'border-xeeno-primary'
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <h3 className="font-semibold">{result.display_address}</h3>
                  <p className="text-sm text-gray-600">{result.district}, {result.region}</p>

                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="font-mono text-xs text-gray-500">{result.pda_id}</span>
                    <span
                      className={`font-medium ${
                        result.confidence_score >= 0.8
                          ? 'text-green-600'
                          : result.confidence_score >= 0.5
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.round(result.confidence_score * 100)}%
                    </span>
                  </div>

                  {result.distance_km !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      {result.distance_km.toFixed(1)} km away
                    </p>
                  )}
                </div>
              ))}

              {results.length === 0 && searchQuery && !isLoading && (
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
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p>No addresses found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="lg:w-2/3 h-64 lg:h-auto relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Selected Result Details */}
        {selectedResult && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 bg-white rounded-lg shadow-xl p-4">
            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="font-bold text-lg pr-6">{selectedResult.display_address}</h3>
            <p className="text-gray-600">{selectedResult.postal_code}</p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">PDA-ID:</span>
                <span className="font-mono text-xeeno-primary">{selectedResult.pda_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">District:</span>
                <span>{selectedResult.district}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Region:</span>
                <span>{selectedResult.region}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a href={`/address/${selectedResult.pda_id}`} className="btn-primary flex-1 text-center text-sm">
                View Details
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(selectedResult.pda_id)}
                className="btn-outline text-sm"
              >
                Copy ID
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
