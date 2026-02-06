import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import CragDetailClient from './crag-detail-client'
import type { Crag, Route } from '@/types'

// Mock useMediaQuery
const mockUseMediaQuery = vi.fn(() => false)
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mockUseMediaQuery(),
}))

// Mock WeatherCard (external API dependency)
vi.mock('@/components/weather-card', () => ({
  WeatherCard: () => <div data-testid="weather-card" />,
}))

// Mock AMapContainer (external API dependency)
vi.mock('@/components/amap-container', () => ({
  default: () => <div data-testid="amap-container" />,
}))

const mockCrag: Crag = {
  id: 'test-crag',
  name: '测试岩场',
  cityId: 'luoyuan',
  location: '测试地点',
  developmentTime: '2024',
  description: '测试描述',
  approach: '测试前往方式',
}

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: 'A区' },
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: 'A区' },
]

describe('CragDetailClient', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false)
  })

  it('renders crag name', () => {
    render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
    expect(screen.getByText('测试岩场')).toBeInTheDocument()
  })

  describe('Mobile layout', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true)
    })

    it('renders mini nav bar with crag name on mobile', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Mini nav bar contains a second instance of crag name
      const cragNames = screen.getAllByText('测试岩场')
      expect(cragNames.length).toBeGreaterThanOrEqual(2) // title + mini nav
    })

    it('does not render carousel dot indicators on mobile', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Dot indicators have rounded-full + w-2 classes — they should not exist
      const dots = document.querySelectorAll('.w-2.h-2.rounded-full')
      expect(dots.length).toBe(0)
    })
  })

  describe('Desktop layout', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false)
    })

    it('does not render mini nav bar on desktop', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Only one instance of crag name (the title)
      const cragNames = screen.getAllByText('测试岩场')
      expect(cragNames.length).toBe(1)
    })

    it('renders carousel dot indicators on desktop', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      const dots = document.querySelectorAll('.w-2.h-2.rounded-full')
      expect(dots.length).toBe(2) // 2 cover images
    })
  })
})
