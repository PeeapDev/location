/**
 * API client for Xeeno Map backend
 */

import axios from 'axios';
import type {
  Address,
  AddressSearchResponse,
  AutocompleteResponse,
  AddressCreateRequest,
  ReverseGeocodeResponse,
  PostalZone,
} from '@/types/address';
import { useAuthStore } from './auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await useAuthStore.getState().refreshAuth();
      if (refreshed && error.config) {
        // Retry with new token
        error.config.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Address API
 */
export const addressApi = {
  /**
   * Search addresses by text query
   */
  search: async (
    query: string,
    options?: {
      filters?: Record<string, any>;
      location?: { latitude: number; longitude: number };
      limit?: number;
      offset?: number;
    }
  ): Promise<AddressSearchResponse> => {
    const response = await api.post('/address/search', {
      query,
      ...options,
    });
    return response.data;
  },

  /**
   * Get autocomplete suggestions
   */
  autocomplete: async (
    query: string,
    limit: number = 5
  ): Promise<AutocompleteResponse> => {
    const response = await api.get('/address/autocomplete', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Get address by PDA-ID
   */
  get: async (pdaId: string): Promise<Address> => {
    const response = await api.get(`/address/${pdaId}`);
    return response.data;
  },

  /**
   * Register a new address
   */
  register: async (data: AddressCreateRequest): Promise<Address> => {
    const response = await api.post('/address/register', data);
    return response.data;
  },

  /**
   * Verify an address
   */
  verify: async (
    pdaId: string,
    data?: {
      provided_street?: string;
      provided_block?: string;
      provided_postal_code?: string;
    }
  ) => {
    const response = await api.post('/address/verify', {
      pda_id: pdaId,
      ...data,
    });
    return response.data;
  },

  /**
   * Reverse geocode (coordinates to address)
   */
  reverseGeocode: async (
    latitude: number,
    longitude: number,
    radius: number = 50
  ): Promise<ReverseGeocodeResponse> => {
    const response = await api.get('/address/location/resolve', {
      params: { lat: latitude, lon: longitude, radius },
    });
    return response.data;
  },
};

/**
 * Postal Zones API
 */
export const zonesApi = {
  /**
   * List postal zones
   */
  list: async (options?: {
    region?: number;
    district?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ zones: PostalZone[]; total_count: number }> => {
    const response = await api.get('/zones', { params: options });
    return response.data;
  },

  /**
   * Get zone by code
   */
  get: async (
    zoneCode: string,
    includeGeometry: boolean = false
  ): Promise<PostalZone> => {
    const response = await api.get(`/zones/${zoneCode}`, {
      params: { include_geometry: includeGeometry },
    });
    return response.data;
  },

  /**
   * List regions
   */
  listRegions: async () => {
    const response = await api.get('/zones/regions');
    return response.data;
  },

  /**
   * List districts
   */
  listDistricts: async (region?: number) => {
    const response = await api.get('/zones/districts', {
      params: region ? { region } : {},
    });
    return response.data;
  },

  /**
   * Get addresses in a zone
   */
  getAddresses: async (
    zoneCode: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    const response = await api.get(`/zones/${zoneCode}/addresses`, {
      params: { limit, offset },
    });
    return response.data;
  },
};

/**
 * Geography API (Admin)
 */
export const geographyApi = {
  // Regions
  listRegions: async (params?: { page?: number; page_size?: number; is_active?: boolean }) => {
    const response = await api.get('/geography/regions', { params });
    return response.data;
  },

  createRegion: async (data: { name: string; short_code: string; description?: string }) => {
    const response = await api.post('/geography/regions', data);
    return response.data;
  },

  getRegion: async (id: number) => {
    const response = await api.get(`/geography/regions/${id}`);
    return response.data;
  },

  updateRegion: async (id: number, data: { name?: string; short_code?: string; description?: string; is_active?: boolean }) => {
    const response = await api.put(`/geography/regions/${id}`, data);
    return response.data;
  },

  deleteRegion: async (id: number) => {
    await api.delete(`/geography/regions/${id}`);
  },

  // Districts
  listDistricts: async (params?: { page?: number; page_size?: number; region_id?: number; is_active?: boolean }) => {
    const response = await api.get('/geography/districts', { params });
    return response.data;
  },

  createDistrict: async (data: {
    region_id: number;
    name: string;
    short_code: string;
    capital?: string;
    description?: string;
    population?: number;
    area_sq_km?: number;
  }) => {
    const response = await api.post('/geography/districts', data);
    return response.data;
  },

  getDistrict: async (id: number) => {
    const response = await api.get(`/geography/districts/${id}`);
    return response.data;
  },

  updateDistrict: async (id: number, data: {
    name?: string;
    short_code?: string;
    capital?: string;
    description?: string;
    population?: number;
    area_sq_km?: number;
    is_active?: boolean;
  }) => {
    const response = await api.put(`/geography/districts/${id}`, data);
    return response.data;
  },

  deleteDistrict: async (id: number) => {
    await api.delete(`/geography/districts/${id}`);
  },

  // Zones
  listZones: async (params?: { page?: number; page_size?: number; district_id?: number; region_id?: number; is_active?: boolean }) => {
    const response = await api.get('/geography/zones', { params });
    return response.data;
  },

  createZone: async (data: {
    district_id: number;
    name?: string;
    description?: string;
    zone_type?: string;
    geometry?: object;
    center_lat?: string;
    center_lng?: string;
  }) => {
    const response = await api.post('/geography/zones', data);
    return response.data;
  },

  getZone: async (id: number) => {
    const response = await api.get(`/geography/zones/${id}`);
    return response.data;
  },

  updateZone: async (id: number, data: {
    name?: string;
    description?: string;
    zone_type?: string;
    geometry?: object;
    center_lat?: string;
    center_lng?: string;
    is_active?: boolean;
  }) => {
    const response = await api.put(`/geography/zones/${id}`, data);
    return response.data;
  },

  deleteZone: async (id: number) => {
    await api.delete(`/geography/zones/${id}`);
  },

  // Stats and GeoJSON
  getStats: async () => {
    const response = await api.get('/geography/stats');
    return response.data;
  },

  getZonesGeoJSON: async (params?: { district_id?: number; region_id?: number }) => {
    // Use fetch directly to bypass auth interceptor - this is a public endpoint
    const url = new URL(`${API_BASE}/api/v1/geography/zones/geojson`);
    if (params?.district_id) url.searchParams.set('district_id', String(params.district_id));
    if (params?.region_id) url.searchParams.set('region_id', String(params.region_id));
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch zones GeoJSON');
    return response.json();
  },
};

/**
 * Users API (Admin)
 */
export const usersApi = {
  list: async (params?: { page?: number; page_size?: number; role?: string; status?: string; search?: string }) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  create: async (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role: string;
    assigned_region?: number;
    assigned_district?: string;
  }) => {
    const response = await api.post('/users', data);
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: {
    full_name?: string;
    phone?: string;
    role?: string;
    assigned_region?: number;
    assigned_district?: string;
  }) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  suspend: async (id: string, reason?: string) => {
    const response = await api.post(`/users/${id}/suspend`, { reason });
    return response.data;
  },

  activate: async (id: string) => {
    const response = await api.post(`/users/${id}/activate`);
    return response.data;
  },

  resetPassword: async (id: string) => {
    const response = await api.post(`/users/${id}/reset-password`);
    return response.data;
  },
};

/**
 * Audit Logs API (Admin)
 */
export const auditApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }) => {
    const response = await api.get('/audit/logs', { params });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/audit/summary');
    return response.data;
  },

  getSecurityAlerts: async (hours?: number) => {
    const response = await api.get('/audit/security/alerts', { params: { hours } });
    return response.data;
  },

  getFailedLogins: async (hours?: number, limit?: number) => {
    const response = await api.get('/audit/security/failed-logins', { params: { hours, limit } });
    return response.data;
  },

  getActions: async () => {
    const response = await api.get('/audit/actions');
    return response.data;
  },

  getResourceTypes: async () => {
    const response = await api.get('/audit/resource-types');
    return response.data;
  },
};

/**
 * API Keys API
 */
export const apiKeysApi = {
  list: async (params?: {
    user_id?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/api-keys', { params });
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    scopes?: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_hour?: number;
    rate_limit_per_day?: number;
    allowed_endpoints?: string[];
    allowed_ips?: string[];
    expires_in_days?: number;
  }, forUserId?: string) => {
    const params = forUserId ? { for_user_id: forUserId } : {};
    const response = await api.post('/api-keys', data, { params });
    return response.data;
  },

  get: async (keyId: string) => {
    const response = await api.get(`/api-keys/${keyId}`);
    return response.data;
  },

  getUsage: async (keyId: string) => {
    const response = await api.get(`/api-keys/${keyId}/usage`);
    return response.data;
  },

  revoke: async (keyId: string) => {
    const response = await api.delete(`/api-keys/${keyId}`);
    return response.data;
  },

  regenerate: async (keyId: string) => {
    const response = await api.post(`/api-keys/${keyId}/regenerate`);
    return response.data;
  },
};

/**
 * System Settings API (Admin)
 */
export const settingsApi = {
  list: async (category?: string) => {
    const response = await api.get('/settings', { params: { category } });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/settings/categories');
    return response.data;
  },

  get: async (key: string) => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },

  update: async (key: string, value: any) => {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  },

  create: async (data: { key: string; value: any; description?: string; category?: string }) => {
    const response = await api.post('/settings', data);
    return response.data;
  },

  delete: async (key: string) => {
    const response = await api.delete(`/settings/${key}`);
    return response.data;
  },

  bulkUpdate: async (settings: Record<string, any>) => {
    const response = await api.put('/settings/bulk', { settings });
    return response.data;
  },

  // Lockdown controls
  getLockdownStatus: async () => {
    const response = await api.get('/settings/lockdown/status');
    return response.data;
  },

  activateLockdown: async (reason: string) => {
    const response = await api.post('/settings/lockdown/activate', { reason });
    return response.data;
  },

  deactivateLockdown: async () => {
    const response = await api.post('/settings/lockdown/deactivate');
    return response.data;
  },

  initializeDefaults: async () => {
    const response = await api.post('/settings/initialize');
    return response.data;
  },
};

export default api;
