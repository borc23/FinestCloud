/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure API routes are included in the build
  output: 'standalone',

  transpilePackages: ['geotiff'],

  webpack: (config, { isServer }) => {
    // Handle node modules that need special treatment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      stream: false,
      zlib: false,
      http: false,
      https: false,
      url: false,
      buffer: false,
    }

    // Ensure proper module resolution for geotiff dependencies
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure stream-browserify is used instead of stream polyfill
        stream: false,
      }
    }

    // Prevent build errors from circular dependencies in geotiff
    config.module = {
      ...config.module,
      exprContextCritical: false,
    }

    return config
  },
}

module.exports = nextConfig