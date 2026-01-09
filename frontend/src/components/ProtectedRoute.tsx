'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import type { UserRole } from '@/types/auth';
import { isAdminRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireAdmin = false,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser, refreshAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);

      // If we have tokens but no user, try to fetch user
      if (isAuthenticated && !user) {
        await fetchUser();
      }

      // If not authenticated, try to refresh
      if (!isAuthenticated) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          await fetchUser();
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, user, fetchUser, refreshAuth]);

  useEffect(() => {
    // Wait until initial check is complete
    if (isChecking || isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.push(redirectTo);
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdminRole(user.role)) {
      router.push('/unauthorized');
      return;
    }

    // Check specific role requirements
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }
  }, [isChecking, isLoading, isAuthenticated, user, allowedRoles, requireAdmin, router, redirectTo]);

  // Show loading state while checking auth
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-500">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or not authorized
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check authorization
  if (requireAdmin && !isAdminRole(user.role)) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  // All checks passed, render children
  return <>{children}</>;
}
