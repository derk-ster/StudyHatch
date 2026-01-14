/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip static generation for pages that use useSearchParams
  // These pages will be rendered dynamically at request time
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
