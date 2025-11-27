'use client';

import './globals.css';

import { DevTools } from '@/components/development/DevTools';
import { AppProviders } from '@/components/providers/AppProviders';
import { inter } from '@/config/fonts';
import { useAppInitialization } from '@/hooks/useAppInitialization';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  useAppInitialization();

  return (
    <html lang="es" style={{ backgroundColor: '' }}>
      <body className={inter.className}>
        <AppProviders>
          {children}
          <DevTools />
        </AppProviders>
      </body>
    </html>
  );
}
