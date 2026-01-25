import { NextRequest, NextResponse } from 'next/server';

const getCanonicalHost = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return 'studyhatch.org';
  try {
    return new URL(raw).host || 'studyhatch.org';
  } catch (error) {
    return 'studyhatch.org';
  }
};

export function middleware(request: NextRequest) {
  try {
    const canonicalHost = getCanonicalHost();
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1');
    const isPreview = host.endsWith('vercel.app');

    if (!isLocal && isPreview && host !== canonicalHost) {
      const url = request.nextUrl.clone();
      url.host = canonicalHost;
      url.protocol = 'https:';
      return NextResponse.redirect(url, 308);
    }
  } catch (error) {
    // Fail open to avoid blocking requests if middleware throws.
    return NextResponse.next();
  }
  const response = NextResponse.next();
  if ((process.env.SCHOOL_MODE || '').toLowerCase() === 'true') {
    response.headers.set('x-school-mode', 'true');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)'],
};
