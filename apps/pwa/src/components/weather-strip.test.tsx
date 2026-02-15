/**
 * WeatherStrip 组件测试
 * 测试首页天气条的渲染和数据加载
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import { SWRConfig } from 'swr'
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

/** 使用 SWRConfig 包裹，清空缓存避免跨测试污染 */
function renderWithSWR(ui: React.ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {ui}
    </SWRConfig>
  )
}

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

      const { container } = renderWithSWR(<WeatherStrip adcode="350123" />)

      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('API 错误时应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const { container } = renderWithSWR(<WeatherStrip adcode="350123" />)

      await waitFor(() => {
        expect(container.querySelector('.animate-fade-in')).not.toBeInTheDocument()
        expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
      })
    })

    it('无参数时不发起请求', () => {
      const { container } = renderWithSWR(<WeatherStrip />)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(container.querySelector('.animate-fade-in')).not.toBeInTheDocument()
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
      renderWithSWR(<WeatherStrip adcode="350123" />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
      })
    })

    it('应该显示天气描述', async () => {
      renderWithSWR(<WeatherStrip adcode="350123" />)

      await waitFor(() => {
        expect(screen.getByText(/晴/)).toBeInTheDocument()
      })
    })

    it('应该显示适宜度', async () => {
      renderWithSWR(<WeatherStrip adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations 返回翻译键，所以匹配 'excellent' 而不是 '极佳'
        expect(screen.getByText('excellent')).toBeInTheDocument()
      })
    })

    it('应该显示湿度', async () => {
      renderWithSWR(<WeatherStrip adcode="350123" />)

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

      renderWithSWR(<WeatherStrip lng={119.5495} lat={26.4893} />)

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
