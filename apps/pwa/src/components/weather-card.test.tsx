/**
 * WeatherCard 组件测试
 * 测试天气卡片的渲染和数据加载
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import { SWRConfig } from 'swr'
import { WeatherCard } from './weather-card'
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
  forecasts: [
    {
      date: '2024-01-15',
      week: '1',
      dayWeather: '晴',
      nightWeather: '多云',
      dayTemp: 28,
      nightTemp: 15,
      dayWind: '东南',
      nightWind: '东',
      dayPower: '3',
      nightPower: '2',
    },
    {
      date: '2024-01-16',
      week: '2',
      dayWeather: '多云',
      nightWeather: '阴',
      dayTemp: 26,
      nightTemp: 16,
      dayWind: '南',
      nightWind: '东南',
      dayPower: '2',
      nightPower: '2',
    },
    {
      date: '2024-01-17',
      week: '3',
      dayWeather: '小雨',
      nightWeather: '小雨',
      dayTemp: 22,
      nightTemp: 14,
      dayWind: '北',
      nightWind: '北',
      dayPower: '3',
      nightPower: '3',
    },
  ],
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

describe('WeatherCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('加载状态', () => {
    it('加载时应显示骨架屏', () => {
      // 永不 resolve 的 promise 保持 loading 状态
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = renderWithSWR(<WeatherCard adcode="350123" />)

      // 检查骨架屏元素
      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
    })

    it('应该有 loading 动画', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = renderWithSWR(<WeatherCard adcode="350123" />)

      expect(container.querySelector('.animate-fade-in-up')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('API 错误时应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const { container } = renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        expect(container.querySelector('.animate-fade-in-up')).not.toBeInTheDocument()
        expect(container.querySelector('.skeleton-shimmer')).not.toBeInTheDocument()
      })
    })

    it('非 200 响应应返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { container } = renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        expect(container.querySelector('.animate-fade-in-up')).not.toBeInTheDocument()
        expect(container.querySelector('.skeleton-shimmer')).not.toBeInTheDocument()
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

    it('应该显示当前天气数据', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
        expect(screen.getByText('晴')).toBeInTheDocument()
      })
    })

    it('应该显示湿度信息', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations 使用参数替换: humidityValue -> "humidityValue" with {value: 60}
        expect(screen.getByText('humidityValue')).toBeInTheDocument()
      })
    })

    it('应该显示风向风力', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations: windValue with {direction: 东南, power: 3}
        expect(screen.getByText('windValue')).toBeInTheDocument()
      })
    })

    it('应该显示攀岩适宜度', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations: climbingLabel with {level: excellent}
        expect(screen.getByText('climbingLabel')).toBeInTheDocument()
      })
    })

    it('应该显示适宜度描述', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations: excellentDesc
        expect(screen.getByText('excellentDesc')).toBeInTheDocument()
      })
    })

    it('应该显示标题', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations: liveWeather
        expect(screen.getByText('liveWeather')).toBeInTheDocument()
      })
    })
  })

  describe('天气预报', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })
    })

    it('应该渲染 3 天天气预报', async () => {
      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // Mock useTranslations: futureWeather
        expect(screen.getByText('futureWeather')).toBeInTheDocument()
      })

      // 检查温度范围
      expect(screen.getByText('15° / 28°')).toBeInTheDocument()
      expect(screen.getByText('16° / 26°')).toBeInTheDocument()
      expect(screen.getByText('14° / 22°')).toBeInTheDocument()
    })

    it('应该在预报中显示适宜度图标', async () => {
      const dataWithClimbing = {
        ...mockWeatherData,
        forecasts: mockWeatherData.forecasts?.map(f => ({
          ...f,
          climbing: {
            level: 'good' as const,
            label: '良好',
            description: '天气不错',
            factors: [],
          },
        })),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(dataWithClimbing),
      })

      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        // good = 🔵, should appear for each forecast item
        const icons = screen.getAllByText('🔵')
        expect(icons.length).toBeGreaterThanOrEqual(3)
      })
    })

    it('无预报数据时不应渲染预报区域', async () => {
      const dataWithoutForecasts = {
        ...mockWeatherData,
        forecasts: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(dataWithoutForecasts),
      })

      renderWithSWR(<WeatherCard adcode="350123" />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
      })

      // Mock useTranslations: futureWeather
      expect(screen.queryByText('futureWeather')).not.toBeInTheDocument()
    })
  })

  describe('坐标参数', () => {
    it('应该传递坐标到 API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      renderWithSWR(
        <WeatherCard coordinates={{ lng: 119.5495, lat: 26.4893 }} />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('lng=119.5495')
        )
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('lat=26.4893')
        )
      })
    })

    it('无参数时不发起请求', () => {
      renderWithSWR(<WeatherCard />)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('动画延迟', () => {
    it('应该支持 delay 属性', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      const { container } = renderWithSWR(<WeatherCard adcode="350123" delay={100} />)

      await waitFor(() => {
        const card = container.firstChild as HTMLElement
        expect(card).toHaveStyle({ animationDelay: '100ms' })
      })
    })
  })
})
