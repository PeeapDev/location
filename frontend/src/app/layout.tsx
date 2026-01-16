import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Xeeno Map - Sierra Leone National Address System',
  description: 'National Digital Postal Code and Address System for Sierra Leone',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {googleMapsKey && googleMapsKey !== 'YOUR_GOOGLE_API_KEY_HERE' && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places,geometry`}
            strategy="beforeInteractive"
          />
        )}
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
