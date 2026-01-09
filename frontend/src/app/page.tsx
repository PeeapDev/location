'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addressApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { AutocompleteSuggestion, AddressSearchResult } from '@/types/address';
import Map from '@/components/Map';

export default function HomePage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quick admin login
  const handleQuickLogin = async () => {
    setLoginLoading(true);
    try {
      await login({ email: 'admin@xeeno.sl', password: 'Admin123!' });
      router.push('/admin');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Make sure the backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await addressApi.autocomplete(searchQuery);
        setSuggestions(response.suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.display);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const address = await addressApi.get(suggestion.pda_id);
      setSelectedAddress({
        pda_id: address.pda_id,
        postal_code: address.zone_code,
        display_address: address.display_address,
        street_name: address.street_name,
        district: '',
        region: '',
        latitude: address.latitude,
        longitude: address.longitude,
        confidence_score: address.confidence_score,
        match_score: 1,
      });
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      {/* Hero Section with Search */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <div
          className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
              Xeeno Map
            </h1>
            <p className="text-slate-600">
              Sierra Leone's Digital Address System
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-xeeno-primary to-xeeno-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search for an address, street, or PDA-ID..."
                  className="w-full px-6 py-4 bg-white rounded-xl shadow-lg border-0 focus:ring-2 focus:ring-xeeno-primary/50 outline-none text-slate-700 placeholder-slate-400 transition-shadow duration-300"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-xeeno-primary rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fadeIn">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.pda_id}
                    className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="font-medium text-slate-800">{suggestion.display}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{suggestion.postal_code}</span>
                      <span>{suggestion.district}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {mounted && <Map showBoundary={true} restrictToSierraLeone={true} />}
      </div>

      {/* Selected Address Panel */}
      {selectedAddress && (
        <div
          className="absolute bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white rounded-2xl shadow-2xl p-6 z-20 animate-slideUp"
        >
          <button
            onClick={() => setSelectedAddress(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-xeeno-primary to-xeeno-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800">{selectedAddress.display_address}</h3>
              <p className="text-slate-500">{selectedAddress.postal_code}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">PDA-ID</span>
              <span className="font-mono text-xeeno-primary font-medium">{selectedAddress.pda_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Confidence</span>
              <span className={`font-medium ${
                selectedAddress.confidence_score >= 0.8 ? 'text-green-600' :
                selectedAddress.confidence_score >= 0.5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(selectedAddress.confidence_score * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Coordinates</span>
              <span className="font-mono text-xs text-slate-600">
                {selectedAddress.latitude.toFixed(6)}, {selectedAddress.longitude.toFixed(6)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigator.clipboard.writeText(selectedAddress.pda_id)}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Copy PDA-ID
            </button>
            <a
              href={`/address/${selectedAddress.pda_id}`}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-xeeno-primary to-xeeno-secondary text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium text-center"
            >
              View Details
            </a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className={`absolute bottom-8 left-4 z-20 hidden md:block transition-all duration-700 delay-300 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 space-y-1">
          <a
            href="/register"
            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Register Address</p>
              <p className="text-xs text-slate-500">Add a new location</p>
            </div>
          </a>
          <a
            href="/search"
            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Advanced Search</p>
              <p className="text-xs text-slate-500">Filter by zone, type</p>
            </div>
          </a>
          <div className="border-t border-slate-100 my-2"></div>
          <button
            onClick={handleQuickLogin}
            disabled={loginLoading || authLoading}
            className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors group w-full disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              ) : (
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <p className="font-medium">Admin Dashboard</p>
              <p className="text-xs text-slate-500">{loginLoading ? 'Logging in...' : 'Quick access'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        className={`absolute bottom-8 right-4 z-10 hidden lg:block transition-all duration-700 delay-500 ${
          mounted && !selectedAddress ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-6 py-4 flex items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">5</p>
            <p className="text-xs text-slate-500">Regions</p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">16</p>
            <p className="text-xs text-slate-500">Districts</p>
          </div>
          <div className="w-px h-10 bg-slate-200"></div>
          <div className="text-center">
            <p className="text-2xl font-bold text-xeeno-primary">Live</p>
            <p className="text-xs text-slate-500">System Status</p>
          </div>
        </div>
      </div>

      {/* Mobile Admin Button */}
      <button
        onClick={handleQuickLogin}
        disabled={loginLoading || authLoading}
        className={`fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-300 disabled:opacity-50 ${
          mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {loginLoading ? (
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo and Copyright */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-xeeno-primary to-xeeno-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SL</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Xeeno Map</p>
                <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} Sierra Leone Digital Address System</p>
              </div>
            </div>

            {/* Developer Links */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                <a
                  href="/docs/api"
                  className="text-slate-600 hover:text-xeeno-primary transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  API Docs
                </a>
                <a
                  href="/docs/integration"
                  className="text-slate-600 hover:text-xeeno-primary transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Integration Guide
                </a>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-xeeno-primary transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Swagger
                </a>
              </div>
              <div className="hidden md:block w-px h-6 bg-slate-200"></div>
              <div className="flex items-center gap-4 text-sm">
                <a href="/about" className="text-slate-500 hover:text-slate-700 transition-colors">
                  About
                </a>
                <a href="/contact" className="text-slate-500 hover:text-slate-700 transition-colors">
                  Contact
                </a>
                <a href="/privacy" className="text-slate-500 hover:text-slate-700 transition-colors">
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
