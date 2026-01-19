/**
 * 主题系统工具函数测试
 */
import { describe, it, expect } from 'vitest'
import {
  themes,
  themeModes,
  defaultThemeMode,
  getThemeConfig,
  lightTheme,
  darkTheme,
} from './index'

describe('主题系统', () => {
  describe('themes 映射', () => {
    it('包含 light 和 dark 两个主题', () => {
      expect(Object.keys(themes)).toEqual(['light', 'dark'])
    })

    it('light 主题配置完整', () => {
      const theme = themes.light
      expect(theme.name).toBe('light')
      expect(theme.label).toBeDefined()
      expect(theme.colors.primary).toBeDefined()
      expect(theme.radius.md).toBeDefined()
      expect(theme.shadow.sm).toBeDefined()
    })

    it('dark 主题配置完整', () => {
      const theme = themes.dark
      expect(theme.name).toBe('dark')
      expect(theme.label).toBeDefined()
      expect(theme.colors.primary).toBeDefined()
    })
  })

  describe('themeModes', () => {
    it('包含所有可用模式 (light, dark, system)', () => {
      expect(themeModes).toHaveLength(3)
      expect(themeModes.map((m) => m.mode)).toEqual(['light', 'dark', 'system'])
    })

    it('每个模式都有标签和描述', () => {
      themeModes.forEach((mode) => {
        expect(mode.label).toBeDefined()
        expect(mode.description).toBeDefined()
      })
    })
  })

  describe('defaultThemeMode', () => {
    it('默认主题模式为 system (自动)', () => {
      expect(defaultThemeMode).toBe('system')
    })
  })

  describe('getThemeConfig', () => {
    it('返回请求的主题配置', () => {
      expect(getThemeConfig('light')).toBe(lightTheme)
      expect(getThemeConfig('dark')).toBe(darkTheme)
    })

    it('未知主题名返回 light 主题', () => {
      // @ts-expect-error 测试无效输入
      const result = getThemeConfig('invalid-theme')
      expect(result).toBe(lightTheme)
    })
  })

  describe('主题颜色完整性', () => {
    it.each(['light', 'dark'] as const)('%s 主题包含所有必需颜色', (themeName) => {
      const theme = themes[themeName]
      const requiredColors = [
        'primary',
        'onPrimary',
        'surface',
        'surfaceVariant',
        'onSurface',
        'onSurfaceVariant',
        'outline',
        'outlineVariant',
        'warning',
        'error',
        'success',
      ]

      requiredColors.forEach((color) => {
        expect(theme.colors).toHaveProperty(color)
      })
    })
  })

  describe('Dracula 配色规范', () => {
    it('dark 主题使用 Dracula 官方背景色', () => {
      expect(darkTheme.colors.surface).toBe('#282A36')
    })

    it('dark 主题使用 Dracula Purple 作为主色', () => {
      expect(darkTheme.colors.primary).toBe('#BD93F9')
    })

    it('dark 主题使用 Dracula Foreground 作为文字色', () => {
      expect(darkTheme.colors.onSurface).toBe('#F8F8F2')
    })
  })
})
