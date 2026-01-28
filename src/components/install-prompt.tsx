'use client'

import type { CSSProperties } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Download, X, Share, Plus, ExternalLink } from 'lucide-react'
import { usePlatformDetect } from '@/hooks/use-platform-detect'

// localStorage key for dismissal
const INSTALL_PROMPT_DISMISSED_KEY = 'pwa-install-prompt-dismissed'
// 30 天后重新显示
const DISMISS_DURATION_DAYS = 30

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * iOS Safari 分享图标组件
 * 模拟 iOS Safari 的分享按钮外观
 */
function IOSShareIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 方框 */}
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      {/* 向上箭头 */}
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

/**
 * 检查是否已被用户关闭（在有效期内）
 */
function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)
    if (!dismissed) return false
    const dismissedTime = parseInt(dismissed, 10)
    const now = Date.now()
    const durationMs = DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000
    return now - dismissedTime < durationMs
  } catch {
    return false
  }
}

/**
 * 记录用户关闭时间
 */
function setDismissed(): void {
  try {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, Date.now().toString())
  } catch {
    // localStorage 不可用，忽略
  }
}

/**
 * 智能 PWA 安装提示组件
 *
 * 根据不同平台显示不同的安装引导：
 * - Chromium 浏览器 (Android/Desktop): 使用原生 beforeinstallprompt API
 * - iOS Safari: 显示教程卡片，引导用户通过"分享 → 添加到主屏幕"安装
 * - iOS 非 Safari: 提示用户使用 Safari 打开以安装
 * - 其他浏览器: 显示通用安装说明
 *
 * 特性：
 * - 自动检测平台和浏览器
 * - 用户关闭后 30 天内不再显示
 * - 已安装（standalone 模式）时不显示
 */
export function InstallPrompt() {
  const t = useTranslations('InstallCard')
  const platformInfo = usePlatformDetect()

  // 原生安装提示 (Chromium)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // 是否显示提示
  const [isVisible, setIsVisible] = useState(false)

  // 是否显示 iOS 详细教程
  const [showIOSTutorial, setShowIOSTutorial] = useState(false)

  // 关闭提示并记住选择
  const handleDismiss = useCallback(() => {
    setDismissed()
    setIsVisible(false)
  }, [])

  // 检测是否应该显示提示
  useEffect(() => {
    // 等待平台检测完成
    if (!platformInfo.isReady) return

    // 已安装，不显示
    if (platformInfo.isStandalone) return

    // 用户已关闭，不显示
    if (isDismissed()) return

    // Chromium 浏览器等待 beforeinstallprompt 事件
    if (platformInfo.supportsNativePrompt) {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setIsVisible(true)
      }

      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    // iOS Safari: 直接显示教程提示
    if (platformInfo.isIOSSafari) {
      // 延迟显示，让用户先看到内容
      const timer = setTimeout(() => setIsVisible(true), 2000)
      return () => clearTimeout(timer)
    }

    // iOS 非 Safari: 显示引导使用 Safari 的提示
    if (platformInfo.isIOSNotSafari) {
      const timer = setTimeout(() => setIsVisible(true), 2000)
      return () => clearTimeout(timer)
    }

    // 其他不支持的浏览器暂不显示
  }, [platformInfo])

  // 原生安装
  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }

  if (!isVisible) return null

  // ============ Chromium 浏览器：原生安装提示 ============
  if (platformInfo.supportsNativePrompt && deferredPrompt) {
    return (
      <div
        className="p-4 mb-4 animate-fade-in-up"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))',
          borderRadius: 'var(--theme-radius-xl)',
          transition: 'var(--theme-transition)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            <Download className="w-5 h-5" style={{ color: 'var(--theme-on-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium" style={{ color: 'var(--theme-on-surface)' }}>
              {t('title')}
            </p>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('description')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full flex-shrink-0"
            style={{ color: 'var(--theme-on-surface-variant)' }}
            aria-label={t('dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleNativeInstall}
          className="w-full mt-3 py-2.5 font-medium transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          {t('install')}
        </button>
      </div>
    )
  }

  // ============ iOS Safari：安装教程 ============
  if (platformInfo.isIOSSafari) {
    return (
      <div
        className="p-4 mb-4 animate-fade-in-up"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))',
          borderRadius: 'var(--theme-radius-xl)',
          transition: 'var(--theme-transition)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            <Download className="w-5 h-5" style={{ color: 'var(--theme-on-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium" style={{ color: 'var(--theme-on-surface)' }}>
              {t('title')}
            </p>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('iosDescription')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full flex-shrink-0"
            style={{ color: 'var(--theme-on-surface-variant)' }}
            aria-label={t('dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 简化步骤 */}
        {!showIOSTutorial ? (
          <button
            onClick={() => setShowIOSTutorial(true)}
            className="w-full mt-3 py-2.5 font-medium transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-on-primary)',
              borderRadius: 'var(--theme-radius-lg)',
            }}
          >
            {t('showHowTo')}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            {/* 步骤 1 */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                1
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm" style={{ color: 'var(--theme-on-surface)' }}>
                  {t('iosStep1')}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                >
                  <IOSShareIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                </div>
              </div>
            </div>

            {/* 步骤 2 */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                2
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm" style={{ color: 'var(--theme-on-surface)' }}>
                  {t('iosStep2')}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'var(--theme-surface-variant)' }}
                >
                  <Plus className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                </div>
              </div>
            </div>

            {/* 收起按钮 */}
            <button
              onClick={() => setShowIOSTutorial(false)}
              className="w-full py-2 text-sm"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {t('hideTutorial')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ============ iOS 非 Safari：引导使用 Safari ============
  if (platformInfo.isIOSNotSafari) {
    return (
      <div
        className="p-4 mb-4 animate-fade-in-up"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))',
          borderRadius: 'var(--theme-radius-xl)',
          transition: 'var(--theme-transition)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--theme-warning)' }}
          >
            <ExternalLink className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium" style={{ color: 'var(--theme-on-surface)' }}>
              {t('iosNotSafariTitle')}
            </p>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {t('iosNotSafariDescription')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full flex-shrink-0"
            style={{ color: 'var(--theme-on-surface-variant)' }}
            aria-label={t('dismiss')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  // 其他情况不显示
  return null
}
