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

import { useState, useCallback, useEffect, useRef } from 'react'
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
  getCragsNeedingCheck,
  updateStaleness,
  getStaleInfo,
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

  // Staleness 检测
  getUpdateInfo: (cragId: string) => { isStale: boolean; newRouteCount: number } | null

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
  // 初始为 false，hydration 后检测 IndexedDB 支持
  // 避免 SSR/Client 不一致导致 Hydration Mismatch（服务端无 indexedDB 全局变量）
  const [isSupported, setIsSupported] = useState(false)
  const [offlineCrags, setOfflineCrags] = useState<OfflineCragMeta[]>([])

  /* eslint-disable react-hooks/set-state-in-effect -- 浏览器 API 检测必须在 hydration 后执行，无法用 render-time 模式（会破坏 hydration 一致性） */
  useEffect(() => {
    if (isIndexedDBSupported()) {
      setIsSupported(true)
      setOfflineCrags(loadOfflineCrags())
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  // staleness 检查版本号 — 递增时触发 UI 重渲染
  const [staleVersion, setStaleVersion] = useState(0)

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
   * 获取岩场的更新信息 (是否有新线路)
   */
  const getUpdateInfo = useCallback((cragId: string) => {
    // staleVersion 依赖确保检查完成后重新计算
    void staleVersion
    return getStaleInfo(cragId)
  }, [staleVersion])

  /**
   * 后台检查所有已下载岩场是否有更新
   */
  const hasCheckedRef = useRef(false)
  useEffect(() => {
    if (!isSupported || hasCheckedRef.current) return
    hasCheckedRef.current = true

    const checkForUpdates = async () => {
      const cragIds = getCragsNeedingCheck()
      if (cragIds.length === 0) return

      for (const cragId of cragIds) {
        try {
          const res = await fetch(`/api/crags/${cragId}/version`)
          if (!res.ok) continue

          const data = await res.json()
          if (data.success && typeof data.routeCount === 'number') {
            updateStaleness(cragId, data.routeCount)
          }
        } catch {
          // 网络失败静默忽略
        }
      }

      // 检查完成后触发 UI 更新
      setStaleVersion(v => v + 1)
    }

    checkForUpdates()
  }, [isSupported])

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
    getUpdateInfo,
    refreshList,
  }
}

/**
 * 获取岩场离线数据 (用于离线模式下访问)
 */
export async function getOfflineCragData(cragId: string) {
  return getCragOffline(cragId)
}
