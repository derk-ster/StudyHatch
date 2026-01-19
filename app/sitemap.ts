import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    '/',
    '/spanish-flashcards',
    '/translation-practice',
    '/language-learning',
    '/public-decks',
    '/pricing',
    '/login',
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${basePath}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
