'use client'

import { useTheme } from 'next-themes'
import { Check, Mountain, Minimize2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const themes = [
  {
    name: 'minimal' as const,
    label: '极简专业',
    description: '黑白灰色调，专注内容',
    icon: Minimize2,
    preview: {
      primary: '#1a1a1a',
      surface: '#ffffff',
      surfaceVariant: '#f5f5f5',
    },
  },
  {
    name: 'outdoor' as const,
    label: '户外探险',
    description: '大地色调，户外氛围',
    icon: Mountain,
    preview: {
      primary: '#8B7355',
      surface: '#FAF8F5',
      surfaceVariant: '#F0EDE8',
    },
  },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 确保客户端渲染（Next.js SSR hydration 标准模式）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration 必需
    setMounted(true)
  }, [])

  if (!mounted) {
    // 服务端渲染时的骨架占位
    return (
      <div className="space-y-3">
        {themes.map((t) => (
          <div
            key={t.name}
            className="h-20 rounded-xl animate-pulse"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {themes.map((t) => {
        const isSelected = theme === t.name
        const Icon = t.icon

        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className="w-full p-3 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderRadius: 'var(--theme-radius-xl)',
              boxShadow: isSelected ? 'var(--theme-shadow-md)' : 'var(--theme-shadow-sm)',
              border: isSelected
                ? '2px solid var(--theme-primary)'
                : '2px solid transparent',
              transition: 'var(--theme-transition)',
            }}
          >
            {/* 主题预览色块 */}
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                backgroundColor: t.preview.surface,
                border: `1px solid ${t.preview.surfaceVariant}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: t.preview.primary }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* 主题信息 */}
            <div className="flex-1 text-left">
              <p
                className="font-semibold"
                style={{ color: 'var(--theme-on-surface)' }}
              >
                {t.label}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {t.description}
              </p>
            </div>

            {/* 选中标识 */}
            {isSelected && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <Check className="w-4 h-4" style={{ color: 'var(--theme-on-primary)' }} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
