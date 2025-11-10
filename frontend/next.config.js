/** @type {import('next').NextConfig} */
const nextConfig = {
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