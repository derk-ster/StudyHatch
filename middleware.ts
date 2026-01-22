import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_HOST = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
  : 'studyhatch.org';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1');
  const isPreview = host.endsWith('vercel.app');

  if (!isLocal && isPreview && host !== CANONICAL_HOST) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)'],
};
