/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  turbopack: {},
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  reactCompiler: false,
}

export default nextConfig
