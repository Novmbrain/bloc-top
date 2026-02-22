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

/**
 * V-Scale → Font (Fontainebleau) Scale 转换映射
 * 一对多映射使用 "~" 连接范围，如 V3 → "6A~6A+"
 */
const V_TO_FONT: Record<string, string> = {
  Vb: '3',
  V0: '4',
  V1: '5',
  V2: '5+',
  V3: '6A~6A+',
  V4: '6B~6B+',
  V5: '6C~6C+',
  V6: '7A',
  V7: '7A+',
  V8: '7B~7B+',
  V9: '7C',
  V10: '7C+',
  V11: '8A',
  V12: '8A+',
  V13: '8B',
  V14: '8B+',
  V15: '8C',
  V16: '8C+',
  V17: '9A',
}

/**
 * 将 V-Scale 难度转换为 Font (Fontainebleau) Scale
 * @returns Font scale 字符串，无法转换时返回 null
 */
export function vToFont(grade: string): string | null {
  return V_TO_FONT[grade] ?? null
}

/**
 * 从线路难度数组中计算难度范围
 * 过滤掉未知难度（？/?），按 V-Scale 排序后返回最低和最高难度
 *
 * @param grades - 线路难度字符串数组 (e.g. ['V3', 'V5', '？', 'V1'])
 * @returns `{ min, max }` 或 `null`（所有线路均为未知难度时）
 */
export function computeGradeRange(grades: string[]): { min: string; max: string } | null {
  const valid = grades.filter((g) => g !== '？' && g !== '?')
  if (valid.length === 0) return null
  const sorted = [...valid].sort(compareGrades)
  return { min: sorted[0], max: sorted[sorted.length - 1] }
}

/**
 * 将难度范围格式化为显示字符串
 * @param range - `computeGradeRange()` 的返回值
 * @param separator - 分隔符，默认 ' - '
 * @returns 格式化字符串，如 'V2 - V8' 或 'V5'（相同时不显示范围）
 */
export function formatGradeRange(
  range: { min: string; max: string } | null,
  separator = ' - '
): string | null {
  if (!range) return null
  return range.min === range.max ? range.min : `${range.min}${separator}${range.max}`
}
