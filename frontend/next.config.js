/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure API routes are included in the build
  output: 'standalone',

  transpilePackages: ['geotiff'],

  webpack: (config) => {
    // Handle node modules that need special treatment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
      zlib: false,
    }
    return config
  },
}

module.exports = nextConfig