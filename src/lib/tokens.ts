// Design Tokens - 从源项目迁移
// 用于 JS/TS 中需要直接使用颜色值的场景

export const colors = {
  primary: '#667eea',
  onPrimary: '#ffffff',
  primaryContainer: '#e0e5ff',
  onPrimaryContainer: '#1a1b4b',
  secondary: '#5c5d72',
  onSecondary: '#ffffff',
  secondaryContainer: '#e1e0f9',
  surface: '#fefbff',
  surfaceVariant: '#e4e1ec',
  onSurface: '#1c1b1f',
  onSurfaceVariant: '#46464f',
  outline: '#777680',
  outlineVariant: '#c7c5d0',
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  pagePadding: '1rem',
} as const

export const radius = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.75rem',
} as const

export const fontSize = {
  displayLarge: '3.5rem',
  headlineLarge: '3rem',
  headlineMedium: '2.5rem',
  titleLarge: '2.25rem',
  titleMedium: '2rem',
  bodyLarge: '1.75rem',
  bodyMedium: '1.5rem',
  labelLarge: '1.75rem',
  labelMedium: '1.5rem',
  labelSmall: '1.25rem',
} as const

export const elevation = {
  none: 'none',
  level1: '0 1px 2px rgba(0,0,0,0.08)',
  level2: '0 2px 4px rgba(0,0,0,0.10)',
  level3: '0 3px 8px rgba(0,0,0,0.12)',
  level4: '0 4px 12px rgba(0,0,0,0.14)',
  level5: '0 6px 16px rgba(0,0,0,0.16)',
} as const

// 难度颜色映射
export const gradeColors: Record<string, string> = {
  V0: '#4CAF50',
  V1: '#8BC34A',
  V2: '#CDDC39',
  V3: '#FFEB3B',
  V4: '#FFC107',
  V5: '#FF9800',
  V6: '#FF5722',
  V7: '#F44336',
  V8: '#E91E63',
  V9: '#9C27B0',
  V10: '#673AB7',
  V11: '#3F51B5',
  V12: '#2196F3',
  V13: '#00BCD4',
  '？': '#9E9E9E',
}

export function getGradeColor(grade: string): string {
  return gradeColors[grade] || gradeColors['？']
}
