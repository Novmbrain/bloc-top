import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin, Strategy, type StrategyHandler } from "serwist";
import { SW_CACHE, OFFLINE_CACHE } from "@/lib/cache-config";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * 自定义图片缓存策略
 *
 * 优先级:
 * 1. 先检查离线下载缓存 (offline-crag-images)
 * 2. 再使用 CacheFirst 策略 (r2-images)
 *
 * 这样确保离线下载的图片在断网时可用
 */
class OfflineFirstImageStrategy extends Strategy {
  private cacheFirst: CacheFirst;

  constructor() {
    super({
      cacheName: "r2-images",
    });
    this.cacheFirst = new CacheFirst({
      cacheName: "r2-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: SW_CACHE.R2_IMAGES.maxEntries,
          maxAgeSeconds: SW_CACHE.R2_IMAGES.maxAgeSeconds,
          purgeOnQuotaError: true,
        }),
      ],
    });
  }

  async _handle(request: Request, handler: StrategyHandler): Promise<Response> {
    // 1. 先检查离线下载缓存
    const offlineCache = await caches.open(OFFLINE_CACHE.CACHE_NAME);
    const offlineResponse = await offlineCache.match(request);

    if (offlineResponse) {
      return offlineResponse;
    }

    // 2. 回退到 CacheFirst 策略
    return this.cacheFirst.handle({ request, event: handler.event });
  }
}

// R2 图片缓存策略 - 先检查离线缓存，再使用 CacheFirst
const r2ImageCache: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "img.bouldering.top",
  handler: new OfflineFirstImageStrategy(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [r2ImageCache, ...defaultCache],
});

serwist.addEventListeners();
