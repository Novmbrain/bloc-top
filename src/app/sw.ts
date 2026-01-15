import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// COS 图片缓存策略 - 优先使用缓存，缓存 30 天
const cosImageCache: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "topo-image-1305178596.cos.ap-guangzhou.myqcloud.com",
  handler: new CacheFirst({
    cacheName: "cos-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,           // 最多缓存 200 张图片
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天过期
        purgeOnQuotaError: true,   // 存储空间不足时自动清理
      }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [cosImageCache, ...defaultCache],
});

serwist.addEventListeners();
