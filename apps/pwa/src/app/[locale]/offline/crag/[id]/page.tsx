'use client'

/**
 * 离线岩场详情页
 *
 * 从 IndexedDB 读取已下载的岩场数据进行展示
 * 离线模式下禁用天气和地图功能
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft, WifiOff, FileText, Car, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCragOffline, type OfflineCragData, OFFLINE_IMAGE_CACHE_NAME } from '@/lib/offline-storage'
import { getCragCoverUrl } from '@/lib/constants'
import { computeGradeRange, formatGradeRange } from '@/lib/grade-utils'
import { InfoCard } from '@/components/info-card'
import { CoverCarousel } from '@/components/cover-carousel'

export default function OfflineCragDetailPage() {
  const t = useTranslations('OfflineCragDetail')
  const tCrag = useTranslations('CragDetail')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const cragId = params.id as string

  const [cragData, setCragData] = useState<OfflineCragData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [coverUrls, setCoverUrls] = useState<string[]>([])

  // 加载离线数据
  useEffect(() => {
    async function loadOfflineData() {
      try {
        const data = await getCragOffline(cragId)
        setCragData(data)

        // 尝试从 Cache API 加载封面图
        if (data) {
          const coverCount = data.crag.coverImages?.length ?? 0
          const urls = coverCount > 0
            ? Array.from({ length: coverCount }, (_, i) => getCragCoverUrl(cragId, i))
            : [getCragCoverUrl(cragId, 0)]
          const cachedUrls = await loadCachedImages(urls)
          setCoverUrls(cachedUrls.length > 0 ? cachedUrls : urls)
        }
      } catch (error) {
        console.error('Failed to load offline crag:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOfflineData()
  }, [cragId])

  // 从 Cache API 加载已缓存的图片
  async function loadCachedImages(urls: string[]): Promise<string[]> {
    if (!('caches' in window)) return urls

    try {
      const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME)
      const cachedUrls: string[] = []

      for (const url of urls) {
        const response = await cache.match(url)
        if (response) {
          // 图片已缓存，可以直接使用 URL
          cachedUrls.push(url)
        }
      }

      return cachedUrls.length > 0 ? cachedUrls : urls
    } catch {
      return urls
    }
  }


  // 计算难度范围
  const gradeRange = cragData
    ? (formatGradeRange(computeGradeRange(cragData.routes.map((r) => r.grade))) ?? t('noGrade'))
    : ''

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
  if (!cragData) {
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

  const { crag, routes } = cragData

  return (
    <div
      className="flex flex-col h-dvh overflow-hidden"
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

      {/* 封面图区域 */}
      <div className="relative flex-shrink-0">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* 图片滑动查看 */}
        <CoverCarousel
          images={coverUrls}
          alt={crag.name}
          unoptimized
        />
      </div>

      {/* 内容滚动区域 */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {/* 标题区域 */}
        <div className="py-4">
          <div className="flex flex-col mb-2">
            <h1
              className="text-3xl font-bold tracking-wide leading-tight"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {crag.name}
            </h1>
            <div
              className="w-10 h-0.5 mt-1"
              style={{ background: 'linear-gradient(to right, var(--theme-primary), transparent)' }}
            />
          </div>

          {/* 徽章组 */}
          <div className="flex flex-wrap gap-1 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                color: 'var(--theme-primary)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              {routes.length} {t('routes')}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--theme-surface-variant)',
                color: 'var(--theme-on-surface-variant)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              {gradeRange}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))',
                color: 'var(--theme-warning)',
                borderRadius: 'var(--theme-radius-full)',
              }}
            >
              <WifiOff className="w-3 h-3" />
              {t('offlineData')}
            </span>
          </div>
        </div>

        {/* 前往方式卡片 */}
        {crag.approach && (
          <InfoCard
            icon={<Car className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />}
            iconBg="var(--theme-surface-variant)"
            title={tCrag('approach')}
            content={crag.approach}
            delay={0}
          />
        )}

        {/* 天气卡片 - 离线不可用提示 */}
        <div
          className="glass-light p-4 mb-2 animate-fade-in-up"
          style={{
            borderRadius: 'var(--theme-radius-xl)',
            animationDelay: '25ms',
          }}
        >
          <div className="flex items-center justify-center gap-2 py-4">
            <CloudOff className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('weatherUnavailable')}
            </span>
          </div>
        </div>

        {/* 岩场介绍卡片 */}
        <InfoCard
          icon={<FileText className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />}
          iconBg="var(--theme-surface-variant)"
          title={tCrag('description')}
          content={crag.description}
          delay={50}
        />
      </main>

      {/* 底部操作按钮 */}
      <div
        className="fixed bottom-0 left-0 right-0 desktop-center-padded p-4"
        style={{ background: `linear-gradient(to top, var(--theme-surface), transparent)` }}
      >
        <Button
          onClick={() => router.push(`/${locale}/route?crag=${crag.id}`)}
          className="w-full h-12 font-semibold"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-xl)',
            boxShadow: 'var(--theme-shadow-lg)',
          }}
        >
          {tCrag('exploreRoutes')}
        </Button>
      </div>
    </div>
  )
}

