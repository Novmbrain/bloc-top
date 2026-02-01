/**
 * 难度等级工具函数
 */

/**
 * 解析难度等级为数字
 */
export function parseGrade(grade: string): number {
  if (grade === '？') return -1
  const match = grade.match(/V(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

/**
 * 比较两个难度等级
 * 返回值：负数表示 a < b，0 表示相等，正数表示 a > b
 */
export function compareGrades(a: string, b: string): number {
  return parseGrade(a) - parseGrade(b)
}
