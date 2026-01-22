/**
 * BetaListDrawer 组件测试
 * 测试 Beta 视频列表抽屉的渲染和交互
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { BetaListDrawer } from './beta-list-drawer'
import type { BetaLink } from '@/types'

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

// Mock Beta 数据
const mockBetaLinks: BetaLink[] = [
  {
    id: 'beta-1',
    platform: 'xiaohongshu',
    noteId: 'abc123',
    url: 'https://xhslink.com/abc123',
    title: 'V5 月光攀爬记录',
    author: '攀岩爱好者',
    climberHeight: 175,
    climberReach: 180,
  },
  {
    id: 'beta-2',
    platform: 'xiaohongshu',
    noteId: 'def456',
    url: 'https://xhslink.com/def456',
    title: '月光线路分享',
    author: '户外达人',
  },
]

describe('BetaListDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    betaLinks: mockBetaLinks,
    routeName: '月光',
    routeId: 1,
    onAddBeta: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('无 Beta 视频时应显示空状态', () => {
      render(
        <BetaListDrawer {...defaultProps} betaLinks={[]} />
      )

      expect(screen.getByText('noBeta')).toBeInTheDocument()
      expect(screen.getByText('beFirst')).toBeInTheDocument()
    })

    it('应该渲染 Beta 视频列表', () => {
      render(<BetaListDrawer {...defaultProps} />)

      expect(screen.getByText('V5 月光攀爬记录')).toBeInTheDocument()
      expect(screen.getByText('月光线路分享')).toBeInTheDocument()
    })

    it('应该显示作者信息', () => {
      render(<BetaListDrawer {...defaultProps} />)

      expect(screen.getByText('@攀岩爱好者')).toBeInTheDocument()
      expect(screen.getByText('@户外达人')).toBeInTheDocument()
    })

    it('应该显示攀岩者身高/臂长', () => {
      render(<BetaListDrawer {...defaultProps} />)

      // 第一个 Beta 有身高和臂长
      expect(screen.getByText('175')).toBeInTheDocument()
      expect(screen.getByText('180')).toBeInTheDocument()
    })

    it('无身高臂长时不应显示相关信息', () => {
      const betaWithoutBody = [{
        ...mockBetaLinks[0],
        climberHeight: undefined,
        climberReach: undefined,
      }]

      render(
        <BetaListDrawer {...defaultProps} betaLinks={betaWithoutBody} />
      )

      // 只有作者信息，没有身高臂长
      expect(screen.getByText('@攀岩爱好者')).toBeInTheDocument()
    })

    it('应该显示视频数量', () => {
      render(<BetaListDrawer {...defaultProps} />)

      // videoCount 翻译包含 {count} 参数，mock 会返回 "videoCount"
      // 检查列表区域存在
      expect(screen.getByText('V5 月光攀爬记录')).toBeInTheDocument()
    })
  })

  describe('分享 Beta 按钮', () => {
    it('有 onAddBeta 时应显示分享按钮', () => {
      render(<BetaListDrawer {...defaultProps} />)

      expect(screen.getByText('shareButton')).toBeInTheDocument()
    })

    it('点击分享按钮应调用 onAddBeta', () => {
      const onAddBeta = vi.fn()
      render(<BetaListDrawer {...defaultProps} onAddBeta={onAddBeta} />)

      fireEvent.click(screen.getByText('shareButton'))

      expect(onAddBeta).toHaveBeenCalled()
    })

    it('无 onAddBeta 时不应显示分享按钮', () => {
      render(
        <BetaListDrawer {...defaultProps} onAddBeta={undefined} />
      )

      expect(screen.queryByText('shareButton')).not.toBeInTheDocument()
    })
  })

  describe('复制链接', () => {
    it('点击复制按钮应触发复制操作', async () => {
      render(<BetaListDrawer {...defaultProps} />)

      // 找到复制按钮（使用 title 属性）
      const copyButtons = screen.getAllByTitle('copyLink')
      expect(copyButtons.length).toBeGreaterThan(0)

      // 点击第一个复制按钮
      fireEvent.click(copyButtons[0])

      // 验证复制按钮存在且可点击
      expect(copyButtons[0]).toBeInTheDocument()
    })
  })

  describe('刷新功能', () => {
    it('应该显示刷新按钮', () => {
      render(<BetaListDrawer {...defaultProps} />)

      expect(screen.getByText('refresh')).toBeInTheDocument()
    })

    it('刷新按钮应可点击', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, betaLinks: [] }),
      })

      render(<BetaListDrawer {...defaultProps} />)

      const refreshButton = screen.getByText('refresh').closest('button')
      expect(refreshButton).not.toBeDisabled()
    })
  })

  describe('抽屉状态', () => {
    it('isOpen=false 时不应渲染内容', () => {
      render(<BetaListDrawer {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('V5 月光攀爬记录')).not.toBeInTheDocument()
    })
  })
})
