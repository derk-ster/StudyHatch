/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || `local-${Date.now()}`,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  async redirects() {
    if (!basePath) {
      return [];
    }

    return [
      {
        source: '/',
        destination: basePath,
        permanent: false,
        basePath: false,
      },
    ];
  },
  // Skip static generation for pages that use useSearchParams
  // These pages will be rendered dynamically at request time
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
