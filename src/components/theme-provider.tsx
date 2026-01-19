'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * 主题提供者组件
 *
 * 使用 next-themes 实现主题切换，配置说明：
 * - attribute="class": 通过 .dark 类切换主题（标准 Tailwind 方式）
 * - defaultTheme="system": 默认跟随系统偏好（自动模式）
 * - themes: 定义可用的主题列表
 * - enableSystem={true}: 启用系统主题检测（自动模式核心）
 * - storageKey: localStorage 中存储主题的键名（永久存储）
 * - disableTransitionOnChange={false}: 允许切换时的过渡动画
 *
 * 主题模式说明：
 * - 'light': 日间模式（Dracula Light）
 * - 'dark': 暗夜模式（Dracula）
 * - 'system': 自动模式（跟随系统偏好）
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      themes={['light', 'dark']}
      enableSystem={true}
      storageKey="app-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
