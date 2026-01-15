'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
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
    <div className="bg-[var(--m3-primary-container)] rounded-xl p-4 mb-4 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--m3-primary)] flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--m3-on-primary-container)]">
            添加到主屏幕
          </p>
          <p className="text-sm text-[var(--m3-on-primary-container)]/70">
            获得更好的使用体验
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-[var(--m3-primary)] text-white rounded-lg font-medium flex-shrink-0 transition-transform active:scale-[0.98]"
        >
          安装
        </button>
      </div>
    </div>
  )
}
