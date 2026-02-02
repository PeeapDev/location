'use client';

/**
 * Address Registration Component
 *
 * Allows users to:
 * - Get current GPS location
 * - Enter coordinates manually
 * - Search for a location
 * - Fill in address details
 * - Register new address with Plus Code precision
 */

import { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RegistrationResult {
  pda_id: string;
  zone_code: string;
  plus_code: string;
  plus_code_short: string;
  display_address: string;
  verification_status: string;
}

interface AddressFormData {
  latitude: string;
  longitude: string;
  street_name: string;
  house_number: string;
  building_name: string;
  landmark_primary: string;
  landmark_secondary: string;
  address_type: string;
  contact_phone: string;
  delivery_instructions: string;
}

export default function AddressRegistration() {
  const [formData, setFormData] = useState<AddressFormData>({
    latitude: '',
    longitude: '',
    street_name: '',
    house_number: '',
    building_name: '',
    landmark_primary: '',
    landmark_secondary: '',
    address_type: 'residential',
    contact_phone: '',
    delivery_instructions: '',
  });

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState('');
  const [plusCodePreview, setPlusCodePreview] = useState('');

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(7);
        const lng = position.coords.longitude.toFixed(7);

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));

        // Get Plus Code preview
        try {
          const response = await fetch(`${API_BASE}/api/v1/address/pluscode/encode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
              precision: 11
            })
          });
          if (response.ok) {
            const data = await response.json();
            setPlusCodePreview(data.plus_code);
          }
        } catch (e) {
          console.error('Failed to get Plus Code preview:', e);
        }

        setIsGettingLocation(false);
      },
      (err) => {
        setError(`Failed to get location: ${err.message}`);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  // Update Plus Code preview when coordinates change
  const updatePlusCodePreview = useCallback(async (lat: string, lng: string) => {
    if (!lat || !lng) {
      setPlusCodePreview('');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/address/pluscode/encode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          precision: 11
        })
      });
      if (response.ok) {
        const data = await response.json();
        setPlusCodePreview(data.plus_code);
      }
    } catch (e) {
      setPlusCodePreview('');
    }
  }, []);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Update Plus Code preview when coordinates change
    if (name === 'latitude' || name === 'longitude') {
      const lat = name === 'latitude' ? value : formData.latitude;
      const lng = name === 'longitude' ? value : formData.longitude;
      updatePlusCodePreview(lat, lng);
    }
  };

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        street_name: formData.street_name || undefined,
        house_number: formData.house_number || undefined,
        building_name: formData.building_name || undefined,
        landmark_primary: formData.landmark_primary || undefined,
        landmark_secondary: formData.landmark_secondary || undefined,
        address_type: formData.address_type,
        contact_phone: formData.contact_phone || undefined,
        delivery_instructions: formData.delivery_instructions || undefined,
      };

      const response = await fetch(`${API_BASE}/api/v1/address/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      setResult(data);

      // Clear form on success
      setFormData({
        latitude: '',
        longitude: '',
        street_name: '',
        house_number: '',
        building_name: '',
        landmark_primary: '',
        landmark_secondary: '',
        address_type: 'residential',
        contact_phone: '',
        delivery_instructions: '',
      });
      setPlusCodePreview('');

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Result */}
      {result && (
        <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-500 rounded-full text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-800">Address Registered!</h3>
              <p className="text-green-700 mt-1">{result.display_address}</p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">PDA-ID</div>
                  <div className="font-mono text-lg font-bold text-indigo-600">{result.pda_id}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Plus Code</div>
                  <div className="font-mono text-lg font-bold text-indigo-600">{result.plus_code}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Zone Code</div>
                  <div className="font-mono text-lg font-bold">{result.zone_code}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
                  <div className="text-lg font-medium capitalize">{result.verification_status}</div>
                </div>
              </div>

              <button
                onClick={() => setResult(null)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Register Another Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {!result && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Register New Address</h2>
            <p className="text-gray-600 mt-1">Get a unique postal ID for any location</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Location Section */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location (Required)
            </h3>

            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full mb-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center justify-center gap-2"
            >
              {isGettingLocation ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Getting Location...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Use My Current Location
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="e.g., 8.4657"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="e.g., -13.2317"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Plus Code Preview */}
            {plusCodePreview && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Plus Code Preview</div>
                <div className="font-mono text-xl font-bold text-indigo-600">{plusCodePreview}</div>
                <div className="text-xs text-gray-500 mt-1">~3m x 3m precision</div>
              </div>
            )}
          </div>

          {/* Address Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Address Details (Optional)</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                <input
                  type="text"
                  name="street_name"
                  value={formData.street_name}
                  onChange={handleChange}
                  placeholder="e.g., Siaka Stevens Street"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                <input
                  type="text"
                  name="house_number"
                  value={formData.house_number}
                  onChange={handleChange}
                  placeholder="e.g., 15A"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Building Name</label>
              <input
                type="text"
                name="building_name"
                value={formData.building_name}
                onChange={handleChange}
                placeholder="e.g., Zenith House, State House"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Landmark</label>
                <input
                  type="text"
                  name="landmark_primary"
                  value={formData.landmark_primary}
                  onChange={handleChange}
                  placeholder="e.g., Near Cotton Tree"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Landmark</label>
                <input
                  type="text"
                  name="landmark_secondary"
                  value={formData.landmark_secondary}
                  onChange={handleChange}
                  placeholder="e.g., Opposite Police Station"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
                <select
                  name="address_type"
                  value={formData.address_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="government">Government</option>
                  <option value="institutional">Institutional</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="e.g., +232 76 123456"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
              <textarea
                name="delivery_instructions"
                value={formData.delivery_instructions}
                onChange={handleChange}
                placeholder="e.g., Ring bell twice, ask for security at gate"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.latitude || !formData.longitude}
            className="w-full py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Registering...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Register Address
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Your address will be assigned a unique PDA-ID and Plus Code for precise delivery
          </p>
        </form>
      )}
    </div>
  );
}
