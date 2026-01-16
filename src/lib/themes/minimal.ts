/**
 * 极简专业主题
 *
 * 特点：黑白灰、信息密度高、专业
 * - 高对比度
 * - 紧凑布局
 * - 信息优先
 */

import type { Theme } from './index'

export const minimalTheme: Theme = {
  name: 'minimal',
  label: '极简专业',
  description: '黑白灰色调，专注内容',
  colors: {
    // 主色 - 纯黑
    primary: '#1a1a1a',
    onPrimary: '#ffffff',
    // 表面色
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    // 文字色
    onSurface: '#1a1a1a',
    onSurfaceVariant: '#666666',
    // 边框色
    outline: '#e0e0e0',
    outlineVariant: '#f0f0f0',
    // 状态色
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#22c55e',
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
