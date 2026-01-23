'use client'

/**
 * 离线线路详情页
 *
 * 从 IndexedDB 中查找已下载的线路数据进行展示
 * 图片从 Cache API 加载
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, User, MapPin, ImageOff, WifiOff, CloudOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { getGradeColor } from '@/lib/tokens'
import { getRouteTopoUrl } from '@/lib/constants'
import { getOfflineRouteById, OFFLINE_IMAGE_CACHE_NAME } from '@/lib/offline-storage'
import type { Route, Crag } from '@/types'

export default function OfflineRouteDetailPage() {
  const t = useTranslations('OfflineRouteDetail')
  const tRoute = useTranslations('RouteDetail')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const routeId = parseInt(params.id as string)

  const [routeData, setRouteData] = useState<{ route: Route; crag: Crag } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [topoImage, setTopoImage] = useState<string>('')

  // 加载离线数据
  useEffect(() => {
    async function loadOfflineData() {
      try {
        const data = await getOfflineRouteById(routeId)
        setRouteData(data)

        if (data) {
          // 生成 TOPO 图 URL
          const url = getRouteTopoUrl(data.route.cragId, data.route.name)
          setTopoImage(url)

          // 检查图片是否已缓存
          await checkImageCached(url)
        }
      } catch (error) {
        console.error('Failed to load offline route:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOfflineData()
  }, [routeId])

  // 检查图片是否已缓存
  async function checkImageCached(url: string): Promise<void> {
    if (!('caches' in window)) return

    try {
      const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME)
      const response = await cache.match(url)
      if (!response) {
        // 图片未缓存，可能显示错误
        console.warn('TOPO image not cached:', url)
      }
    } catch {
      // 静默处理
    }
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // 数据不存在
  if (!routeData) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <CloudOff
          className="w-16 h-16 mb-4"
          style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.5 }}
        />
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {t('notDownloaded')}
        </h1>
        <p
          className="text-sm text-center mb-6"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          {t('notDownloadedDesc')}
        </p>
        <Button
          onClick={() => router.push(`/${locale}/offline`)}
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          {t('backToOffline')}
        </Button>
      </div>
    )
  }

  const { route, crag } = routeData

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 离线状态横幅 */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-2"
        style={{
          backgroundColor: 'var(--theme-warning)',
          color: 'white',
        }}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">{t('offlineViewing')}</span>
      </div>

      {/* TOPO 图区域 */}
      <div className="relative flex-shrink-0 h-[45vh] bg-black">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* 图片加载骨架屏 */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-xl" />
              <Skeleton className="w-32 h-4 rounded-full" />
            </div>
          </div>
        )}

        {/* 图片加载失败 */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white/60">
              <ImageOff className="w-12 h-12" />
              <span className="text-sm">{tRoute('imageLoadFailed')}</span>
            </div>
          </div>
        )}

        {/* TOPO 图 */}
        {topoImage && (
          <Image
            src={topoImage}
            alt={route.name}
            fill
            className={`object-contain transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false)
              setImageError(true)
            }}
            unoptimized
          />
        )}

        {/* 难度标签 */}
        <div
          className="absolute top-4 right-4 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: getGradeColor(route.grade) }}
        >
          <span className="text-white font-bold text-sm">{route.grade}</span>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="flex-1 overflow-y-auto">
        {/* 线路信息 */}
        <div className="px-4 py-4" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--theme-on-surface)' }}>
            {route.name}
          </h1>

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
            <MapPin className="w-4 h-4" />
            <span>{crag.name || route.area}</span>
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* 离线标签 */}
            <div
              className="flex items-center gap-1 px-2 py-1"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              <WifiOff className="w-3 h-3" style={{ color: 'var(--theme-warning)' }} />
              <span className="text-xs" style={{ color: 'var(--theme-warning)' }}>
                {t('offlineData')}
              </span>
            </div>
            {route.FA && (
              <div
                className="flex items-center gap-1 px-2 py-1"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                <User className="w-3 h-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  FA: {route.FA}
                </span>
              </div>
            )}
            {route.setter && route.setter !== 'TODO' && (
              <div
                className="px-2 py-1"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
                  {tRoute('setterPrefix')}: {route.setter}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 线路描述 */}
        {route.description && route.description !== 'TODO' && (
          <div
            className="px-4 py-4"
            style={{ borderTop: '1px solid var(--theme-outline-variant)' }}
          >
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
              {tRoute('routeDescription')}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {route.description}
            </p>
          </div>
        )}

        {/* Beta 视频 - 离线不可用 */}
        <div
          className="px-4 py-4"
          style={{ borderTop: '1px solid var(--theme-outline-variant)' }}
        >
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--theme-on-surface)' }}>
            {tRoute('beta')}
          </h2>
          <div className="flex items-center justify-center gap-2 py-4">
            <CloudOff className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('betaUnavailable')}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
