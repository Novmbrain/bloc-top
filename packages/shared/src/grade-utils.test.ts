import { describe, it, expect } from 'vitest'
import { parseGrade, compareGrades, vToFont, computeGradeRange, formatGradeRange } from './grade-utils'

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

  describe('vToFont', () => {
    it('应该转换一对一映射的难度', () => {
      expect(vToFont('Vb')).toBe('3')
      expect(vToFont('V0')).toBe('4')
      expect(vToFont('V1')).toBe('5')
      expect(vToFont('V2')).toBe('5+')
      expect(vToFont('V6')).toBe('7A')
      expect(vToFont('V7')).toBe('7A+')
      expect(vToFont('V9')).toBe('7C')
      expect(vToFont('V10')).toBe('7C+')
      expect(vToFont('V11')).toBe('8A')
      expect(vToFont('V12')).toBe('8A+')
      expect(vToFont('V13')).toBe('8B')
    })

    it('应该转换一对多映射为范围格式', () => {
      expect(vToFont('V3')).toBe('6A~6A+')
      expect(vToFont('V4')).toBe('6B~6B+')
      expect(vToFont('V5')).toBe('6C~6C+')
      expect(vToFont('V8')).toBe('7B~7B+')
    })

    it('应该对未知难度返回 null', () => {
      expect(vToFont('？')).toBeNull()
    })

    it('应该对无效输入返回 null', () => {
      expect(vToFont('invalid')).toBeNull()
      expect(vToFont('')).toBeNull()
    })

    it('应该支持高难度转换', () => {
      expect(vToFont('V14')).toBe('8B+')
      expect(vToFont('V15')).toBe('8C')
      expect(vToFont('V16')).toBe('8C+')
      expect(vToFont('V17')).toBe('9A')
    })
  })

  describe('computeGradeRange', () => {
    it('应该返回排序后的最低和最高难度', () => {
      expect(computeGradeRange(['V3', 'V1', 'V5'])).toEqual({ min: 'V1', max: 'V5' })
    })

    it('所有相同难度时 min 和 max 相同', () => {
      expect(computeGradeRange(['V3', 'V3', 'V3'])).toEqual({ min: 'V3', max: 'V3' })
    })

    it('应该过滤掉中文问号（？）', () => {
      expect(computeGradeRange(['V2', '？', 'V8'])).toEqual({ min: 'V2', max: 'V8' })
    })

    it('应该过滤掉英文问号（?）', () => {
      expect(computeGradeRange(['V0', '?', 'V4'])).toEqual({ min: 'V0', max: 'V4' })
    })

    it('全部为未知难度时返回 null', () => {
      expect(computeGradeRange(['？', '?'])).toBeNull()
    })

    it('空数组返回 null', () => {
      expect(computeGradeRange([])).toBeNull()
    })

    it('单个有效难度时 min === max', () => {
      expect(computeGradeRange(['V5'])).toEqual({ min: 'V5', max: 'V5' })
    })

    it('应该正确处理大范围难度', () => {
      expect(computeGradeRange(['V0', 'V13', 'V5', 'V8'])).toEqual({ min: 'V0', max: 'V13' })
    })
  })

  describe('formatGradeRange', () => {
    it('不同难度时显示范围', () => {
      expect(formatGradeRange({ min: 'V2', max: 'V8' })).toBe('V2 - V8')
    })

    it('相同难度时不显示范围', () => {
      expect(formatGradeRange({ min: 'V5', max: 'V5' })).toBe('V5')
    })

    it('null 输入返回 null', () => {
      expect(formatGradeRange(null)).toBeNull()
    })

    it('支持自定义分隔符', () => {
      expect(formatGradeRange({ min: 'V1', max: 'V6' }, '-')).toBe('V1-V6')
      expect(formatGradeRange({ min: 'V1', max: 'V6' }, '~')).toBe('V1~V6')
    })
  })
})
