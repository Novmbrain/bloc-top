/**
 * 主题切换器组件测试
 *
 * 测试覆盖:
 * - 渲染三个主题选项
 * - 选中态显示
 * - 点击切换主题
 * - 自动模式提示
 * - 无障碍属性
 *
 * 注意：由于组件使用 next-intl，测试中 mock 会返回翻译键而非实际文本
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// 使用 vi.hoisted 确保 mock 状态在 vi.mock 提升时可用
const { mockState } = vi.hoisted(() => ({
  mockState: {
    theme: 'light',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  },
}))

// Mock next-themes - 使用 hoisted 的 mockState
vi.mock('next-themes', () => ({
  useTheme: () => mockState,
}))

// 必须在 vi.mock 之后导入组件
import { ThemeSwitcher } from './theme-switcher'

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.theme = 'light'
    mockState.resolvedTheme = 'light'
    mockState.setTheme = vi.fn()
  })

  describe('渲染', () => {
    it('渲染三个主题选项', () => {
      render(<ThemeSwitcher />)

      // 使用翻译键匹配（mock 返回键名）
      expect(screen.getByRole('tab', { name: /themeLight/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /themeDark/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /themeSystem/i })).toBeInTheDocument()
    })

    it('渲染 tablist 容器', () => {
      render(<ThemeSwitcher />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      // aria-label 使用翻译键
      expect(tablist).toHaveAttribute('aria-label', 'themeSelector')
    })

    it('每个选项都有正确的 ARIA 属性', () => {
      render(<ThemeSwitcher />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)

      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected')
        expect(tab).toHaveAttribute('aria-controls')
      })
    })
  })

  describe('选中态', () => {
    it('light 模式下日间按钮选中', () => {
      mockState.theme = 'light'
      render(<ThemeSwitcher />)

      const lightTab = screen.getByRole('tab', { name: /themeLight/i })
      expect(lightTab).toHaveAttribute('aria-selected', 'true')

      const darkTab = screen.getByRole('tab', { name: /themeDark/i })
      expect(darkTab).toHaveAttribute('aria-selected', 'false')
    })

    it('dark 模式下暗夜按钮选中', () => {
      mockState.theme = 'dark'
      render(<ThemeSwitcher />)

      const darkTab = screen.getByRole('tab', { name: /themeDark/i })
      expect(darkTab).toHaveAttribute('aria-selected', 'true')

      const lightTab = screen.getByRole('tab', { name: /themeLight/i })
      expect(lightTab).toHaveAttribute('aria-selected', 'false')
    })

    it('system 模式下自动按钮选中', () => {
      mockState.theme = 'system'
      render(<ThemeSwitcher />)

      const systemTab = screen.getByRole('tab', { name: /themeSystem/i })
      expect(systemTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('点击交互', () => {
    it('点击暗夜按钮调用 setTheme("dark")', () => {
      render(<ThemeSwitcher />)

      const darkTab = screen.getByRole('tab', { name: /themeDark/i })
      fireEvent.click(darkTab)

      expect(mockState.setTheme).toHaveBeenCalledWith('dark')
    })

    it('点击日间按钮调用 setTheme("light")', () => {
      mockState.theme = 'dark'
      render(<ThemeSwitcher />)

      const lightTab = screen.getByRole('tab', { name: /themeLight/i })
      fireEvent.click(lightTab)

      expect(mockState.setTheme).toHaveBeenCalledWith('light')
    })

    it('点击自动按钮调用 setTheme("system")', () => {
      render(<ThemeSwitcher />)

      const systemTab = screen.getByRole('tab', { name: /themeSystem/i })
      fireEvent.click(systemTab)

      expect(mockState.setTheme).toHaveBeenCalledWith('system')
    })
  })

  describe('自动模式提示', () => {
    it('system 模式显示当前跟随的主题（暗夜）', () => {
      mockState.theme = 'system'
      mockState.resolvedTheme = 'dark'
      render(<ThemeSwitcher />)

      // 翻译键格式：followingSystem，参数 {theme} 替换为 themeDark
      expect(screen.getByText(/followingSystem/i)).toBeInTheDocument()
    })

    it('system 模式显示当前跟随的主题（日间）', () => {
      mockState.theme = 'system'
      mockState.resolvedTheme = 'light'
      render(<ThemeSwitcher />)

      expect(screen.getByText(/followingSystem/i)).toBeInTheDocument()
    })

    it('非 system 模式不显示跟随提示', () => {
      mockState.theme = 'light'
      render(<ThemeSwitcher />)

      expect(screen.queryByText(/followingSystem/i)).not.toBeInTheDocument()
    })

    it('dark 模式不显示跟随提示', () => {
      mockState.theme = 'dark'
      render(<ThemeSwitcher />)

      expect(screen.queryByText(/followingSystem/i)).not.toBeInTheDocument()
    })
  })

  describe('样式一致性', () => {
    it('所有按钮都有相同的基础类名', () => {
      render(<ThemeSwitcher />)

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab.className).toContain('flex-1')
        expect(tab.className).toContain('flex')
        expect(tab.className).toContain('items-center')
      })
    })
  })

  describe('用户场景', () => {
    it('用户从日间切换到暗夜', () => {
      mockState.theme = 'light'
      render(<ThemeSwitcher />)

      // 初始状态：日间选中
      expect(screen.getByRole('tab', { name: /themeLight/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )

      // 点击暗夜
      fireEvent.click(screen.getByRole('tab', { name: /themeDark/i }))
      expect(mockState.setTheme).toHaveBeenCalledWith('dark')
    })

    it('用户切换到自动模式后看到系统当前主题', () => {
      mockState.theme = 'system'
      mockState.resolvedTheme = 'dark'
      render(<ThemeSwitcher />)

      // 自动模式选中
      expect(screen.getByRole('tab', { name: /themeSystem/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )

      // 显示当前跟随的主题
      expect(screen.getByText(/followingSystem/i)).toBeInTheDocument()
    })
  })
})
