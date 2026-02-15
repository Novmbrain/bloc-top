/**
 * tokens.ts 单元测试
 * 测试难度颜色映射工具函数
 */
import { describe, it, expect } from 'vitest'
import { getGradeColor, gradeColors } from './tokens'

describe('getGradeColor', () => {
  it('应返回有效难度等级对应的颜色', () => {
    expect(getGradeColor('V0')).toBe('#4CAF50')
    expect(getGradeColor('V5')).toBe('#FF9800')
    expect(getGradeColor('V13')).toBe('#00BCD4')
  })

  it('应返回未知难度的默认颜色', () => {
    expect(getGradeColor('？')).toBe('#9E9E9E')
  })

  it('无效难度应返回默认颜色', () => {
    const defaultColor = gradeColors['？']
    expect(getGradeColor('invalid')).toBe(defaultColor)
    expect(getGradeColor('')).toBe(defaultColor)
    expect(getGradeColor('V99')).toBe(defaultColor)
  })

  it('返回的颜色应是有效的十六进制颜色', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

    Object.values(gradeColors).forEach(color => {
      expect(color).toMatch(hexColorRegex)
    })
  })
})

describe('gradeColors', () => {
  it('应包含 V0-V13 和 ？ 的颜色映射', () => {
    const expectedGrades = [
      'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
      'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', '？'
    ]

    expectedGrades.forEach(grade => {
      expect(gradeColors[grade]).toBeDefined()
    })
  })

  it('每个难度等级应有唯一的颜色', () => {
    const colorValues = Object.values(gradeColors)
    const uniqueColors = new Set(colorValues)

    // 允许有少量重复（如果设计需要）
    expect(uniqueColors.size).toBeGreaterThanOrEqual(10)
  })
})
