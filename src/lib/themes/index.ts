/**
 * 主题系统类型定义和导出
 *
 * 支持两种主题：极简专业 (minimal) 和 户外探险 (outdoor)
 */

import { minimalTheme } from './minimal'
import { outdoorTheme } from './outdoor'

// 主题颜色配置接口
export interface ThemeColors {
  primary: string
  onPrimary: string
  surface: string
  surfaceVariant: string
  onSurface: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  // 状态色
  warning: string
  error: string
  success: string
}

// 主题圆角配置接口
export interface ThemeRadius {
  sm: string
  md: string
  lg: string
  xl: string
  full: string
}

// 主题阴影配置接口
export interface ThemeShadow {
  sm: string
  md: string
  lg: string
}

// 完整主题配置接口
export interface Theme {
  name: 'minimal' | 'outdoor'
  label: string
  description: string
  colors: ThemeColors
  radius: ThemeRadius
  shadow: ThemeShadow
}

// 主题名称类型
export type ThemeName = Theme['name']

// 主题配置映射
export const themes: Record<ThemeName, Theme> = {
  minimal: minimalTheme,
  outdoor: outdoorTheme,
}

// 主题列表（用于切换器展示）
export const themeList: Theme[] = [minimalTheme, outdoorTheme]

// 默认主题
export const defaultTheme: ThemeName = 'minimal'

// 获取主题配置
export function getThemeConfig(name: ThemeName): Theme {
  return themes[name] || themes[defaultTheme]
}

// 导出主题配置
export { minimalTheme, outdoorTheme }
