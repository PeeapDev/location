/**
 * Type definitions for Xeeno Map address system
 */

export interface Location {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
}

export interface Address {
  pda_id: string;
  zone_code: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  plus_code?: string;
  plus_code_short?: string;
  plus_code_local?: string; // 4-char local code (e.g., "VX22")
  street_name?: string;
  block?: string;
  house_number?: string;
  building_name?: string;
  floor?: string;
  unit?: string;
  landmark_primary?: string;
  landmark_secondary?: string;
  delivery_instructions?: string;
  access_notes?: string;
  address_type: AddressType;
  contact_phone?: string;
  confidence_score: number;
  verification_status: VerificationStatus;
  display_address: string;
  created_at: string;
  updated_at: string;
}

export type AddressType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'government'
  | 'institutional'
  | 'mixed';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'deprecated';

export interface AddressSearchResult {
  pda_id: string;
  postal_code: string;
  plus_code?: string;
  display_address: string;
  street_name?: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  confidence_score: number;
  distance_km?: number;
  match_score: number;
}

export interface AddressSearchResponse {
  results: AddressSearchResult[];
  total_count: number;
  query_time_ms: number;
}

export interface AutocompleteSuggestion {
  display: string;
  pda_id: string;
  postal_code: string;
  plus_code?: string;
  district: string;
  match_type: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
  query_time_ms: number;
}

export interface PostalZone {
  zone_code: string;
  primary_code: string;
  segment: string;
  region_code: number;
  region_name: string;
  district_code: number;
  district_name: string;
  zone_name?: string;
  segment_type: string;
  address_count?: number;
  created_at: string;
  geometry?: any; // GeoJSON
}

export interface AddressCreateRequest {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  street_name?: string;
  block?: string;
  house_number?: string;
  building_name?: string;
  floor?: string;
  unit?: string;
  landmark_primary?: string;
  landmark_secondary?: string;
  delivery_instructions?: string;
  access_notes?: string;
  address_type?: AddressType;
  contact_phone?: string;
}

export interface ReverseGeocodeResponse {
  exact_match?: NearbyAddress;
  nearest_addresses: NearbyAddress[];
  zone?: ZoneInfo;
}

export interface NearbyAddress {
  pda_id: string;
  postal_code: string;
  display_address: string;
  distance_m: number;
  bearing?: string;
  latitude: number;
  longitude: number;
}

export interface ZoneInfo {
  postal_code: string;
  zone_name?: string;
  district: string;
  region: string;
}

// Plus Code (Open Location Code) types
export interface PlusCodeEncodeRequest {
  latitude: number;
  longitude: number;
  precision?: 10 | 11 | 12;
}

export interface PlusCodeEncodeResponse {
  plus_code: string;
  latitude: number;
  longitude: number;
  precision_meters: [number, number];
}

export interface PlusCodeDecodeRequest {
  plus_code: string;
  reference_latitude?: number;
  reference_longitude?: number;
}

export interface PlusCodeDecodeResponse {
  plus_code: string;
  latitude: number;
  longitude: number;
  latitude_lo: number;
  latitude_hi: number;
  longitude_lo: number;
  longitude_hi: number;
  is_full: boolean;
  is_short: boolean;
}

// ============================================================================
// POI (Point of Interest) Types
// ============================================================================

export type POICategory =
  | 'healthcare'
  | 'education'
  | 'government'
  | 'finance'
  | 'food'
  | 'shopping'
  | 'tourism'
  | 'transport'
  | 'religious'
  | 'utilities'
  | 'other';

export interface POI {
  id: number;
  osm_id?: number;
  osm_type?: string;
  name?: string;
  name_local?: string;
  category: POICategory;
  subcategory?: string;
  latitude: number;
  longitude: number;
  plus_code?: string;
  plus_code_short?: string;
  zone_code?: string;
  street_name?: string;
  house_number?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  tags?: Record<string, any>;
  display_name?: string;
  district_name?: string;
  region_name?: string;
}

export interface POIWithDistance extends POI {
  distance_m: number;
}

export interface POIListResponse {
  pois: POI[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface POINearbyResponse {
  pois: POIWithDistance[];
  total_count: number;
  center: { latitude: number; longitude: number };
  radius_m: number;
}

export interface POICategoryCount {
  category: string;
  count: number;
  subcategories?: { subcategory: string; count: number }[];
}

export interface POICategoriesResponse {
  categories: POICategoryCount[];
  total_pois: number;
}

export interface POIZoneResponse {
  zone_code: string;
  zone_name?: string;
  district: string;
  region: string;
  total_count: number;
  page: number;
  page_size: number;
  pois_by_category: Record<string, POI[]>;
  pois: POI[];
}

// ============================================================================
// GeoCode (Plus Code Local) Search Types
// ============================================================================

export interface GeoCodeAddress {
  pda_id: string;
  zone_code: string;
  latitude: number;
  longitude: number;
  plus_code?: string;
  plus_code_local?: string;
  street_name?: string;
  building_name?: string;
  landmark_primary?: string;
  display_address: string;
  confidence_score: number;
  verification_status: string;
}

export interface GeoCodeSearchResponse {
  local_code: string;
  addresses: GeoCodeAddress[];
  total_count: number;
  query_time_ms: number;
}

export interface GeoCodeAutocompleteItem {
  local_code: string;
  address_count: number;
  sample_address?: string;
}

export interface GeoCodeAutocompleteResponse {
  suggestions: GeoCodeAutocompleteItem[];
  query_time_ms: number;
}

// ============================================================================
// Postal Code Search Types
// ============================================================================

export interface PostalAddressItem {
  pda_id: string;
  latitude: number;
  longitude: number;
  display_address: string;
  plus_code?: string;
  plus_code_local?: string;
  confidence_score: number;
  verification_status: string;
}

export interface PostalCodeDetailsResponse {
  zone_code: string;
  primary_code: string;
  segment: string;
  zone_name?: string;
  district_name: string;
  region_name: string;
  segment_type: string;
  center_lat?: number;
  center_lng?: number;
  plus_code?: string;
  plus_code_local?: string;
  address_count: number;
  addresses: PostalAddressItem[];
  geometry?: string; // GeoJSON string
  query_time_ms: number;
}

export interface PostalCodeAutocompleteItem {
  zone_code: string;
  zone_name?: string;
  district_name: string;
  address_count: number;
}

export interface PostalCodeAutocompleteResponse {
  suggestions: PostalCodeAutocompleteItem[];
  query_time_ms: number;
}
