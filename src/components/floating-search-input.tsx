'use client'

import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface FloatingSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * 悬浮搜索输入框 — 胶囊形，固定在 Tabbar 上方
 * 视觉与首页 FloatingSearch 按钮统一，但内部是真正的 input
 * 使用 Input (CompositionInput) 正确处理中文 IME 输入
 */
export function FloatingSearchInput({
  value,
  onChange,
  placeholder = '搜索线路名、区域或首攀者...',
}: FloatingSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="fixed bottom-20 left-4 right-4 desktop-center-padded z-40">
      <div
        className="relative h-12 flex items-center"
        style={{
          backgroundColor: 'var(--theme-surface)',
          border: '1px solid var(--theme-outline)',
          borderRadius: 'var(--theme-radius-full)',
          boxShadow: 'var(--theme-shadow-lg)',
          transition: 'var(--theme-transition)',
        }}
      >
        <Search
          className="absolute left-4 w-5 h-5 pointer-events-none"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        />
        <Input
          ref={inputRef}
          variant="unstyled"
          themed={false}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full h-full bg-transparent pl-12 pr-10 text-sm outline-none"
          style={{ color: 'var(--theme-on-surface)' }}
        />
        {value && (
          <button
            onClick={() => { onChange(''); inputRef.current?.focus() }}
            className="absolute right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ backgroundColor: 'var(--theme-on-surface-variant)' }}
          >
            <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-surface)' }} />
          </button>
        )}
      </div>
    </div>
  )
}
