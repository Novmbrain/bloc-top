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
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-[var(--m3-primary)] text-white p-4 rounded-xl shadow-lg animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">发现新版本</p>
          <p className="text-sm text-white/80 mt-0.5">
            刷新以获取最新内容
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdate}
          className="flex-1 py-2 px-4 bg-white text-[var(--m3-primary)] font-medium rounded-lg transition-transform active:scale-[0.98]"
        >
          立即刷新
        </button>
        <button
          onClick={handleDismiss}
          className="py-2 px-4 bg-white/20 font-medium rounded-lg transition-transform active:scale-[0.98]"
        >
          稍后
        </button>
      </div>
    </div>
  )
}
