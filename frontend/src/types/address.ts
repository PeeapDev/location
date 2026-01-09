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
