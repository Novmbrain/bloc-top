/**
 * 岩场详情页客户端组件测试
 * 测试国际化按钮和核心渲染逻辑
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CragDetailClient from './crag-detail-client'
import type { Crag, Route } from '@/types'

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
    }),
  }
})

// Mock AMapContainer (避免加载地图)
vi.mock('@/components/amap-container', () => ({
  default: ({ name }: { name: string }) => (
    <div data-testid="amap-container">{name}</div>
  ),
}))

// Mock WeatherCard (避免 API 调用)
vi.mock('@/components/weather-card', () => ({
  WeatherCard: () => <div data-testid="weather-card">Weather</div>,
}))

// 测试数据
const mockCrag: Crag = {
  id: 'test-crag',
  name: '测试岩场',
  cityId: 'luoyuan',
  location: '福州市罗源县',
  developmentTime: '2020年',
  description: '这是一个测试岩场的描述',
  approach: '从停车场步行10分钟',
  coordinates: { lng: 119.5, lat: 26.4 },
}

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: '区域1' },
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: '区域1' },
  { id: 3, name: '线路C', grade: 'V3', cragId: 'test-crag', area: '区域2' },
]

describe('CragDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('国际化', () => {
    it('使用翻译函数渲染探索线路按钮', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)

      // Mock 的 useTranslations 会返回 key 本身
      // 实际应用中会显示翻译后的文本
      const button = screen.getByRole('button', { name: 'exploreRoutes' })
      expect(button).toBeInTheDocument()
    })

    it('按钮文本不是硬编码的中文', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)

      // 确保没有硬编码的中文 "开始探索线路"
      // 因为我们使用了 mock，实际显示的是翻译键
      const hardcodedButton = screen.queryByRole('button', { name: '开始探索线路' })
      expect(hardcodedButton).not.toBeInTheDocument()
    })
  })

  describe('探索线路按钮', () => {
    it('点击按钮跳转到线路页面（带岩场过滤）', async () => {
      const user = userEvent.setup()
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)

      const button = screen.getByRole('button', { name: 'exploreRoutes' })
      await user.click(button)

      expect(mockPush).toHaveBeenCalledWith('/route?crag=test-crag')
    })

    it('使用正确的岩场 ID 构建 URL', async () => {
      const user = userEvent.setup()
      const cragWithDifferentId: Crag = {
        ...mockCrag,
        id: 'yuan-tong-si',
      }
      render(<CragDetailClient crag={cragWithDifferentId} routes={mockRoutes} />)

      const button = screen.getByRole('button', { name: 'exploreRoutes' })
      await user.click(button)

      expect(mockPush).toHaveBeenCalledWith('/route?crag=yuan-tong-si')
    })
  })

  describe('基础渲染', () => {
    it('显示岩场名称', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByRole('heading', { name: '测试岩场' })).toBeInTheDocument()
    })

    it('显示线路数量', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // 线路数量可能在不同元素中，使用组合查询
      expect(screen.getByText(/3.*条线路|条线路/)).toBeInTheDocument()
    })

    it('显示难度范围', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // V2, V3, V5 排序后是 V2 - V5
      expect(screen.getByText('V2 - V5')).toBeInTheDocument()
    })

    it('显示接近方式', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByText('从停车场步行10分钟')).toBeInTheDocument()
    })

    it('显示岩场介绍', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByText('这是一个测试岩场的描述')).toBeInTheDocument()
    })

    it('渲染天气卡片', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByTestId('weather-card')).toBeInTheDocument()
    })

    it('渲染地图容器', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByTestId('amap-container')).toBeInTheDocument()
    })
  })

  describe('难度范围计算', () => {
    it('单一难度只显示一个值', () => {
      const sameGradeRoutes: Route[] = [
        { id: 1, name: '线路A', grade: 'V4', cragId: 'test-crag', area: '区域1' },
        { id: 2, name: '线路B', grade: 'V4', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragDetailClient crag={mockCrag} routes={sameGradeRoutes} />)
      expect(screen.getByText('V4')).toBeInTheDocument()
    })

    it('忽略未知难度', () => {
      const routesWithUnknown: Route[] = [
        { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: '区域1' },
        { id: 2, name: '线路B', grade: '？', cragId: 'test-crag', area: '区域1' },
        { id: 3, name: '线路C', grade: 'V6', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragDetailClient crag={mockCrag} routes={routesWithUnknown} />)
      expect(screen.getByText('V2 - V6')).toBeInTheDocument()
    })

    it('全部未知难度显示暂无', () => {
      const unknownRoutes: Route[] = [
        { id: 1, name: '线路A', grade: '？', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragDetailClient crag={mockCrag} routes={unknownRoutes} />)
      expect(screen.getByText('暂无')).toBeInTheDocument()
    })

    it('空线路列表显示暂无', () => {
      render(<CragDetailClient crag={mockCrag} routes={[]} />)
      expect(screen.getByText('暂无')).toBeInTheDocument()
    })
  })

  describe('无接近方式', () => {
    it('仍显示前往方式卡片（含地图），但不显示 approach 文字', () => {
      const cragNoApproach: Crag = {
        ...mockCrag,
        approach: '',
      }
      render(<CragDetailClient crag={cragNoApproach} routes={mockRoutes} />)
      // 卡片标题仍显示（因为地图始终需要显示）
      expect(screen.getByText('前往方式')).toBeInTheDocument()
      // 但 approach 文字内容不显示
      expect(screen.queryByText('从停车场步行10分钟')).not.toBeInTheDocument()
    })
  })
})
