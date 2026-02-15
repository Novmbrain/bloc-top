/**
 * 主题系统类型定义和导出
 *
 * 支持三种模式：
 * - light: 日间模式（Dracula Light）
 * - dark: 暗夜模式（Dracula）
 * - system: 自动模式（跟随系统偏好）
 */

import { lightTheme } from './light'
import { darkTheme } from './dark'

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
  name: 'light' | 'dark'
  label: string
  description: string
  colors: ThemeColors
  radius: ThemeRadius
  shadow: ThemeShadow
}

// 主题名称类型（实际应用的主题）
export type ThemeName = Theme['name']

// 主题模式类型（用户选择的模式，包含 auto）
export type ThemeMode = 'light' | 'dark' | 'system'

// 主题配置映射
export const themes: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
}

// 主题模式列表（用于切换器展示）
export const themeModes: { mode: ThemeMode; label: string; description: string }[] = [
  { mode: 'light', label: '日间', description: '明亮清爽' },
  { mode: 'dark', label: '暗夜', description: 'Dracula 配色' },
  { mode: 'system', label: '自动', description: '跟随系统设置' },
]

// 默认主题模式
export const defaultThemeMode: ThemeMode = 'system'

// 获取主题配置
export function getThemeConfig(name: ThemeName): Theme {
  return themes[name] || themes.light
}

// 导出主题配置
export { lightTheme, darkTheme }
