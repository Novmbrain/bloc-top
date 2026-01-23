'use client'

/**
 * 离线首页
 *
 * 当用户离线时显示此页面，列出所有已下载的岩场
 * 数据来源：IndexedDB
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { WifiOff, CloudDownload, RefreshCw, Mountain, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAllOfflineCrags, type OfflineCragData } from '@/lib/offline-storage'

export default function OfflinePage() {
  const t = useTranslations('OfflinePage')
  const locale = useLocale()
  const router = useRouter()
  const [offlineCrags, setOfflineCrags] = useState<OfflineCragData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)

  // 加载离线数据
  useEffect(() => {
    async function loadOfflineData() {
      try {
        const crags = await getAllOfflineCrags()
        setOfflineCrags(crags)
      } catch (error) {
        console.error('Failed to load offline crags:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadOfflineData()
  }, [])

  // 监听网络状态
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // 尝试重新连接
  const handleRetry = () => {
    if (navigator.onLine) {
      router.push(`/${locale}`)
    } else {
      // 刷新页面重新检测网络状态
      window.location.reload()
    }
  }

  // 跳转到在线首页
  const goHome = () => {
    router.push(`/${locale}`)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--theme-surface)',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 顶部状态栏 */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-3"
        style={{
          backgroundColor: isOnline ? 'var(--theme-success)' : 'var(--theme-warning)',
          color: 'white',
        }}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isOnline ? t('backOnline') : t('offline')}
        </span>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 px-4 py-6">
        {/* 标题区域 */}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
            }}
          >
            <CloudDownload className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {t('title')}
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {t('description')}
          </p>
        </div>

        {/* 已下载岩场列表 */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : offlineCrags.length > 0 ? (
          <div className="space-y-3">
            <h2
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t('downloadedCrags', { count: offlineCrags.length })}
            </h2>
            {offlineCrags.map((cragData) => (
              <button
                key={cragData.cragId}
                onClick={() => router.push(`/${locale}/offline/crag/${cragData.cragId}`)}
                className="w-full p-4 flex items-center gap-3 text-left"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderRadius: 'var(--theme-radius-xl)',
                  boxShadow: 'var(--theme-shadow-sm)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                  }}
                >
                  <Mountain className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold truncate"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    {cragData.crag.name}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--theme-on-surface-variant)' }}
                  >
                    {t('routeCount', { count: cragData.routes.length })}
                  </p>
                </div>
                <ChevronRight
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 px-4"
            style={{
              backgroundColor: 'var(--theme-surface-variant)',
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            <CloudDownload
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.5 }}
            />
            <p
              className="text-sm mb-1"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t('noDownloads')}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.7 }}
            >
              {t('downloadHint')}
            </p>
          </div>
        )}
      </main>

      {/* 底部操作区 */}
      <div className="p-4 space-y-3">
        {isOnline && (
          <Button
            onClick={goHome}
            className="w-full h-12 font-semibold"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-xl)',
            }}
          >
            {t('goHome')}
          </Button>
        )}
        <Button
          onClick={handleRetry}
          variant="outline"
          className="w-full h-12 font-semibold flex items-center justify-center gap-2"
          style={{
            borderColor: 'var(--theme-outline)',
            color: 'var(--theme-on-surface)',
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          {t('retry')}
        </Button>
      </div>
    </div>
  )
}
