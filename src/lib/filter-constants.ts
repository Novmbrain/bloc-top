/**
 * 线路筛选相关常量配置
 * 用于岩场和难度分类筛选功能
 */

import { getGradeColor } from '@/lib/tokens'

/**
 * 所有可用的 V 难度等级
 * 直接使用 V 等级作为筛选选项，更符合攀岩者习惯
 */
export const V_GRADES = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13'
] as const

/**
 * 难度筛选配置
 * 每个等级直接对应一个筛选选项
 */
export const GRADE_GROUPS = V_GRADES.map(grade => ({
  label: grade,
  value: grade,
  grades: [grade],
  color: getGradeColor(grade)
}))

/**
 * 根据 URL 参数值获取对应的难度等级数组
 */
export function getGradesByValue(value: string): string[] {
  const group = GRADE_GROUPS.find(g => g.value === value)
  return group ? [...group.grades] : []
}

/**
 * 根据多个 URL 参数值获取所有对应的难度等级
 */
export function getGradesByValues(values: string[]): string[] {
  return values.flatMap(getGradesByValue)
}

/**
 * URL 参数名称常量
 */
export const FILTER_PARAMS = {
  CRAG: 'crag',
  GRADE: 'grade',
  QUERY: 'q',
  SORT: 'sort',
  FACE: 'face',
} as const

/**
 * 排序方向类型
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 默认排序方向（从简单到难）
 */
export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc'

/**
 * 搜索框 placeholder
 * 示例拼音 ywct = 岩壁餐厅（圆通寺岩场热门线路）
 */
export const SEARCH_PLACEHOLDER = '搜索线路，支持拼音如 ywct'
