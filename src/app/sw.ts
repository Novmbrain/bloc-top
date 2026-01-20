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

// R2 图片缓存策略 - 优先使用缓存
const r2ImageCache: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "img.bouldering.top",
  handler: new CacheFirst({
    cacheName: "r2-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: SW_CACHE.R2_IMAGES.maxEntries,
        maxAgeSeconds: SW_CACHE.R2_IMAGES.maxAgeSeconds,
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
  runtimeCaching: [r2ImageCache, ...defaultCache],
});

serwist.addEventListeners();
