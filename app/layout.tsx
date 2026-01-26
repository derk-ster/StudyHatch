import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import PWAProvider from '@/components/PWAProvider';
import BackgroundMusic from '@/components/BackgroundMusic';
import ComplianceBanner from '@/components/ComplianceBanner';
import ScrollRevealProvider from '@/components/ScrollRevealProvider';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const siteName = 'StudyHatch';
const siteDescription = 'StudyHatch helps students and teachers build vocabulary with flashcards, quizzes, and translation practice.';
const canonicalPath = basePath ? `${basePath}/` : '/';
const metadataBaseUrl = new URL(siteUrl);
const logoUrl = new URL(`${basePath}/WebsiteLogo.png`, metadataBaseUrl).toString();

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  verification: {
    google: 'nXAKPWVXLriMOLwWMEo31R59wbB2IguQ4orJ7Twalns',
  },
  title: {
    default: `${siteName} | Language Learning Flashcards`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    'language learning',
    'flashcards',
    'vocabulary practice',
    'translation practice',
    'spanish flashcards',
    'study tools',
  ],
  alternates: {
    canonical: canonicalPath,
  },
  manifest: `${basePath}/manifest.json`,
  themeColor: '#1e1b4b',
  appleWebApp: {
    capable: true,
    title: siteName,
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    url: canonicalPath,
    siteName,
    title: `${siteName} | Language Learning Flashcards`,
    description: siteDescription,
    images: [
      {
        url: `${basePath}/WebsiteLogo.png`,
        alt: `${siteName} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | Language Learning Flashcards`,
    description: siteDescription,
    images: [`${basePath}/WebsiteLogo.png`],
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-48.png`, type: 'image/png', sizes: '48x48' },
      { url: `${basePath}/icons/icon-192.png`, type: 'image/png', sizes: '192x192' },
      { url: `${basePath}/icon.png`, type: 'image/png' },
    ],
    shortcut: `${basePath}/icon.png`,
    apple: `${basePath}/icon.png`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteName,
              url: new URL(canonicalPath, metadataBaseUrl).toString(),
              description: siteDescription,
              publisher: {
                '@type': 'Organization',
                name: siteName,
                logo: {
                  '@type': 'ImageObject',
                  url: logoUrl,
                },
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <PWAProvider>
          <AuthProvider>
            <BackgroundMusic />
            <ScrollRevealProvider />
            <ComplianceBanner />
            {children}
          </AuthProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
