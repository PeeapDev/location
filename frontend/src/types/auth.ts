/**
 * Authentication and user types for Xeeno Map
 */

// User roles in hierarchical order
export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'business'
  | 'delivery_agent'
  | 'data_collector';

// User account status
export type UserStatus = 'active' | 'suspended' | 'pending';

// User model
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  assigned_region?: number;
  assigned_district?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

// Extended user info returned from /auth/me
export interface CurrentUser extends User {
  is_superadmin: boolean;
  is_admin_or_above: boolean;
  permissions: string[];
}

// Auth tokens
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Password change request
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// User creation (admin)
export interface UserCreateRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  assigned_region?: number;
  assigned_district?: string;
}

// User update (admin)
export interface UserUpdateRequest {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  assigned_region?: number;
  assigned_district?: string;
}

// User list response
export interface UserListResponse {
  users: User[];
  total_count: number;
  limit: number;
  offset: number;
}

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrator',
  business: 'Business User',
  delivery_agent: 'Delivery Agent',
  data_collector: 'Data Collector',
};

// Status display names and colors
export const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'green' },
  suspended: { label: 'Suspended', color: 'red' },
  pending: { label: 'Pending', color: 'yellow' },
};

// Status display names (simple mapping)
export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  pending: 'Pending',
};

// Check if a role has admin privileges
export function isAdminRole(role: UserRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

// Check if a role can manage other users
export function canManageUsers(role: UserRole): boolean {
  return role === 'superadmin';
}

// Check if a role can approve addresses
export function canApproveAddresses(role: UserRole): boolean {
  return role === 'superadmin' || role === 'admin';
}
