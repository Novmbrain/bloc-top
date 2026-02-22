/**
 * LocaleSwitcher 组件测试
 * 测试语言切换器的各种变体
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { LocaleSwitcher, LocaleSegmented, LocaleSelect } from './locale-switcher'

// Mock useRouter
const mockReplace = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/test-path',
}))

// Mock routing config
vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
  },
}))

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染为按钮', () => {
      render(<LocaleSwitcher />)

      expect(screen.getByRole('button')).toBeTruthy()
    })

    it('应该显示切换目标语言', () => {
      render(<LocaleSwitcher />)

      // 当前是 zh，显示 en 翻译 key
      expect(screen.getByText('en')).toBeTruthy()
    })

    it('应该有 aria-label', () => {
      render(<LocaleSwitcher />)

      expect(screen.getByRole('button').getAttribute('aria-label')).toBe('switchLanguage')
    })
  })

  describe('交互', () => {
    it('点击应调用路由切换', () => {
      render(<LocaleSwitcher />)

      fireEvent.click(screen.getByRole('button'))

      expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' })
    })
  })
})

describe('LocaleSegmented', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染分段控制器', async () => {
      render(<LocaleSegmented />)

      // 等待 SSR hydration
      // SegmentedControl 使用 role="tablist"
      expect(await screen.findByRole('tablist')).toBeTruthy()
    })

    it('应该渲染所有语言选项', async () => {
      render(<LocaleSegmented />)

      // 等待 mounted
      expect(await screen.findByText('zh')).toBeTruthy()
      expect(screen.getByText('en')).toBeTruthy()
    })

    it('应该支持 className', async () => {
      render(<LocaleSegmented className="custom-class" />)

      const tablist = await screen.findByRole('tablist')
      expect((tablist as HTMLElement).classList.contains('custom-class')).toBe(true)
    })
  })

  describe('交互', () => {
    it('点击其他语言应切换', async () => {
      render(<LocaleSegmented />)

      // 等待 mounted
      await screen.findByRole('tablist')

      // 点击 en 选项
      fireEvent.click(screen.getByText('en'))

      expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' })
    })
  })
})

describe('LocaleSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染下拉选择框', () => {
      render(<LocaleSelect />)

      expect(screen.getByRole('combobox')).toBeTruthy()
    })

    it('应该包含所有语言选项', () => {
      render(<LocaleSelect />)

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
    })

    it('应该支持 className', () => {
      const { container } = render(<LocaleSelect className="custom-class" />)

      expect((container.firstChild as HTMLElement).classList.contains('custom-class')).toBe(true)
    })
  })

  describe('交互', () => {
    it('选择其他语言应切换', () => {
      render(<LocaleSelect />)

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'en' } })

      expect(mockReplace).toHaveBeenCalledWith('/test-path', { locale: 'en' })
    })
  })
})
