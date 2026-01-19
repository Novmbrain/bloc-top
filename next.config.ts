import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { IMAGE_CACHE } from "./src/lib/cache-config";

const isDev = process.env.NODE_ENV !== "production";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
});

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "topo-image-1305178596.cos.ap-guangzhou.myqcloud.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: IMAGE_CACHE.MINIMUM_TTL,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://webapi.amap.com https://*.amap.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://topo-image-1305178596.cos.ap-guangzhou.myqcloud.com https://restapi.amap.com https://*.amap.com https://*.is.autonavi.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// 开发环境：直接导出配置（使用 Turbopack，无 webpack 配置）
// 生产环境：用 withSerwist 包装（启用 Service Worker，需要 webpack）
export default isDev ? nextConfig : withSerwist(nextConfig);
