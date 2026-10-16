import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { RegisterServiceWorker } from '@/components/pwa/register-service-worker';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CVTEC Engineer CMS',
  description: 'Collaborative document management and review application.',
  applicationName: 'CVTEC Engineer CMS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CVTEC Engineer CMS',
  },
  // Add more metadata properties as needed
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  themeColor: 'light',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CVTEC Engineer CMS',
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
          {children}
          <Toaster closeButton richColors position="top-right" />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
