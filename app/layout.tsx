import './globals.css';
import 'react-loading-skeleton/dist/skeleton.css';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { RegisterServiceWorker } from '@/components/pwa/register-service-worker';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { OfflineStatus } from '@/components/pwa/offline-status';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CVTEC EDMS',
  description: 'Collaborative document management and review application.',
  applicationName: 'CVTEC EDMS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CVTEC EDMS',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#152a44' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1424' },
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CVTEC EDMS',
  url: 'https://cvtec-edms.vercel.app/',
  description: 'Collaborative document management and review application.',
  // Add more as needed
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={cn(
          'min-h-dvh',
          manrope.variable,
          manrope.className,
          jakarta.variable,
          jakarta.className,
          'antialiased',
          'font-sans',
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OfflineStatus />
          {children}
          <Toaster closeButton richColors position="top-right" />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
