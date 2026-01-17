import { describe, it, expect } from 'vitest'
import {
  parseGrade,
  compareGrades,
  calculateGradeRange,
  getGradeDisplayColor,
  getGradeDescription,
} from './grade-utils'

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

  describe('calculateGradeRange', () => {
    it('应该计算难度范围', () => {
      expect(calculateGradeRange(['V2', 'V5', 'V3'])).toBe('V2 - V5')
    })

    it('应该处理单一难度', () => {
      expect(calculateGradeRange(['V3'])).toBe('V3')
    })

    it('应该处理相同难度', () => {
      expect(calculateGradeRange(['V3', 'V3', 'V3'])).toBe('V3')
    })

    it('应该忽略未知难度', () => {
      expect(calculateGradeRange(['V2', '？', 'V5'])).toBe('V2 - V5')
    })

    it('应该处理全部为未知难度', () => {
      expect(calculateGradeRange(['？', '？'])).toBe('暂无')
    })

    it('应该处理空数组', () => {
      expect(calculateGradeRange([])).toBe('暂无')
    })
  })

  describe('getGradeDisplayColor', () => {
    it('应该为入门难度返回绿色', () => {
      const color = getGradeDisplayColor('V0')
      expect(color.text).toBe('#4CAF50')
    })

    it('应该为进阶难度返回橙色', () => {
      const color = getGradeDisplayColor('V5')
      expect(color.text).toBe('#FF9800')
    })

    it('应该为高级难度返回红色', () => {
      const color = getGradeDisplayColor('V8')
      expect(color.text).toBe('#F44336')
    })

    it('应该为精英难度返回紫色', () => {
      const color = getGradeDisplayColor('V10')
      expect(color.text).toBe('#9C27B0')
    })

    it('应该为未知难度返回灰色', () => {
      const color = getGradeDisplayColor('？')
      expect(color.text).toBe('#9E9E9E')
    })
  })

  describe('getGradeDescription', () => {
    it('应该返回正确的难度描述', () => {
      expect(getGradeDescription('V0')).toBe('入门级')
      expect(getGradeDescription('V2')).toBe('初级')
      expect(getGradeDescription('V4')).toBe('中级')
      expect(getGradeDescription('V6')).toBe('高级')
      expect(getGradeDescription('V8')).toBe('专业级')
      expect(getGradeDescription('V10')).toBe('精英级')
    })

    it('应该为未知难度返回正确描述', () => {
      expect(getGradeDescription('？')).toBe('未知难度')
    })
  })
})
