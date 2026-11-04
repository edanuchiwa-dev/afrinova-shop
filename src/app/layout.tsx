import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import '@/styles/globals.css';
import ConsentBanner from '@/components/ConsentBanner';
import VisitorTracker from '@/components/VisitorTracker';

const headingFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Atelier Pro — Boutique Exclusive Bénin',
  description: 'Objets d’exception expédiés chez vous en 24h-48h partout au Bénin.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-[#FAF9F6] text-[#16171A] font-sans antialiased selection:bg-[#F2DFCE] selection:text-[#7A3E10]">
        <VisitorTracker />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
