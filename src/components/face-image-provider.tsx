'use client'

import { createContext, useMemo } from 'react'
import { FaceImageCacheService } from '@/lib/face-image-cache'

/**
 * FaceImageCacheContext
 *
 * 全应用单例的岩面图片缓存服务
 * 所有组件通过此 Context 共享同一个缓存实例,
 * 确保 CRUD 失效事件能传播到所有消费者
 *
 * 默认值为 fallback 单例 (非 null),
 * 这样 useFaceImageCache() 永远返回可用实例,
 * 消除所有消费者中的 null 检查
 */
const defaultCache = new FaceImageCacheService()

export const FaceImageCacheContext = createContext<FaceImageCacheService>(defaultCache)

export function FaceImageProvider({ children }: { children: React.ReactNode }) {
  // 单例: useMemo 确保整个应用生命周期只创建一次
  const cache = useMemo(() => new FaceImageCacheService(), [])

  return (
    <FaceImageCacheContext.Provider value={cache}>
      {children}
    </FaceImageCacheContext.Provider>
  )
}
