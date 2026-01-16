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
 * - attribute="data-theme": 通过 data-theme 属性切换主题
 * - defaultTheme="minimal": 默认使用极简专业主题
 * - themes: 定义可用的主题列表
 * - enableSystem={false}: 禁用系统主题检测（仅支持手动切换）
 * - storageKey: localStorage 中存储主题的键名
 * - disableTransitionOnChange={false}: 允许切换时的过渡动画
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="minimal"
      themes={['minimal', 'outdoor']}
      enableSystem={false}
      storageKey="app-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}
