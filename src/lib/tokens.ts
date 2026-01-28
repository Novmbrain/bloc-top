// Design Tokens - 难度颜色映射
// 其他设计令牌已迁移到 CSS 变量 (globals.css)

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
