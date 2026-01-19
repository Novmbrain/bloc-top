/**
 * 暗夜主题 - Dracula
 *
 * 基于经典 Dracula 配色方案
 * 官方规范: https://draculatheme.com/contribute
 *
 * 特点：
 * - 深紫灰背景，比纯黑更柔和护眼
 * - 紫色主色调，标志性的 Dracula Purple
 * - 4.5:1 对比度符合 WCAG 2.1 无障碍标准
 */

import type { Theme } from './index'

// Dracula 官方配色
const DRACULA = {
  background: '#282A36',
  currentLine: '#44475A',
  foreground: '#F8F8F2',
  comment: '#6272A4',
  cyan: '#8BE9FD',
  green: '#50FA7B',
  orange: '#FFB86C',
  pink: '#FF79C6',
  purple: '#BD93F9',
  red: '#FF5555',
  yellow: '#F1FA8C',
}

export const darkTheme: Theme = {
  name: 'dark',
  label: '暗夜',
  description: 'Dracula 配色，护眼舒适',
  colors: {
    // 主色 - Dracula Purple
    primary: DRACULA.purple,
    onPrimary: DRACULA.background,
    // 表面色 - Dracula 背景色
    surface: DRACULA.background,
    surfaceVariant: DRACULA.currentLine,
    // 文字色 - Dracula 前景色
    onSurface: DRACULA.foreground,
    onSurfaceVariant: DRACULA.comment,
    // 边框色
    outline: DRACULA.currentLine,
    outlineVariant: '#383A46',
    // 状态色 - 使用 Dracula 官方色彩
    warning: DRACULA.orange,
    error: DRACULA.red,
    success: DRACULA.green,
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 2px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
}

// 导出 Dracula 色彩常量，供其他组件使用
export { DRACULA }
