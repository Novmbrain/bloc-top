'use client'

import { useSyncExternalStore } from 'react'

/**
 * 响应式媒体查询 hook
 * SSR 安全 — 服务端默认返回 false（桌面端行为）
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)')
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
