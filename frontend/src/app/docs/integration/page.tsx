'use client';

import Link from 'next/link';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const codeExamples = {
  javascript: `// Install: npm install axios

import axios from 'axios';

const API_BASE = '${API_BASE}';
const API_KEY = 'xeeno_sk_your_api_key';

const client = axios.create({
  baseURL: \`\${API_BASE}/api/v1\`,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Search for an address
async function searchAddress(query) {
  const response = await client.post('/address/search', {
    query: query,
    limit: 10,
  });
  return response.data.results;
}

// Get address by PDA-ID
async function getAddress(pdaId) {
  const response = await client.get(\`/address/\${pdaId}\`);
  return response.data;
}

// Register a new address
async function registerAddress(data) {
  const response = await client.post('/address/register', {
    latitude: data.lat,
    longitude: data.lng,
    street_name: data.street,
    building_name: data.building,
    address_type: 'residential',
  });
  return response.data;
}

// Reverse geocode
async function reverseGeocode(lat, lng) {
  const response = await client.get('/address/location/resolve', {
    params: { lat, lon: lng, radius: 100 },
  });
  return response.data.address;
}`,

  python: `# Install: pip install requests

import requests

API_BASE = '${API_BASE}'
API_KEY = 'xeeno_sk_your_api_key'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
}

def search_address(query: str, limit: int = 10):
    """Search for addresses by text query."""
    response = requests.post(
        f'{API_BASE}/api/v1/address/search',
        headers=headers,
        json={'query': query, 'limit': limit}
    )
    response.raise_for_status()
    return response.json()['results']

def get_address(pda_id: str):
    """Get address details by PDA-ID."""
    response = requests.get(
        f'{API_BASE}/api/v1/address/{pda_id}',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def register_address(lat: float, lng: float, street: str = None, building: str = None):
    """Register a new address."""
    response = requests.post(
        f'{API_BASE}/api/v1/address/register',
        headers=headers,
        json={
            'latitude': lat,
            'longitude': lng,
            'street_name': street,
            'building_name': building,
            'address_type': 'residential',
        }
    )
    response.raise_for_status()
    return response.json()

def reverse_geocode(lat: float, lng: float, radius: int = 100):
    """Find nearest address to coordinates."""
    response = requests.get(
        f'{API_BASE}/api/v1/address/location/resolve',
        headers=headers,
        params={'lat': lat, 'lon': lng, 'radius': radius}
    )
    response.raise_for_status()
    return response.json().get('address')`,

  curl: `# Search for an address
curl -X POST '${API_BASE}/api/v1/address/search' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: xeeno_sk_your_api_key' \\
  -d '{"query": "123 Main Street", "limit": 10}'

# Get address by PDA-ID
curl '${API_BASE}/api/v1/address/SL-FRE-001-000001-A' \\
  -H 'X-API-Key: xeeno_sk_your_api_key'

# Register a new address
curl -X POST '${API_BASE}/api/v1/address/register' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: xeeno_sk_your_api_key' \\
  -d '{
    "latitude": 8.4657,
    "longitude": -13.2317,
    "street_name": "Siaka Stevens Street",
    "building_name": "State House",
    "address_type": "government"
  }'

# Reverse geocode (coordinates to address)
curl '${API_BASE}/api/v1/address/location/resolve?lat=8.4657&lon=-13.2317&radius=100' \\
  -H 'X-API-Key: xeeno_sk_your_api_key'

# Get postal zones as GeoJSON
curl '${API_BASE}/api/v1/geography/zones/geojson'`,
};

export default function IntegrationGuidePage() {
  const [activeTab, setActiveTab] = useState<'javascript' | 'python' | 'curl'>('javascript');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-xeeno-primary to-xeeno-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SL</span>
              </div>
              <span className="font-semibold text-slate-800">Xeeno Map</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Integration Guide</span>
          </div>
          <Link
            href="/docs/api"
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            API Reference
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Integration Guide</h1>
          <p className="text-xl text-slate-600">
            Integrate Xeeno Map&apos;s address system into your application in minutes.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Quick Start</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-xeeno-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xeeno-primary font-semibold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Get your API Key</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Log in to the admin dashboard and create an API key from the{' '}
                  <Link href="/admin/api-keys" className="text-xeeno-primary hover:underline">
                    API Keys section
                  </Link>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-xeeno-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xeeno-primary font-semibold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Add authentication header</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Include your API key in all requests:
                </p>
                <code className="block mt-2 px-4 py-2 bg-slate-100 rounded-lg font-mono text-sm">
                  X-API-Key: xeeno_sk_your_api_key
                </code>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-xeeno-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xeeno-primary font-semibold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Make your first request</h3>
                <p className="text-slate-600 text-sm mt-1">
                  Start with a simple address search to verify your integration works.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Code Examples</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {(['javascript', 'python', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-slate-50 text-xeeno-primary border-b-2 border-xeeno-primary'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {tab === 'javascript' ? 'JavaScript' : tab === 'python' ? 'Python' : 'cURL'}
                </button>
              ))}
            </div>
            {/* Code */}
            <div className="p-0">
              <pre className="p-6 bg-slate-900 text-slate-100 overflow-x-auto text-sm font-mono">
                <code>{codeExamples[activeTab]}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* PDA-ID Format */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Understanding PDA-IDs</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 mb-4">
              Every address in Sierra Leone is assigned a unique Physical Digital Address ID (PDA-ID).
              The format provides location context at a glance.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 font-mono text-center mb-4">
              <span className="text-red-600">SL</span>-
              <span className="text-blue-600">FRE</span>-
              <span className="text-green-600">001</span>-
              <span className="text-purple-600">000001</span>-
              <span className="text-orange-600">A</span>
            </div>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-red-600">SL</div>
                <div className="text-slate-500">Country</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">FRE</div>
                <div className="text-slate-500">District</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">001</div>
                <div className="text-slate-500">Zone</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">000001</div>
                <div className="text-slate-500">Sequence</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">A</div>
                <div className="text-slate-500">Check</div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Common Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">E-commerce Checkout</h3>
              <p className="text-slate-600 text-sm">
                Use address autocomplete to help customers quickly find their delivery address.
                Verify addresses to reduce failed deliveries.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Delivery Logistics</h3>
              <p className="text-slate-600 text-sm">
                Use reverse geocoding to convert driver GPS coordinates to addresses.
                Plan routes using zone-based clustering.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Property Management</h3>
              <p className="text-slate-600 text-sm">
                Register new properties with precise GPS coordinates. Generate unique PDA-IDs
                for property identification and documentation.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Map Integration</h3>
              <p className="text-slate-600 text-sm">
                Fetch postal zone boundaries as GeoJSON to display on maps.
                Show zone coverage and address density visualizations.
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Rate Limits</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-slate-600 mb-4">
              API requests are rate limited to ensure fair usage. Default limits:
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">60</div>
                <div className="text-sm text-slate-500">requests/minute</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">1,000</div>
                <div className="text-sm text-slate-500">requests/hour</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">10,000</div>
                <div className="text-sm text-slate-500">requests/day</div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Need higher limits? Contact us to discuss enterprise plans.
            </p>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Need Help?</h2>
          <div className="bg-gradient-to-r from-xeeno-primary to-xeeno-secondary rounded-xl p-6 text-white">
            <p className="mb-4">
              Having trouble with your integration? Our team is here to help.
            </p>
            <div className="flex gap-4">
              <Link
                href="/docs/api"
                className="px-4 py-2 bg-white text-xeeno-primary rounded-lg hover:bg-white/90 transition-colors text-sm font-medium"
              >
                View Full API Docs
              </Link>
              <a
                href="mailto:support@xeeno.sl"
                className="px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
