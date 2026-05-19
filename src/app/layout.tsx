import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prowider — Lead Distribution Platform',
  description: 'Intelligent lead distribution for service providers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Outfit', sans-serif" }}>{children}</body>
    </html>
  );
}