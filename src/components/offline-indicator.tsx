'use client'

/**
 * 离线状态指示器
 *
 * 增强版功能:
 * 1. 显示当前离线状态
 * 2. 显示已下载的岩场数量
 * 3. 点击可展开查看已下载岩场列表
 */

import { useState, useMemo, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { WifiOff, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useOfflineDownloadContextSafe } from '@/components/offline-download-provider'

// 网络状态订阅
function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return !navigator.onLine
}

function getServerSnapshot() {
  return false
}

export default function OfflineIndicator() {
  const t = useTranslations('OfflineIndicator')
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isExpanded, setIsExpanded] = useState(false)

  // 获取离线下载 Context (可能为 null)
  const offlineDownload = useOfflineDownloadContextSafe()

  // 已下载岩场数量
  const offlineCragCount = useMemo(() => {
    return offlineDownload?.offlineCrags.length ?? 0
  }, [offlineDownload?.offlineCrags])

  // 不是离线模式且没有已下载岩场，不显示
  if (!isOffline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 desktop-center-full z-50 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--theme-warning)',
        color: 'white',
        transition: 'var(--theme-transition)',
      }}
    >
      {/* 主横幅 */}
      <button
        type="button"
        onClick={() => offlineCragCount > 0 && setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-2"
        disabled={offlineCragCount === 0}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">{t('message')}</span>

        {/* 显示可用岩场数量 */}
        {offlineCragCount > 0 && (
          <>
            <span className="text-sm opacity-80">·</span>
            <span className="text-sm opacity-80">
              {t('cragsAvailable', { count: offlineCragCount })}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </>
        )}
      </button>

      {/* 展开的岩场列表 */}
      {isExpanded && offlineCragCount > 0 && offlineDownload && (
        <div
          className="px-4 pb-3 border-t border-white/20"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {offlineDownload.offlineCrags.map((crag) => (
              <div
                key={crag.cragId}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/20"
              >
                <Check className="w-3 h-3" />
                <span>{crag.cragName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
