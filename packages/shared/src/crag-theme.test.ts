/**
 * 岩场主题选择测试
 */
import { describe, it, expect } from 'vitest'
import { getCragTheme } from './crag-theme'

describe('getCragTheme', () => {
  describe('预设主题', () => {
    it('yuan-tong-si 返回寺庙主题', () => {
      const theme = getCragTheme('yuan-tong-si')
      expect(theme.icon).toBe('🏛️')
      expect(theme.gradient).toContain('#8B7355')
    })

    it('ba-jing-cun 返回森林主题', () => {
      const theme = getCragTheme('ba-jing-cun')
      expect(theme.icon).toBe('🌲')
      expect(theme.gradient).toContain('#5C7C5C')
    })
  })

  describe('备用主题（确定性）', () => {
    it('相同 ID 总是返回相同主题', () => {
      const theme1 = getCragTheme('unknown-crag-123')
      const theme2 = getCragTheme('unknown-crag-123')

      expect(theme1).toEqual(theme2)
    })

    it('不同 ID 可能返回不同主题', () => {
      const theme1 = getCragTheme('crag-a')
      const theme2 = getCragTheme('crag-b')
      const theme3 = getCragTheme('crag-c')

      // 至少有一对不同（除非极端巧合）
      const allSame =
        theme1.icon === theme2.icon &&
        theme2.icon === theme3.icon
      expect(allSame).toBe(false)
    })
  })

  describe('主题结构完整性', () => {
    it('返回的主题包含所有必需字段', () => {
      const theme = getCragTheme('any-crag-id')

      expect(theme).toHaveProperty('gradient')
      expect(theme).toHaveProperty('icon')
      expect(theme).toHaveProperty('accentColor')

      // 验证类型
      expect(typeof theme.gradient).toBe('string')
      expect(typeof theme.icon).toBe('string')
      expect(typeof theme.accentColor).toBe('string')
    })

    it('渐变格式正确', () => {
      const theme = getCragTheme('yuan-tong-si')
      expect(theme.gradient).toMatch(/^linear-gradient/)
    })

    it('强调色是有效的颜色值', () => {
      const theme = getCragTheme('ba-jing-cun')
      expect(theme.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('边界情况', () => {
    it('空字符串 ID 返回有效主题', () => {
      const theme = getCragTheme('')
      expect(theme).toBeDefined()
      expect(theme.gradient).toBeDefined()
    })

    it('特殊字符 ID 返回有效主题', () => {
      const theme = getCragTheme('岩场-123_test')
      expect(theme).toBeDefined()
    })
  })
})
