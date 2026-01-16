/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || `local-${Date.now()}`,
  },
  // Skip static generation for pages that use useSearchParams
  // These pages will be rendered dynamically at request time
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
