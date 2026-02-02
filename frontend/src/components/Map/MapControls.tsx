'use client';

import { useMapContext } from '@/contexts/MapContext';

interface MapControlsProps {
  className?: string;
}

export default function MapControls({ className = '' }: MapControlsProps) {
  const {
    provider,
    setProvider,
    showPlusCodeGrid,
    setShowPlusCodeGrid,
    isGoogleMapsLoaded,
  } = useMapContext();

  return (
    <div className={`bg-white rounded-lg shadow-lg p-2 ${className}`}>
      {/* Provider Toggle */}
      <div className="flex items-center gap-1 mb-2 pb-2 border-b border-gray-100">
        <button
          onClick={() => setProvider('maplibre')}
          className={`px-3 py-1.5 text-sm rounded transition ${
            provider === 'maplibre'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="OpenStreetMap tiles"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            OSM
          </span>
        </button>
        <button
          onClick={() => setProvider('google')}
          disabled={!isGoogleMapsLoaded}
          className={`px-3 py-1.5 text-sm rounded transition ${
            provider === 'google'
              ? 'bg-blue-600 text-white'
              : isGoogleMapsLoaded
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
          title={isGoogleMapsLoaded ? 'Google Maps' : 'Google Maps not available'}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            Google
          </span>
        </button>
      </div>

      {/* Plus Code Grid Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Plus Code Grid</span>
        <button
          onClick={() => setShowPlusCodeGrid(!showPlusCodeGrid)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            showPlusCodeGrid ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              showPlusCodeGrid ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
