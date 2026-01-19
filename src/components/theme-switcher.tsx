'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ThemeMode } from '@/lib/themes'

// 主题模式配置
const themeModes: {
  mode: ThemeMode
  label: string
  description: string
  icon: typeof Sun
  preview: {
    primary: string
    surface: string
    surfaceVariant: string
  }
}[] = [
  {
    mode: 'light',
    label: '日间',
    description: '明亮清爽，适合白天',
    icon: Sun,
    preview: {
      primary: '#7C3AED',
      surface: '#FAFAFA',
      surfaceVariant: '#F3F0F7',
    },
  },
  {
    mode: 'dark',
    label: '暗夜',
    description: 'Dracula 配色，护眼舒适',
    icon: Moon,
    preview: {
      primary: '#BD93F9',
      surface: '#282A36',
      surfaceVariant: '#44475A',
    },
  },
  {
    mode: 'system',
    label: '自动',
    description: '跟随系统设置',
    icon: Monitor,
    preview: {
      primary: '#7C3AED',
      surface: '#F5F5F5',
      surfaceVariant: '#E8E8E8',
    },
  },
]

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme()
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
        {themeModes.map((t) => (
          <div
            key={t.mode}
            className="h-20 rounded-xl animate-pulse"
            style={{ backgroundColor: 'var(--theme-surface-variant)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {themeModes.map((t) => {
        const isSelected = theme === t.mode
        const Icon = t.icon

        // 对于自动模式，显示当前实际应用的主题
        const isSystemMode = t.mode === 'system'
        const actualTheme = isSystemMode && isSelected ? resolvedTheme : null

        return (
          <button
            key={t.mode}
            onClick={() => setTheme(t.mode)}
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
              className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative"
              style={{
                backgroundColor: t.preview.surface,
                border: `1px solid ${t.preview.surfaceVariant}`,
              }}
            >
              {/* 自动模式显示日夜分割效果 */}
              {isSystemMode ? (
                <div className="relative w-full h-full flex">
                  <div
                    className="w-1/2 h-full flex items-center justify-center"
                    style={{ backgroundColor: themeModes[0].preview.surface }}
                  >
                    <Sun className="w-3 h-3" style={{ color: themeModes[0].preview.primary }} />
                  </div>
                  <div
                    className="w-1/2 h-full flex items-center justify-center"
                    style={{ backgroundColor: themeModes[1].preview.surface }}
                  >
                    <Moon className="w-3 h-3" style={{ color: themeModes[1].preview.primary }} />
                  </div>
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: t.preview.primary }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* 主题信息 */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p
                  className="font-semibold"
                  style={{ color: 'var(--theme-on-surface)' }}
                >
                  {t.label}
                </p>
                {/* 自动模式时显示当前实际主题 */}
                {actualTheme && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--theme-primary-container)',
                      color: 'var(--theme-on-primary-container)',
                    }}
                  >
                    当前: {actualTheme === 'dark' ? '暗夜' : '日间'}
                  </span>
                )}
              </div>
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
