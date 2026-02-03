/**
 * CragCard 组件测试
 * 测试核心渲染逻辑和难度范围计算
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CragCard } from './crag-card'
import type { Crag, Route } from '@/types'

// Mock next/link - 传递所有常用属性
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    style,
  }: {
    children: React.ReactNode
    href: string
    className?: string
    style?: React.CSSProperties
  }) => (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ),
}))

// 测试数据
const mockCrag: Crag = {
  id: 'test-crag',
  name: '测试岩场',
  cityId: 'luoyuan',
  location: '福州市罗源县',
  developmentTime: '2020年',
  description: '测试描述',
  approach: '步行10分钟',
  coverImages: [],
}

const mockCragWithImage: Crag = {
  ...mockCrag,
  id: 'test-crag-with-image',
  coverImages: ['https://example.com/image.jpg'],
}

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: '区域1' },
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: '区域1' },
  { id: 3, name: '线路C', grade: 'V3', cragId: 'test-crag', area: '区域2' },
]

describe('CragCard', () => {
  describe('基础渲染', () => {
    it('显示岩场名称', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByText('测试岩场')).toBeInTheDocument()
    })

    it('显示线路数量', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByText('3 条线路')).toBeInTheDocument()
    })

    it('显示位置信息', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      expect(screen.getByText('福州市罗源县')).toBeInTheDocument()
    })

    it('链接指向正确的岩场详情页', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/crag/test-crag')
    })
  })

  describe('难度范围计算', () => {
    it('显示难度范围 (最小-最大)', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      // V2, V3, V5 排序后范围是 V2-V5
      expect(screen.getByText('V2-V5')).toBeInTheDocument()
    })

    it('单一难度只显示一个值', () => {
      const sameGradeRoutes: Route[] = [
        { id: 1, name: '线路A', grade: 'V4', cragId: 'test-crag', area: '区域1' },
        { id: 2, name: '线路B', grade: 'V4', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragCard crag={mockCrag} routes={sameGradeRoutes} />)
      expect(screen.getByText('V4')).toBeInTheDocument()
    })

    it('忽略未知难度 (？)', () => {
      const routesWithUnknown: Route[] = [
        { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: '区域1' },
        { id: 2, name: '线路B', grade: '？', cragId: 'test-crag', area: '区域1' },
        { id: 3, name: '线路C', grade: 'V6', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragCard crag={mockCrag} routes={routesWithUnknown} />)
      expect(screen.getByText('V2-V6')).toBeInTheDocument()
    })

    it('空线路列表显示默认难度', () => {
      render(<CragCard crag={mockCrag} routes={[]} />)
      expect(screen.getByText('V0')).toBeInTheDocument()
      expect(screen.getByText('0 条线路')).toBeInTheDocument()
    })

    it('全部未知难度显示默认值', () => {
      const unknownRoutes: Route[] = [
        { id: 1, name: '线路A', grade: '？', cragId: 'test-crag', area: '区域1' },
        { id: 2, name: '线路B', grade: '？', cragId: 'test-crag', area: '区域1' },
      ]
      render(<CragCard crag={mockCrag} routes={unknownRoutes} />)
      expect(screen.getByText('V0')).toBeInTheDocument()
    })
  })

  describe('渐变背景', () => {
    it('卡片使用渐变背景', () => {
      render(<CragCard crag={mockCrag} routes={mockRoutes} />)
      // 渐变背景应用在 Link 元素上
      const link = screen.getByRole('link')
      expect(link.getAttribute('style')).toContain('linear-gradient')
    })

    it('不再渲染图片元素（统一使用渐变）', () => {
      render(<CragCard crag={mockCragWithImage} routes={mockRoutes} />)
      // 即使有 coverImages，也不应该渲染 img 元素
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  describe('无位置信息', () => {
    it('不显示位置行', () => {
      const cragNoLocation: Crag = {
        ...mockCrag,
        location: '',
      }
      render(<CragCard crag={cragNoLocation} routes={mockRoutes} />)
      expect(screen.queryByText('福州市罗源县')).not.toBeInTheDocument()
    })
  })
})
