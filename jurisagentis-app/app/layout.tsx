/**
 * Root Layout - Provides authentication context and global styles
 */

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { ClientOnlyMobileSecurity } from '@/app/components/ClientOnlyMobileSecurity'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'JurisAgentis - Legal Practice Management',
    template: '%s | JurisAgentis'
  },
  description: 'Comprehensive legal practice management system with AI-powered assistance',
  keywords: [
    'legal practice management',
    'law firm software',
    'case management',
    'legal CRM',
    'attorney software',
    'legal billing',
    'document management',
    'court calendar'
  ],
  authors: [{ name: 'JurisAgentis Team' }],
  creator: 'JurisAgentis',
  publisher: 'JurisAgentis',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://app.jurisagentis.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.jurisagentis.com',
    title: 'JurisAgentis - Legal Practice Management',
    description: 'Comprehensive legal practice management system with AI-powered assistance',
    siteName: 'JurisAgentis',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JurisAgentis Legal Practice Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JurisAgentis - Legal Practice Management',
    description: 'Comprehensive legal practice management system with AI-powered assistance',
    images: ['/twitter-image.png'],
    creator: '@jurisagentis',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-title': 'JurisAgentis',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#6366f1' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="JurisAgentis" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JurisAgentis" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="icon" href="/favicon.ico" />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('SW registered'))
                    .catch(err => console.log('SW registration failed'));
                });
              }
              
              window.addEventListener('online', () => document.body.classList.remove('offline'));
              window.addEventListener('offline', () => document.body.classList.add('offline'));
              if (!navigator.onLine) document.body.classList.add('offline');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ClientOnlyMobileSecurity>
            {children}
          </ClientOnlyMobileSecurity>
        </AuthProvider>
      </body>
    </html>
  )
}