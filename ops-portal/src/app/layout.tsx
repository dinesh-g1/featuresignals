import type { Metadata } from 'next';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Ops Portal — FeatureSignals',
    default: 'Ops Portal — FeatureSignals',
  },
  description: 'FeatureSignals operations portal for managing tenants, cells, billing, and infrastructure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-bg-primary antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar — hidden on mobile, visible on desktop */}
            <div className="hidden lg:flex">
              <Sidebar />
            </div>

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:pl-60">
              <Topbar />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
