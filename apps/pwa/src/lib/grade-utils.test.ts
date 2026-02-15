import { describe, it, expect } from 'vitest'
import { parseGrade, compareGrades, vToFont } from './grade-utils'

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
})
