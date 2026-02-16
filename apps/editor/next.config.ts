import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.bouldering.top' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  transpilePackages: ['@bloctop/shared', '@bloctop/ui'],
}

export default nextConfig
