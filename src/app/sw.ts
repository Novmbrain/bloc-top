import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin } from "serwist";
import { SW_CACHE } from "@/lib/cache-config";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// COS 图片缓存策略 - 优先使用缓存
const cosImageCache: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "topo-image-1305178596.cos.ap-guangzhou.myqcloud.com",
  handler: new CacheFirst({
    cacheName: "cos-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: SW_CACHE.COS_IMAGES.maxEntries,
        maxAgeSeconds: SW_CACHE.COS_IMAGES.maxAgeSeconds,
        purgeOnQuotaError: true,
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
