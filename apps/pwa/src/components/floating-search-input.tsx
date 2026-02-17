'use client'

import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface FloatingSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isCollapsed?: boolean
  onExpandClick?: () => void
}

/**
 * 悬浮搜索输入框 — 胶囊形，固定在 Tabbar 上方
 * 视觉与首页 FloatingSearch 按钮统一，但内部是真正的 input
 * 使用 Input (CompositionInput) 正确处理中文 IME 输入
 *
 * 支持折叠模式：isCollapsed=true 时从全宽胶囊收缩为 48px 毛玻璃圆按钮
 */
export function FloatingSearchInput({
  value,
  onChange,
  placeholder = '搜索线路名、区域或首攀者...',
  isCollapsed = false,
  onExpandClick,
}: FloatingSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={`fixed bottom-20 z-40 ${isCollapsed ? '' : 'desktop-center-padded'}`}
      style={{
        left: 16,
        ...(isCollapsed
          ? { width: 48, right: undefined }
          : { right: 16, width: undefined }),
        transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="relative flex items-center glass-md"
        style={{
          height: 48,
          borderRadius: 'var(--theme-radius-full)',
          transition: 'var(--theme-transition)',
          cursor: isCollapsed ? 'pointer' : undefined,
        }}
        onClick={isCollapsed ? onExpandClick : undefined}
      >
        <Search
          className="w-5 h-5 pointer-events-none absolute"
          style={{
            color: 'var(--theme-on-surface-variant)',
            left: isCollapsed ? 14 : 16,
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* 输入框 + 清除按钮 — 收缩时隐藏 */}
        <div
          style={{
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? 'none' : undefined,
            transition: 'opacity 150ms ease',
          }}
          className="w-full h-full"
        >
          <Input
            ref={inputRef}
            variant="unstyled"
            themed={false}
            value={value}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                inputRef.current?.blur()
              }
            }}
            placeholder={placeholder}
            className="w-full h-full bg-transparent pl-12 pr-10 text-sm outline-none"
            style={{ color: 'var(--theme-on-surface)' }}
          />
          {value && (
            <button
              onClick={() => { onChange(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ backgroundColor: 'var(--theme-on-surface-variant)' }}
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-surface)' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
