'use client'

/**
 * 轻量级 Toast 提示组件
 *
 * 特性:
 * - 自动消失 (可配置时长)
 * - 多种类型 (success, error, info)
 * - 动画效果
 * - 支持手动关闭
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== 类型定义 ====================

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number  // 毫秒，默认 3000
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void
}

// ==================== Context ====================

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// ==================== Toast Item ====================

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastData
  onClose: (id: string) => void
}) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const duration = toast.duration ?? 3000
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onClose(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast, onClose])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => onClose(toast.id), 300)
  }

  const Icon = toast.type === 'success' ? Check :
               toast.type === 'error' ? AlertCircle : Info

  const bgColor = toast.type === 'success' ? 'var(--theme-success)' :
                  toast.type === 'error' ? 'var(--theme-error)' :
                  'var(--theme-primary)'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg',
        'transform transition-all duration-300',
        isLeaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        'animate-fade-in-up'
      )}
      style={{
        background: `color-mix(in srgb, ${bgColor} 85%, transparent)`,
        WebkitBackdropFilter: 'blur(var(--glass-blur-sm))',
        backdropFilter: 'blur(var(--glass-blur-sm))',
        color: 'white',
        minWidth: '200px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ==================== Toast Container ====================

function ToastContainer({ toasts, onClose }: {
  toasts: ToastData[]
  onClose: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none"
      style={{ maxWidth: 'var(--app-shell-width)', margin: '0 auto' }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

// ==================== Toast Provider ====================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration = 3000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  )
}
