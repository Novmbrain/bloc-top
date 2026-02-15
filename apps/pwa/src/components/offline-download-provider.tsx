'use client'

/**
 * 离线下载 Context Provider
 *
 * 提供全局的离线下载状态管理，让所有岩场卡片共享同一个下载管理器
 * 这样可以：
 * 1. 避免每个卡片都初始化 Hook
 * 2. 统一管理下载队列和进度
 * 3. 保持下载状态在页面切换时不丢失
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useOfflineDownload, type UseOfflineDownloadReturn } from '@/hooks/use-offline-download'

const OfflineDownloadContext = createContext<UseOfflineDownloadReturn | null>(null)

export function OfflineDownloadProvider({ children }: { children: ReactNode }) {
  const offlineDownload = useOfflineDownload()

  return (
    <OfflineDownloadContext.Provider value={offlineDownload}>
      {children}
    </OfflineDownloadContext.Provider>
  )
}

/**
 * 使用离线下载 Context
 * 必须在 OfflineDownloadProvider 内使用
 */
export function useOfflineDownloadContext(): UseOfflineDownloadReturn {
  const context = useContext(OfflineDownloadContext)
  if (!context) {
    throw new Error('useOfflineDownloadContext must be used within OfflineDownloadProvider')
  }
  return context
}

/**
 * 安全地使用离线下载 Context
 * 如果不在 Provider 内，返回 null
 */
export function useOfflineDownloadContextSafe(): UseOfflineDownloadReturn | null {
  return useContext(OfflineDownloadContext)
}
