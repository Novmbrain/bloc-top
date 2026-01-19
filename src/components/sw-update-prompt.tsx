'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function SWUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 监听新的 SW 安装
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新版本已安装，但还没激活
                setWaitingWorker(newWorker)
                setShowPrompt(true)
              }
            })
          }
        })

        // 检查是否已有等待中的 SW
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowPrompt(true)
        }
      })

      // 监听 SW 控制权变化（当新 SW 激活时刷新页面）
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 desktop-center-padded z-50 p-4 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--theme-primary)',
        color: 'var(--theme-on-primary)',
        borderRadius: 'var(--theme-radius-xl)',
        boxShadow: 'var(--theme-shadow-lg)',
        transition: 'var(--theme-transition)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)' }}
        >
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">发现新版本</p>
          <p
            className="text-sm mt-0.5"
            style={{ opacity: 0.8 }}
          >
            刷新以获取最新内容
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full transition-colors"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-on-primary) 10%, transparent)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdate}
          className="flex-1 py-2 px-4 font-medium transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--theme-on-primary)',
            color: 'var(--theme-primary)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          立即刷新
        </button>
        <button
          onClick={handleDismiss}
          className="py-2 px-4 font-medium transition-transform active:scale-[0.98]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          稍后
        </button>
      </div>
    </div>
  )
}
