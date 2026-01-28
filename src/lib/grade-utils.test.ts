import { describe, it, expect } from 'vitest'
import { parseGrade, compareGrades } from './grade-utils'

describe('grade-utils', () => {
  describe('parseGrade', () => {
    it('应该解析标准 V 等级', () => {
      expect(parseGrade('V0')).toBe(0)
      expect(parseGrade('V5')).toBe(5)
      expect(parseGrade('V10')).toBe(10)
      expect(parseGrade('V13')).toBe(13)
    })

    it('应该对未知难度返回 -1', () => {
      expect(parseGrade('？')).toBe(-1)
    })

    it('应该对无效输入返回 -1', () => {
      expect(parseGrade('invalid')).toBe(-1)
      expect(parseGrade('')).toBe(-1)
    })
  })

  describe('compareGrades', () => {
    it('应该正确比较难度等级', () => {
      expect(compareGrades('V0', 'V5')).toBeLessThan(0)
      expect(compareGrades('V5', 'V0')).toBeGreaterThan(0)
      expect(compareGrades('V3', 'V3')).toBe(0)
    })

    it('应该将未知难度排在最前', () => {
      expect(compareGrades('？', 'V0')).toBeLessThan(0)
    })
  })
})
