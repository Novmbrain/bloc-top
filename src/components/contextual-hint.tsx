'use client'

import { X } from 'lucide-react'
import { useContextualHint } from '@/hooks/use-contextual-hint'

interface ContextualHintProps {
  hintKey: string
  message: string
  icon?: React.ReactNode
}

/**
 * 通用可关闭提示条
 *
 * 一次性显示的小提示，关闭后不再出现。
 * 半透明主题色背景 + 淡入动画。
 */
export function ContextualHint({ hintKey, message, icon }: ContextualHintProps) {
  const { visible, dismiss } = useContextualHint(hintKey)

  if (!visible) return null

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 animate-fade-in"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
        borderRadius: 'var(--theme-radius-lg)',
        WebkitBackdropFilter: 'blur(var(--glass-blur-xs))',
        backdropFilter: 'blur(var(--glass-blur-xs))',
      }}
    >
      {icon && (
        <span style={{ color: 'var(--theme-primary)' }} className="flex-shrink-0">
          {icon}
        </span>
      )}
      <span
        className="text-xs flex-1"
        style={{ color: 'var(--theme-on-surface)' }}
      >
        {message}
      </span>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-0.5"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
