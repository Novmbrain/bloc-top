/**
 * 日间主题 - Dracula Light
 *
 * 与 Dracula 暗夜主题呼应的浅色主题
 * - 主色使用 Dracula Purple 的日间变体
 * - 背景带微妙的紫色调
 * - 保持 WCAG 2.1 无障碍对比度
 */

import type { Theme } from './index'

export const lightTheme: Theme = {
  name: 'light',
  label: '日间',
  description: '明亮清爽，适合白天使用',
  colors: {
    // 主色 - Dracula Purple 深化版本（日间可读性更好）
    primary: '#7C3AED',
    onPrimary: '#ffffff',
    // 表面色 - 带微妙紫色调的暖白
    surface: '#FAFAFA',
    surfaceVariant: '#F3F0F7',
    // 文字色 - 深色但不是纯黑
    onSurface: '#1E1E2E',
    onSurfaceVariant: '#6B7280',
    // 边框色
    outline: '#E5E5E5',
    outlineVariant: '#F0F0F0',
    // 状态色 - 使用 Dracula 色彩的日间变体
    warning: '#D97706',
    error: '#DC2626',
    success: '#059669',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
}
