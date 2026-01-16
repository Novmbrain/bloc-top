/**
 * 户外探险主题
 *
 * 特点：大地色系、自然纹理、温暖
 * - 大地色调
 * - 温暖感觉
 * - 户外氛围
 */

import type { Theme } from './index'

export const outdoorTheme: Theme = {
  name: 'outdoor',
  label: '户外探险',
  description: '大地色调，户外氛围',
  colors: {
    // 主色 - 岩石棕
    primary: '#8B7355',
    onPrimary: '#ffffff',
    // 表面色 - 暖白
    surface: '#FAF8F5',
    surfaceVariant: '#F0EDE8',
    // 文字色 - 深棕
    onSurface: '#2C2826',
    onSurfaceVariant: '#6B635C',
    // 边框色
    outline: '#D4CFC7',
    outlineVariant: '#E8E4DE',
    // 状态色（稍微调暗以适应暖色调）
    warning: '#d97706',
    error: '#dc2626',
    success: '#16a34a',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(139, 115, 85, 0.08)',
    md: '0 2px 6px rgba(139, 115, 85, 0.12)',
    lg: '0 4px 16px rgba(139, 115, 85, 0.15)',
  },
}
