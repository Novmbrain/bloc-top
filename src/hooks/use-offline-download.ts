'use client'

/**
 * 离线下载管理 Hook
 *
 * 提供岩场离线下载的完整功能:
 * - 下载岩场数据和图片
 * - 管理下载状态和进度
 * - 查询已下载的岩场列表
 * - 删除已下载的数据
 */

import { useState, useCallback } from 'react'
import type { Crag, Route, DownloadProgress, OfflineCragMeta } from '@/types'
import {
  saveCragOffline,
  getCragOffline,
  deleteCragOffline,
  isOfflineAvailable,
  getMeta,
  collectImageUrls,
  prefetchImages,
  deleteImages,
  generateVersion,
  isIndexedDBSupported,
} from '@/lib/offline-storage'

export interface UseOfflineDownloadReturn {
  // 状态
  offlineCrags: OfflineCragMeta[]           // 已下载的岩场列表
  downloadProgress: DownloadProgress | null  // 当前下载进度
  isSupported: boolean                       // 是否支持离线功能

  // 操作
  downloadCrag: (crag: Crag, routes: Route[]) => Promise<void>
  deleteCrag: (cragId: string, crag?: Crag, routes?: Route[]) => Promise<void>
  isDownloaded: (cragId: string) => boolean

  // 辅助
  refreshList: () => void
}

/**
 * 从 localStorage 元数据加载已下载岩场列表 (纯函数)
 */
function loadOfflineCrags(): OfflineCragMeta[] {
  try {
    const meta = getMeta()
    const list: OfflineCragMeta[] = Object.entries(meta.crags).map(
      ([cragId, data]) => ({
        cragId,
        cragName: data.cragName,
        routeCount: data.routeCount,
        downloadedAt: data.downloadedAt,
        imageCount: data.imageCount,
      })
    )
    // 按下载时间倒序
    list.sort((a, b) =>
      new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    )
    return list
  } catch {
    return []
  }
}

/**
 * 离线下载管理 Hook
 */
export function useOfflineDownload(): UseOfflineDownloadReturn {
  // 检查 IndexedDB 支持 (初始化时同步检查)
  const [isSupported] = useState(() => isIndexedDBSupported())

  // 使用惰性初始化加载已下载岩场列表 (避免 useEffect 中的 setState)
  const [offlineCrags, setOfflineCrags] = useState<OfflineCragMeta[]>(() =>
    isIndexedDBSupported() ? loadOfflineCrags() : []
  )
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  /**
   * 刷新已下载岩场列表
   */
  const refreshList = useCallback(() => {
    setOfflineCrags(loadOfflineCrags())
  }, [])

  /**
   * 检查岩场是否已下载
   */
  const isDownloaded = useCallback((cragId: string): boolean => {
    return isOfflineAvailable(cragId)
  }, [])

  /**
   * 下载岩场数据和图片
   */
  const downloadCrag = useCallback(async (crag: Crag, routes: Route[]) => {
    const cragId = crag.id

    // 设置初始进度
    const imageUrls = collectImageUrls(crag, routes)
    setDownloadProgress({
      cragId,
      status: 'downloading',
      totalImages: imageUrls.length,
      downloadedImages: 0,
    })

    try {
      // 1. 预取所有图片
      const downloadedCount = await prefetchImages(
        imageUrls,
        (downloaded, total) => {
          setDownloadProgress(prev => prev ? {
            ...prev,
            downloadedImages: downloaded,
            totalImages: total,
          } : null)
        }
      )

      // 2. 保存数据到 IndexedDB
      await saveCragOffline({
        cragId,
        crag,
        routes,
        downloadedAt: new Date().toISOString(),
        version: generateVersion(cragId),
        imageCount: downloadedCount,
      })

      // 3. 更新状态
      setDownloadProgress({
        cragId,
        status: 'completed',
        totalImages: imageUrls.length,
        downloadedImages: downloadedCount,
      })

      // 4. 刷新列表
      refreshList()

      // 5. 短暂延迟后清除进度 (让用户看到完成状态)
      setTimeout(() => {
        setDownloadProgress(prev =>
          prev?.cragId === cragId ? null : prev
        )
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下载失败'
      setDownloadProgress({
        cragId,
        status: 'failed',
        totalImages: imageUrls.length,
        downloadedImages: 0,
        error: errorMessage,
      })
    }
  }, [refreshList])

  /**
   * 删除岩场离线数据
   */
  const deleteCrag = useCallback(async (
    cragId: string,
    crag?: Crag,
    routes?: Route[]
  ) => {
    try {
      // 如果提供了 crag 和 routes，先删除缓存的图片
      if (crag && routes) {
        const imageUrls = collectImageUrls(crag, routes)
        await deleteImages(imageUrls)
      } else {
        // 尝试从 IndexedDB 获取数据来删除图片
        const stored = await getCragOffline(cragId)
        if (stored) {
          const imageUrls = collectImageUrls(stored.crag, stored.routes)
          await deleteImages(imageUrls)
        }
      }

      // 删除 IndexedDB 中的数据
      await deleteCragOffline(cragId)

      // 刷新列表
      refreshList()
    } catch (error) {
      console.error('Failed to delete offline crag:', error)
      throw error
    }
  }, [refreshList])

  return {
    offlineCrags,
    downloadProgress,
    isSupported,
    downloadCrag,
    deleteCrag,
    isDownloaded,
    refreshList,
  }
}

/**
 * 获取岩场离线数据 (用于离线模式下访问)
 */
export async function getOfflineCragData(cragId: string) {
  return getCragOffline(cragId)
}
