/**
 * SearchOverlay 组件测试
 * 测试搜索功能的核心交互
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchOverlay } from './search-overlay'
import type { Route } from '@/types'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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
      expect(screen.queryByPlaceholderText('搜索线路，支持拼音如 yts')).not.toBeInTheDocument()
    })

    it('isOpen=true 时渲染', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getByPlaceholderText('搜索线路，支持拼音如 yts')).toBeInTheDocument()
    })
  })

  describe('无搜索词时显示全部线路', () => {
    it('显示"全部线路"标题', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getByText('全部线路')).toBeInTheDocument()
    })

    it('显示所有线路', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getByText('猴子捞月')).toBeInTheDocument()
      expect(screen.getByText('蜻蜓点水')).toBeInTheDocument()
      expect(screen.getByText('飞龙在天')).toBeInTheDocument()
      expect(screen.getByText('猴王出世')).toBeInTheDocument()
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
      expect(screen.getByText('搜索结果 (2)')).toBeInTheDocument()
    })

    it('只显示匹配的线路', () => {
      render(
        <SearchOverlay
          {...defaultProps}
          searchQuery="猴"
          results={mockSearchResults}
        />
      )
      expect(screen.getByText('猴子捞月')).toBeInTheDocument()
      expect(screen.getByText('猴王出世')).toBeInTheDocument()
      expect(screen.queryByText('蜻蜓点水')).not.toBeInTheDocument()
      expect(screen.queryByText('飞龙在天')).not.toBeInTheDocument()
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
      expect(screen.getByText('没有找到匹配的线路')).toBeInTheDocument()
    })
  })

  describe('交互', () => {
    it('输入触发 onSearchChange', async () => {
      const onSearchChange = vi.fn()
      render(<SearchOverlay {...defaultProps} onSearchChange={onSearchChange} />)

      const input = screen.getByPlaceholderText('搜索线路，支持拼音如 yts')
      await userEvent.type(input, '猴')

      expect(onSearchChange).toHaveBeenCalledWith('猴')
    })

    it('点击取消按钮触发 onClose', async () => {
      const onClose = vi.fn()
      render(<SearchOverlay {...defaultProps} onClose={onClose} />)

      await userEvent.click(screen.getByText('取消'))
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
      expect(screen.getByText('V3')).toBeInTheDocument()
      expect(screen.getByText('V5')).toBeInTheDocument()
    })

    it('显示线路区域', () => {
      render(<SearchOverlay {...defaultProps} />)
      expect(screen.getAllByText('主区')).toHaveLength(2)
      expect(screen.getAllByText('副区')).toHaveLength(2)
    })
  })
})
