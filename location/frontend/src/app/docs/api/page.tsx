'use client';

import Link from 'next/link';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth?: 'none' | 'jwt' | 'api-key' | 'jwt-or-api-key';
  params?: { name: string; type: string; description: string; required?: boolean }[];
  response?: string;
}

interface Section {
  title: string;
  description: string;
  endpoints: Endpoint[];
}

const apiSections: Section[] = [
  {
    title: 'Address Search',
    description: 'Search and lookup addresses in the system.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/address/search',
        description: 'Search for addresses by text query with optional filters.',
        auth: 'none',
        params: [
          { name: 'query', type: 'string', description: 'Search query text', required: true },
          { name: 'filters', type: 'object', description: 'Filter by zone, district, type, etc.' },
          { name: 'location', type: 'object', description: 'Location bias {latitude, longitude}' },
          { name: 'limit', type: 'number', description: 'Max results (default: 10)' },
        ],
        response: '{ results: Address[], total: number, took_ms: number }',
      },
      {
        method: 'GET',
        path: '/api/v1/address/autocomplete',
        description: 'Get autocomplete suggestions for address search.',
        auth: 'none',
        params: [
          { name: 'q', type: 'string', description: 'Query string (min 3 chars)', required: true },
          { name: 'limit', type: 'number', description: 'Max suggestions (default: 5)' },
        ],
        response: '{ suggestions: AutocompleteSuggestion[] }',
      },
      {
        method: 'GET',
        path: '/api/v1/address/{pda_id}',
        description: 'Get address details by PDA-ID.',
        auth: 'none',
        params: [
          { name: 'pda_id', type: 'string', description: 'The unique PDA-ID', required: true },
        ],
        response: 'Address',
      },
      {
        method: 'GET',
        path: '/api/v1/address/location/resolve',
        description: 'Reverse geocode coordinates to find nearest address.',
        auth: 'none',
        params: [
          { name: 'lat', type: 'number', description: 'Latitude', required: true },
          { name: 'lon', type: 'number', description: 'Longitude', required: true },
          { name: 'radius', type: 'number', description: 'Search radius in meters (default: 50)' },
        ],
        response: '{ address: Address | null, distance_meters: number }',
      },
    ],
  },
  {
    title: 'Address Registration',
    description: 'Register new addresses in the system.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/address/register',
        description: 'Register a new address.',
        auth: 'jwt-or-api-key',
        params: [
          { name: 'latitude', type: 'number', description: 'GPS latitude', required: true },
          { name: 'longitude', type: 'number', description: 'GPS longitude', required: true },
          { name: 'street_name', type: 'string', description: 'Street name' },
          { name: 'building_name', type: 'string', description: 'Building or house name' },
          { name: 'address_type', type: 'string', description: 'Type: residential, commercial, etc.' },
          { name: 'landmarks', type: 'array', description: 'Nearby landmarks' },
        ],
        response: 'Address (with generated PDA-ID)',
      },
      {
        method: 'POST',
        path: '/api/v1/address/verify',
        description: 'Verify an existing address.',
        auth: 'jwt',
        params: [
          { name: 'pda_id', type: 'string', description: 'PDA-ID to verify', required: true },
          { name: 'provided_street', type: 'string', description: 'User-provided street name' },
        ],
        response: '{ verified: boolean, confidence_score: number }',
      },
    ],
  },
  {
    title: 'Zones & Geography',
    description: 'Access postal zone and geographic data.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/zones',
        description: 'List all postal zones.',
        auth: 'none',
        params: [
          { name: 'region', type: 'number', description: 'Filter by region ID' },
          { name: 'district', type: 'string', description: 'Filter by district code' },
          { name: 'limit', type: 'number', description: 'Max results' },
        ],
        response: '{ zones: PostalZone[], total_count: number }',
      },
      {
        method: 'GET',
        path: '/api/v1/zones/{zone_code}',
        description: 'Get zone details by code.',
        auth: 'none',
        params: [
          { name: 'zone_code', type: 'string', description: 'Zone code (e.g., FRE-001)', required: true },
          { name: 'include_geometry', type: 'boolean', description: 'Include zone boundary polygon' },
        ],
        response: 'PostalZone',
      },
      {
        method: 'GET',
        path: '/api/v1/geography/zones/geojson',
        description: 'Get all zones as GeoJSON for map display.',
        auth: 'none',
        params: [
          { name: 'district_id', type: 'number', description: 'Filter by district' },
          { name: 'region_id', type: 'number', description: 'Filter by region' },
        ],
        response: 'GeoJSON FeatureCollection',
      },
    ],
  },
  {
    title: 'Authentication',
    description: 'Authenticate and manage user sessions.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Authenticate and get access tokens.',
        auth: 'none',
        params: [
          { name: 'email', type: 'string', description: 'User email', required: true },
          { name: 'password', type: 'string', description: 'Password', required: true },
        ],
        response: '{ access_token: string, refresh_token: string, token_type: "bearer" }',
      },
      {
        method: 'POST',
        path: '/api/v1/auth/refresh',
        description: 'Refresh access token.',
        auth: 'none',
        params: [
          { name: 'refresh_token', type: 'string', description: 'Refresh token', required: true },
        ],
        response: '{ access_token: string, refresh_token: string }',
      },
      {
        method: 'GET',
        path: '/api/v1/auth/me',
        description: 'Get current authenticated user.',
        auth: 'jwt',
        response: 'User',
      },
    ],
  },
];

const methodColors = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

const authLabels = {
  'none': { label: 'Public', color: 'bg-gray-100 text-gray-600' },
  'jwt': { label: 'JWT', color: 'bg-purple-100 text-purple-600' },
  'api-key': { label: 'API Key', color: 'bg-orange-100 text-orange-600' },
  'jwt-or-api-key': { label: 'JWT or API Key', color: 'bg-indigo-100 text-indigo-600' },
};

export default function APIDocsPage() {
  const [activeSection, setActiveSection] = useState(apiSections[0].title);

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
            <span className="text-slate-600">API Documentation</span>
          </div>
          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-xeeno-primary text-white rounded-lg hover:bg-xeeno-primary/90 transition-colors text-sm"
          >
            Open Swagger UI
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Endpoints
              </p>
              {apiSections.map((section) => (
                <button
                  key={section.title}
                  onClick={() => setActiveSection(section.title)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === section.title
                      ? 'bg-xeeno-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {section.title}
                </button>
              ))}
              <div className="border-t border-slate-200 my-4"></div>
              <Link
                href="/docs/integration"
                className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Integration Guide
              </Link>
              <a
                href={`${API_BASE}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Swagger UI
              </a>
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {/* Base URL */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Base URL</h2>
              <code className="block px-4 py-3 bg-slate-900 text-green-400 rounded-lg font-mono text-sm">
                {API_BASE}
              </code>
              <p className="mt-3 text-sm text-slate-500">
                All API endpoints are prefixed with <code className="bg-slate-100 px-1.5 py-0.5 rounded">/api/v1</code>
              </p>
            </div>

            {/* Authentication Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Authentication</h2>
              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">JWT Token (for web apps)</h3>
                  <p>Include the token in the Authorization header:</p>
                  <code className="block mt-2 px-4 py-2 bg-slate-100 rounded-lg font-mono text-xs">
                    Authorization: Bearer your_access_token
                  </code>
                </div>
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">API Key (for server integrations)</h3>
                  <p>Include your API key in the X-API-Key header:</p>
                  <code className="block mt-2 px-4 py-2 bg-slate-100 rounded-lg font-mono text-xs">
                    X-API-Key: xeeno_sk_your_api_key
                  </code>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            {apiSections
              .filter((s) => s.title === activeSection)
              .map((section) => (
                <div key={section.title} className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">{section.title}</h1>
                    <p className="text-slate-600 mt-1">{section.description}</p>
                  </div>

                  {section.endpoints.map((endpoint, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${methodColors[endpoint.method]}`}>
                          {endpoint.method}
                        </span>
                        <code className="font-mono text-sm text-slate-800">{endpoint.path}</code>
                        {endpoint.auth && (
                          <span className={`ml-auto px-2 py-0.5 rounded text-xs ${authLabels[endpoint.auth].color}`}>
                            {authLabels[endpoint.auth].label}
                          </span>
                        )}
                      </div>
                      <div className="px-6 py-4">
                        <p className="text-slate-600 text-sm mb-4">{endpoint.description}</p>

                        {endpoint.params && endpoint.params.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-slate-800 mb-2">Parameters</h4>
                            <div className="bg-slate-50 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Name</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Type</th>
                                    <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.params.map((param) => (
                                    <tr key={param.name} className="border-b border-slate-100 last:border-0">
                                      <td className="px-4 py-2 font-mono text-xs">
                                        {param.name}
                                        {param.required && <span className="text-red-500">*</span>}
                                      </td>
                                      <td className="px-4 py-2 text-slate-500">{param.type}</td>
                                      <td className="px-4 py-2 text-slate-600">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {endpoint.response && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-800 mb-2">Response</h4>
                            <code className="block px-4 py-2 bg-slate-50 rounded-lg font-mono text-xs text-slate-700">
                              {endpoint.response}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </main>
        </div>
      </div>
    </div>
  );
}
