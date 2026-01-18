'use client'

import { useState, useCallback } from 'react'
import { ExternalLink, BookHeart, Ruler, ArrowUpFromLine, Plus, Copy, Check, RefreshCw } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { BETA_PLATFORMS } from '@/lib/beta-constants'
import type { BetaLink, BetaPlatform } from '@/types'

interface BetaListDrawerProps {
  isOpen: boolean
  onClose: () => void
  betaLinks: BetaLink[]  // 来自 props 的数据（可能是 ISR 缓存）
  routeName: string
  routeId: number
  onAddBeta?: () => void
}

// 平台图标映射（目前仅支持小红书）
const PLATFORM_ICONS: Record<BetaPlatform, React.ComponentType<{ className?: string }>> = {
  xiaohongshu: BookHeart,
}

export function BetaListDrawer({
  isOpen,
  onClose,
  betaLinks: propsBetaLinks,
  routeName,
  routeId,
  onAddBeta,
}: BetaListDrawerProps) {
  // 手动刷新获取的数据（优先于 props 数据）
  const [refreshedLinks, setRefreshedLinks] = useState<BetaLink[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // 优先使用刷新后的数据，否则使用 props 数据（来自 ISR 缓存）
  const betaLinks = refreshedLinks ?? propsBetaLinks

  /**
   * 手动刷新 Beta 列表
   * 只在用户主动点击刷新按钮时调用 API
   */
  const handleRefresh = useCallback(async () => {
    if (refreshing || !routeId) return

    setRefreshing(true)
    try {
      const res = await fetch(`/api/beta?routeId=${routeId}`)
      const data = await res.json()
      if (data.success && data.betaLinks) {
        console.log('[BetaListDrawer] Refreshed betaLinks:', data.betaLinks.length)
        setRefreshedLinks(data.betaLinks)
      }
    } catch (err) {
      console.error('[BetaListDrawer] Failed to refresh:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, routeId])

  // 复制成功状态（记录哪个链接被复制）
  const [copiedId, setCopiedId] = useState<string | null>(null)

  /**
   * 复制链接到剪贴板
   */
  const handleCopyLink = useCallback(async (url: string, betaId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止触发父元素的点击事件

    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(betaId)
      console.log('[BetaListDrawer] Copied URL:', url)

      // 2秒后重置复制状态
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('[BetaListDrawer] Failed to copy:', err)
      // 降级方案：使用传统的复制方法
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(betaId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  /**
   * 打开外部链接
   * 调试：打印实际点击的 URL
   */
  const handleLinkClick = (url: string) => {
    console.log('[BetaListDrawer] Opening URL:', url)

    // 创建临时 <a> 标签并模拟点击
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="half"
      title={`${routeName} 的 Beta`}
      showCloseButton
    >
      <div className="px-4 pb-4">
        {/* 分享 Beta 按钮 */}
        {onAddBeta && (
          <button
            onClick={onAddBeta}
            className="w-full flex items-center justify-center gap-2 p-3 mb-4 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: '1px dashed var(--theme-primary)',
              color: 'var(--theme-primary)',
            }}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">分享 Beta 视频</span>
          </button>
        )}

        {betaLinks.length === 0 ? (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            >
              <ExternalLink
                className="w-8 h-8"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
            </div>
            <p
              className="text-base font-medium mb-1"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              暂无 Beta 视频
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              成为第一个分享攻略的人吧！
            </p>
          </div>
        ) : (
          <>
            {/* 刷新按钮区域 */}
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {refreshedLinks ? '已刷新' : '来自缓存'}
                {betaLinks.length > 0 && ` · ${betaLinks.length} 个视频`}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  color: 'var(--theme-on-surface-variant)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '刷新中...' : '刷新'}
              </button>
            </div>

            <div className="space-y-2">
              {betaLinks.map((beta, index) => {
              const platform = BETA_PLATFORMS[beta.platform]
              const Icon = PLATFORM_ICONS[beta.platform]

              return (
                <button
                  key={beta.id}
                  onClick={() => handleLinkClick(beta.url)}
                  className="w-full flex items-center gap-3 p-3 transition-all active:scale-[0.98] animate-fade-in-up"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    borderRadius: 'var(--theme-radius-xl)',
                    boxShadow: 'var(--theme-shadow-sm)',
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* 平台图标 */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: platform.color }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* 链接信息 */}
                  <div className="flex-1 min-w-0 text-left">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{ color: 'var(--theme-on-surface)' }}
                    >
                      {beta.title || `${platform.name}视频`}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--theme-on-surface-variant)' }}
                      >
                        {beta.author ? `@${beta.author}` : platform.name}
                      </span>
                      {/* 身高臂长信息 */}
                      {(beta.climberHeight || beta.climberReach) && (
                        <span
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--theme-primary)' }}
                        >
                          {beta.climberHeight && (
                            <span className="flex items-center gap-0.5">
                              <Ruler className="w-3 h-3" />
                              {beta.climberHeight}
                            </span>
                          )}
                          {beta.climberReach && (
                            <span className="flex items-center gap-0.5">
                              <ArrowUpFromLine className="w-3 h-3" />
                              {beta.climberReach}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 复制链接按钮 */}
                  <button
                    onClick={(e) => handleCopyLink(beta.url, beta.id, e)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                    style={{
                      backgroundColor: copiedId === beta.id
                        ? 'var(--theme-success, #22c55e)'
                        : 'var(--theme-surface-variant)',
                    }}
                    title="复制链接"
                  >
                    {copiedId === beta.id ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Copy
                        className="w-5 h-5"
                        style={{ color: 'var(--theme-on-surface-variant)' }}
                      />
                    )}
                  </button>
                </button>
              )
            })}
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
