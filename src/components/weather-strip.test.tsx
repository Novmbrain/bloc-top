/**
 * WeatherStrip 组件测试
 * 测试首页天气条的渲染和数据加载
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import { WeatherStrip } from './weather-strip'
import type { WeatherData } from '@/types'

// Mock 天气数据
const mockWeatherData: WeatherData = {
  adcode: '350123',
  city: '罗源县',
  updatedAt: '2024-01-15T10:00:00.000Z',
  live: {
    weather: '晴',
    temperature: 25,
    humidity: 60,
    windDirection: '东南',
    windPower: '3',
    reportTime: '2024-01-15 10:00:00',
  },
  climbing: {
    level: 'excellent',
    label: '极佳',
    description: '温湿度适宜，岩面干燥',
    factors: ['温度适宜', '湿度低'],
  },
  forecasts: [],
}

// Mock fetch
const mockFetch = vi.fn()

describe('WeatherStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('加载状态', () => {
    it('加载时应显示骨架屏', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<WeatherStrip />)

      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('API 错误时应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const { container } = render(<WeatherStrip />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('成功渲染', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })
    })

    it('应该显示温度', async () => {
      render(<WeatherStrip />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
      })
    })

    it('应该显示天气描述', async () => {
      render(<WeatherStrip />)

      await waitFor(() => {
        expect(screen.getByText(/晴/)).toBeInTheDocument()
      })
    })

    it('应该显示适宜度', async () => {
      render(<WeatherStrip />)

      await waitFor(() => {
        // Mock useTranslations 返回翻译键，所以匹配 'excellent' 而不是 '极佳'
        expect(screen.getByText('excellent')).toBeInTheDocument()
      })
    })

    it('应该显示湿度', async () => {
      render(<WeatherStrip />)

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument()
      })
    })
  })

  describe('坐标参数', () => {
    it('应该传递坐标到 API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      render(<WeatherStrip lng={119.5495} lat={26.4893} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('lng=119.5495')
        )
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('lat=26.4893')
        )
      })
    })
  })
})
