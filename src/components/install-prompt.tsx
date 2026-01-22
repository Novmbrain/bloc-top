'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const t = useTranslations('InstallCard')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 检测是否已安装（standalone 模式）
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsVisible(false)
    }
    setDeferredPrompt(null)
  }

  if (!isVisible) return null

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
          onClick={handleInstall}
          className="px-4 py-2 font-medium flex-shrink-0 transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-on-primary)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          {t('install')}
        </button>
      </div>
    </div>
  )
}
