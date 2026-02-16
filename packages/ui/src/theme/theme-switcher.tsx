'use client'

import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { SegmentedControl, type SegmentOption } from '../components/segmented-control'
import type { ThemeMode } from '@/lib/themes'

/**
 * 主题切换器组件
 *
 * 使用 SegmentedControl 实现日间/暗夜/自动模式切换，
 * 带有平滑的滑块动画效果。
 */
export function ThemeSwitcher() {
  const t = useTranslations('Profile')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 确保客户端渲染（Next.js SSR hydration 标准模式）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration 必需
    setMounted(true)
  }, [])

  // 主题模式配置
  const themeModes: SegmentOption<ThemeMode>[] = useMemo(() => [
    { value: 'light', label: t('themeLight'), icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: t('themeDark'), icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: t('themeSystem'), icon: <Monitor className="w-4 h-4" /> },
  ], [t])

  if (!mounted) {
    return (
      <div
        className="h-12 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
      />
    )
  }

  // 自动模式时显示当前实际主题的指示
  const isSystemMode = theme === 'system'
  const actualThemeLabel = resolvedTheme === 'dark' ? t('themeDark') : t('themeLight')

  return (
    <div className="space-y-2">
      <SegmentedControl
        options={themeModes}
        value={(theme as ThemeMode) || 'system'}
        onChange={setTheme}
        ariaLabel={t('themeSelector')}
      />

      {/* 自动模式提示 */}
      {isSystemMode && (
        <p
          className="text-xs text-center animate-fade-in"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          {t('followingSystem', { theme: actualThemeLabel })}
        </p>
      )}
    </div>
  )
}
