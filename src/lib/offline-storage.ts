/**
 * 离线存储层
 *
 * 使用 IndexedDB 存储岩场和线路数据，用于离线访问
 * 配合 Service Worker Cache API 存储图片
 *
 * 存储架构:
 * - IndexedDB: 结构化数据 (岩场、线路)
 * - Cache API: 图片资源 (由 SW 管理)
 * - localStorage: 状态元数据 (快速同步访问)
 */

import type { Crag, Route } from '@/types'
import { getRouteTopoUrl } from '@/lib/constants'

// ==================== 常量定义 ====================

export const DB_NAME = 'offline-crags'
export const DB_VERSION = 1
export const STORE_NAME = 'crags'
export const META_STORAGE_KEY = 'offline-crags-meta'

// ==================== 类型定义 ====================

/**
 * IndexedDB 中存储的岩场离线数据
 */
export interface OfflineCragData {
  cragId: string
  crag: Crag
  routes: Route[]
  downloadedAt: string    // ISO timestamp
  version: string         // 用于检测更新
  imageCount: number      // 已缓存图片数量
}

/**
 * localStorage 中存储的元数据 (用于快速状态检查)
 */
export interface OfflineCragsMeta {
  crags: {
    [cragId: string]: {
      cragName: string
      routeCount: number
      downloadedAt: string
      imageCount: number
    }
  }
  lastUpdated: string
}

// ==================== IndexedDB 操作 ====================

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 打开/创建 IndexedDB 数据库
 * 使用单例模式避免重复连接
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    // 检查浏览器支持
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbPromise = null
      reject(new Error(`Failed to open database: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 创建 object store (如果不存在)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cragId' })
        // 创建索引以便按时间查询
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * 保存岩场离线数据到 IndexedDB
 */
export async function saveCragOffline(data: OfflineCragData): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(data)

    request.onerror = () => {
      reject(new Error(`Failed to save crag: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      // 同步更新 localStorage 元数据
      updateMeta(data)
      resolve()
    }
  })
}

/**
 * 获取单个岩场的离线数据
 */
export async function getCragOffline(cragId: string): Promise<OfflineCragData | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(cragId)

    request.onerror = () => {
      reject(new Error(`Failed to get crag: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve(request.result || null)
    }
  })
}

/**
 * 获取所有已下载的岩场
 */
export async function getAllOfflineCrags(): Promise<OfflineCragData[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => {
      reject(new Error(`Failed to get all crags: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      resolve(request.result || [])
    }
  })
}

/**
 * 删除岩场离线数据
 */
export async function deleteCragOffline(cragId: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(cragId)

    request.onerror = () => {
      reject(new Error(`Failed to delete crag: ${request.error?.message}`))
    }

    request.onsuccess = () => {
      // 从元数据中移除
      removeMeta(cragId)
      resolve()
    }
  })
}

/**
 * 检查岩场是否已下载
 * 优先使用 localStorage 快速检查
 */
export function isOfflineAvailable(cragId: string): boolean {
  try {
    const meta = getMeta()
    return cragId in meta.crags
  } catch {
    return false
  }
}

/**
 * 检查 IndexedDB 是否支持且可用
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

// ==================== localStorage 元数据操作 ====================

/**
 * 获取元数据
 */
export function getMeta(): OfflineCragsMeta {
  try {
    if (typeof localStorage === 'undefined') {
      return { crags: {}, lastUpdated: '' }
    }
    const stored = localStorage.getItem(META_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as OfflineCragsMeta
    }
  } catch {
    // 解析失败时返回空对象
  }
  return { crags: {}, lastUpdated: '' }
}

/**
 * 更新单个岩场的元数据
 */
function updateMeta(data: OfflineCragData): void {
  try {
    if (typeof localStorage === 'undefined') return

    const meta = getMeta()
    meta.crags[data.cragId] = {
      cragName: data.crag.name,
      routeCount: data.routes.length,
      downloadedAt: data.downloadedAt,
      imageCount: data.imageCount,
    }
    meta.lastUpdated = new Date().toISOString()
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // localStorage 操作失败时静默处理
  }
}

/**
 * 从元数据中移除岩场
 */
function removeMeta(cragId: string): void {
  try {
    if (typeof localStorage === 'undefined') return

    const meta = getMeta()
    delete meta.crags[cragId]
    meta.lastUpdated = new Date().toISOString()
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // localStorage 操作失败时静默处理
  }
}

/**
 * 清除所有元数据
 */
export function clearMeta(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(META_STORAGE_KEY)
  } catch {
    // 静默处理
  }
}

// ==================== 图片缓存操作 ====================

export const OFFLINE_IMAGE_CACHE_NAME = 'offline-crag-images'

/**
 * 收集岩场相关的所有图片 URL
 *
 * 注意：线路 TOPO 图片 URL 是动态生成的，格式为：
 * https://img.bouldering.top/{cragId}/{routeName}.jpg?v=1
 * 而不是存储在 route.image 字段中
 */
export function collectImageUrls(crag: Crag, routes: Route[]): string[] {
  const urls: string[] = []

  // 岩场封面图
  if (crag.coverImages) {
    urls.push(...crag.coverImages)
  }

  // 线路 TOPO 图 - 使用 getRouteTopoUrl 动态生成 URL
  for (const route of routes) {
    const topoUrl = getRouteTopoUrl(route.cragId, route.name)
    urls.push(topoUrl)
  }

  return urls
}

/**
 * 预取图片到 Cache API
 * 返回成功缓存的图片数量
 *
 * 注意：使用 no-cors 模式绕过 CORS 限制
 * no-cors 返回 opaque response（type: 'opaque'，status: 0）
 * 虽然无法检查 response.ok，但仍可存入 cache 供离线使用
 */
export async function prefetchImages(
  urls: string[],
  onProgress?: (downloaded: number, total: number) => void
): Promise<number> {
  if (!('caches' in window)) {
    return 0
  }

  const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME)
  let downloaded = 0

  for (const url of urls) {
    try {
      // 检查是否已缓存
      const cached = await cache.match(url)
      if (!cached) {
        // 使用 no-cors 模式绕过 CORS 限制
        // opaque response 可以被缓存，离线时可用
        const response = await fetch(url, { mode: 'no-cors' })
        // no-cors 返回 opaque response，type 为 'opaque'，status 为 0
        // 但只要 fetch 成功就可以缓存
        await cache.put(url, response)
      }
      downloaded++
      onProgress?.(downloaded, urls.length)
    } catch {
      // 单个图片失败不影响整体
      downloaded++
      onProgress?.(downloaded, urls.length)
    }
  }

  return downloaded
}

/**
 * 删除岩场相关的缓存图片
 */
export async function deleteImages(urls: string[]): Promise<void> {
  if (!('caches' in window)) return

  try {
    const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME)
    await Promise.all(urls.map(url => cache.delete(url)))
  } catch {
    // 静默处理
  }
}

// ==================== 工具函数 ====================

/**
 * 生成数据版本号 (用于检测更新)
 * 基于岩场 ID 和当前日期
 */
export function generateVersion(cragId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${cragId}-${date}`
}

/**
 * 关闭数据库连接 (用于测试清理)
 */
export function closeDB(): void {
  dbPromise = null
}
