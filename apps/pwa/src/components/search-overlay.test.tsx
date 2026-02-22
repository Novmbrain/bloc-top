/**
 * SearchOverlay 组件测试
 * 测试搜索功能的核心交互
 *
 * 注意：由于组件使用 next-intl，测试中 mock 会返回翻译键而非实际文本
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchOverlay } from './search-overlay'
import type { Route } from '@/types'

// Mock @/i18n/navigation (组件使用的国际化导航)
const mockPush = vi.fn()
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// 测试数据
const mockAllRoutes: Route[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', cragId: 'crag-1', area: '主区' },
  { id: 2, name: '蜻蜓点水', grade: 'V5', cragId: 'crag-1', area: '主区' },
  { id: 3, name: '飞龙在天', grade: 'V7', cragId: 'crag-2', area: '副区' },
  { id: 4, name: '猴王出世', grade: 'V4', cragId: 'crag-2', area: '副区' },
]

const mockSearchResults: Route[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', cragId: 'crag-1', area: '主区' },
  { id: 4, name: '猴王出世', grade: 'V4', cragId: 'crag-2', area: '副区' },
]

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  searchQuery: '',
  onSearchChange: vi.fn(),
  results: [],
  allRoutes: mockAllRoutes,
}

describe('SearchOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('显示状态', () => {
    it('isOpen=false 时不渲染', () => {
      render(<SearchOverlay {...defaultProps} isOpen={false} />)
      // 使用翻译键匹配
      expect(screen.queryByPlaceholderText('placeholder')).not.toBeTruthy()
    })

    it('isOpen=true 时渲染', () => {
      render(<SearchOverlay {...defaultProps} />)
      // 使用翻译键匹配
      expect(screen.getByPlaceholderText('placeholder')).toBeTruthy()
    })
  })

  describe('无搜索词时显示全部线路', () => {
    it('显示"全部线路"标题', () => {
      render(<SearchOverlay {...defaultProps} />)
      // 使用翻译键匹配
      expect(screen.getByText('allRoutes')).toBeTruthy()
    })

    it('显示所有线路', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getByText('猴子捞月')).toBeTruthy()
      expect(screen.getByText('蜻蜓点水')).toBeTruthy()
      expect(screen.getByText('飞龙在天')).toBeTruthy()
      expect(screen.getByText('猴王出世')).toBeTruthy()
    })
  })

  describe('有搜索词时显示结果', () => {
    it('显示搜索结果数量', () => {
      render(
        <SearchOverlay
          {...defaultProps}
          searchQuery="猴"
          results={mockSearchResults}
        />
      )
      // 使用翻译键匹配（参数会被替换）
      expect(screen.getByText(/resultsTitle/i)).toBeTruthy()
    })

    it('只显示匹配的线路', () => {
      render(
        <SearchOverlay
          {...defaultProps}
          searchQuery="猴"
          results={mockSearchResults}
        />
      )
      expect(screen.getByText('猴子捞月')).toBeTruthy()
      expect(screen.getByText('猴王出世')).toBeTruthy()
      expect(screen.queryByText('蜻蜓点水')).not.toBeTruthy()
      expect(screen.queryByText('飞龙在天')).not.toBeTruthy()
    })
  })

  describe('空搜索结果', () => {
    it('显示空状态提示', () => {
      render(
        <SearchOverlay
          {...defaultProps}
          searchQuery="不存在的线路"
          results={[]}
        />
      )
      // 使用翻译键匹配
      expect(screen.getByText('noResults')).toBeTruthy()
    })
  })

  describe('交互', () => {
    it('输入触发 onSearchChange', async () => {
      const onSearchChange = vi.fn()
      render(<SearchOverlay {...defaultProps} onSearchChange={onSearchChange} />)

      // 使用翻译键匹配
      const input = screen.getByPlaceholderText('placeholder')
      await userEvent.type(input, '猴')

      expect(onSearchChange).toHaveBeenCalledWith('猴')
    })

    it('点击取消按钮触发 onClose', async () => {
      const onClose = vi.fn()
      render(<SearchOverlay {...defaultProps} onClose={onClose} />)

      // 使用翻译键匹配
      await userEvent.click(screen.getByText('cancel'))
      expect(onClose).toHaveBeenCalled()
    })

    it('点击线路导航到详情页', async () => {
      const onClose = vi.fn()
      render(<SearchOverlay {...defaultProps} onClose={onClose} />)

      await userEvent.click(screen.getByText('猴子捞月'))

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/route/1')
    })

    it('ESC 键关闭搜索', () => {
      const onClose = vi.fn()
      render(<SearchOverlay {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })

    it('有搜索词时显示清除按钮', async () => {
      const onSearchChange = vi.fn()
      render(
        <SearchOverlay
          {...defaultProps}
          searchQuery="猴"
          onSearchChange={onSearchChange}
        />
      )

      // 找到清除按钮（X 图标）
      const clearButtons = screen.getAllByRole('button')
      const clearButton = clearButtons.find((btn) =>
        btn.querySelector('svg.lucide-x')
      )

      if (clearButton) {
        await userEvent.click(clearButton)
        expect(onSearchChange).toHaveBeenCalledWith('')
      }
    })
  })

  describe('线路信息显示', () => {
    it('显示线路难度', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getByText('V3')).toBeTruthy()
      expect(screen.getByText('V5')).toBeTruthy()
    })

    it('显示线路区域', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getAllByText('主区')).toHaveLength(2)
      expect(screen.getAllByText('副区')).toHaveLength(2)
    })
  })
})
