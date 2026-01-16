'use client';

import { usePathname } from 'next/navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    // Admin routes - no nav/footer, just the content
    return <>{children}</>;
  }

  // Public routes - show nav and footer
  return (
    <>
      <nav className="bg-xeeno-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="flex items-center space-x-2">
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-xl font-bold">Xeeno Map</span>
              </a>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="/" className="hover:text-xeeno-accent transition">
                Home
              </a>
              <a href="/directory" className="hover:text-xeeno-accent transition">
                Directory
              </a>
              <a href="/search" className="hover:text-xeeno-accent transition">
                Search
              </a>
              <a href="/register" className="hover:text-xeeno-accent transition">
                Register Address
              </a>
              <a href="/admin" className="hover:text-xeeno-accent transition">
                Admin
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="bg-xeeno-dark text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Xeeno Map</h3>
              <p className="text-gray-400 text-sm">
                National Digital Postal Code and Address System for Sierra Leone.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/search" className="hover:text-white">Search Address</a></li>
                <li><a href="/register" className="hover:text-white">Register Address</a></li>
                <li><a href="/api" className="hover:text-white">API Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400 text-sm">
                For support and inquiries, contact the National Postal Address Authority.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Xeeno Map. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
