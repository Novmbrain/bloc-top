'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import type { ThemeMode } from '@/lib/themes'

// 主题模式配置
const themeModes: {
  mode: ThemeMode
  label: string
  icon: typeof Sun
}[] = [
  { mode: 'light', label: '日间', icon: Sun },
  { mode: 'dark', label: '暗夜', icon: Moon },
  { mode: 'system', label: '自动', icon: Monitor },
]

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // 确保客户端渲染（Next.js SSR hydration 标准模式）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration 必需
    setMounted(true)
  }, [])

  // 计算滑块位置
  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const activeIndex = themeModes.findIndex((t) => t.mode === theme)
    if (activeIndex === -1) return

    const buttons = containerRef.current.querySelectorAll('button')
    const activeButton = buttons[activeIndex] as HTMLButtonElement

    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [theme, mounted])

  if (!mounted) {
    // 骨架占位
    return (
      <div
        className="h-12 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
      />
    )
  }

  // 自动模式时显示当前实际主题的指示
  const isSystemMode = theme === 'system'
  const actualThemeLabel = resolvedTheme === 'dark' ? '暗夜' : '日间'

  return (
    <div className="space-y-2">
      {/* Segmented Control */}
      <div
        ref={containerRef}
        className="relative flex p-1 rounded-xl"
        style={{
          backgroundColor: 'var(--theme-surface-variant)',
        }}
        role="tablist"
        aria-label="主题模式选择"
      >
        {/* 滑动背景指示器 */}
        <div
          className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            backgroundColor: 'var(--theme-surface)',
            boxShadow: 'var(--theme-shadow-sm)',
            // Apple 风格弹性曲线
            transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        />

        {/* 选项按钮 */}
        {themeModes.map((t) => {
          const isSelected = theme === t.mode
          const Icon = t.icon

          return (
            <button
              key={t.mode}
              onClick={() => setTheme(t.mode)}
              className="relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-colors duration-200"
              style={{
                color: isSelected
                  ? 'var(--theme-primary)'
                  : 'var(--theme-on-surface-variant)',
              }}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`theme-panel-${t.mode}`}
            >
              <Icon
                className="w-4 h-4 transition-transform duration-200"
                style={{
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              <span
                className="text-sm transition-all duration-200"
                style={{
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 自动模式提示 */}
      {isSystemMode && (
        <p
          className="text-xs text-center animate-fade-in"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          当前跟随系统：{actualThemeLabel}
        </p>
      )}
    </div>
  )
}
