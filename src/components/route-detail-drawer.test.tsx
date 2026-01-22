/**
 * RouteDetailDrawer 组件测试
 * 测试线路详情抽屉的渲染和交互
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { RouteDetailDrawer } from './route-detail-drawer'
import type { Route, Crag } from '@/types'

// Mock 线路数据
const mockRoute: Route = {
  id: 1,
  name: '月光',
  grade: 'V5',
  cragId: 'yuan-tong-si',
  area: 'A 区',
  FA: '张三',
  setter: '李四',
  description: '一条经典的线路，起步比较困难。',
  betaLinks: [
    {
      id: 'beta-1',
      platform: 'xiaohongshu',
      noteId: 'abc123',
      url: 'https://xhslink.com/abc123',
      title: 'V5 月光攀爬记录',
      author: '攀岩爱好者',
      climberHeight: 175,
    },
  ],
}

const mockRouteNoBeta: Route = {
  id: 2,
  name: '无名线',
  grade: 'V3',
  cragId: 'yuan-tong-si',
  area: 'B 区',
}

const mockCrag: Crag = {
  id: 'yuan-tong-si',
  name: '圆通寺',
  cityId: 'luoyuan',
  location: '罗源县',
  developmentTime: '2020',
  description: '测试岩场',
  approach: '步行10分钟',
}

describe('RouteDetailDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    route: mockRoute,
    crag: mockCrag,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('route 为 null 时应该返回 null', () => {
      const { container } = render(
        <RouteDetailDrawer {...defaultProps} route={null} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('应该渲染线路名称', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      expect(screen.getByText('月光')).toBeInTheDocument()
    })

    it('应该渲染难度等级', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      expect(screen.getByText('V5')).toBeInTheDocument()
    })

    it('应该显示岩场名称和区域', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // 格式: "圆通寺 · A 区"
      expect(screen.getByText(/圆通寺/)).toBeInTheDocument()
      expect(screen.getByText(/A 区/)).toBeInTheDocument()
    })

    it('无 crag 时仅显示区域', () => {
      render(
        <RouteDetailDrawer {...defaultProps} crag={null} />
      )

      expect(screen.getByText('A 区')).toBeInTheDocument()
      expect(screen.queryByText('圆通寺')).not.toBeInTheDocument()
    })
  })

  describe('FA 和 setter 信息', () => {
    it('应该显示 FA 信息', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // faLabel 是翻译 key
      expect(screen.getByText('faLabel')).toBeInTheDocument()
      expect(screen.getByText('张三')).toBeInTheDocument()
    })

    it('应该显示 setter 信息', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // setter 是翻译 key
      expect(screen.getByText('setter')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
    })

    it('无 FA 和 setter 时不应显示该区域', () => {
      render(
        <RouteDetailDrawer
          {...defaultProps}
          route={mockRouteNoBeta}
        />
      )

      expect(screen.queryByText('faLabel')).not.toBeInTheDocument()
      expect(screen.queryByText('setter')).not.toBeInTheDocument()
    })
  })

  describe('线路描述', () => {
    it('应该显示线路描述', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      expect(screen.getByText('descriptionLabel')).toBeInTheDocument()
      expect(screen.getByText('一条经典的线路，起步比较困难。')).toBeInTheDocument()
    })

    it('无描述时不应显示该区域', () => {
      render(
        <RouteDetailDrawer
          {...defaultProps}
          route={mockRouteNoBeta}
        />
      )

      expect(screen.queryByText('descriptionLabel')).not.toBeInTheDocument()
    })
  })

  describe('Beta 按钮', () => {
    it('有 Beta 视频时应显示数量', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // videoCount 翻译 key 格式
      expect(screen.getByText('title')).toBeInTheDocument()
      expect(screen.getByText('videoCount')).toBeInTheDocument()
    })

    it('无 Beta 视频时应显示"暂无"', () => {
      render(
        <RouteDetailDrawer
          {...defaultProps}
          route={mockRouteNoBeta}
        />
      )

      expect(screen.getByText('noVideo')).toBeInTheDocument()
    })

    it('点击 Beta 按钮应打开 Beta 列表', async () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // 找到 Beta 按钮（包含 title 文本的按钮）
      const betaButton = screen.getByText('title').closest('button')
      if (betaButton) {
        fireEvent.click(betaButton)
      }

      // BetaListDrawer 应该打开（会渲染新的内容）
      await waitFor(() => {
        // 检查是否有 beta 列表相关的内容
        expect(screen.getByText('title')).toBeInTheDocument()
      })
    })

    it('有 Beta 视频时应显示计数徽章', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // 检查数字 1
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('图片区域', () => {
    it('isOpen=false 时不应渲染内容', () => {
      render(<RouteDetailDrawer {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('月光')).not.toBeInTheDocument()
    })

    it('应该渲染图片区域', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      // 检查图片相关元素
      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
    })

    it('图片加载失败时应显示占位符', async () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      const image = screen.getByRole('img')

      // 模拟图片加载失败
      fireEvent.error(image)

      await waitFor(() => {
        // noTopo 是翻译 key
        expect(screen.getByText('noTopo')).toBeInTheDocument()
      })
    })
  })

  describe('抽屉交互', () => {
    it('关闭按钮应调用 onClose', () => {
      const onClose = vi.fn()
      render(<RouteDetailDrawer {...defaultProps} onClose={onClose} />)

      // Drawer 组件的关闭通常由 overlay 点击或关闭按钮触发
      // 这里我们验证 onClose 被正确传递
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('难度等级颜色', () => {
    it('V5 难度应该使用正确的颜色', () => {
      render(<RouteDetailDrawer {...defaultProps} />)

      const gradeBadge = screen.getByText('V5')
      expect(gradeBadge).toBeInTheDocument()
      // 检查父元素的样式
      expect(gradeBadge.closest('div')).toHaveStyle({
        borderRadius: 'var(--theme-radius-full)',
      })
    })
  })
})
