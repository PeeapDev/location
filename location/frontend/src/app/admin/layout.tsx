'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/Sidebar';
import { OfflineProvider } from '@/components/OfflineProvider';
import { OfflineStatusBar } from '@/components/OfflineStatusBar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAdmin>
      <OfflineProvider>
        <div className="flex min-h-screen bg-gray-50">
          {/* Sidebar */}
          <AdminSidebar />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Top bar with offline status */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200 px-8 py-3 flex justify-end">
              <OfflineStatusBar />
            </div>
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </OfflineProvider>
    </ProtectedRoute>
  );
}
