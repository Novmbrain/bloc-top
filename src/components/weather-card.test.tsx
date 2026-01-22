/**
 * WeatherCard 组件测试
 * 测试天气卡片的渲染和数据加载
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
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

      const { container } = render(<WeatherCard />)

      // 检查骨架屏元素
      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
    })

    it('应该有 loading 动画', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      const { container } = render(<WeatherCard />)

      expect(container.querySelector('.animate-fade-in-up')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('API 错误时应返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const { container } = render(<WeatherCard />)

      await waitFor(() => {
        // 错误时组件返回 null
        expect(container.firstChild).toBeNull()
      })
    })

    it('非 200 响应应返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { container } = render(<WeatherCard />)

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

    it('应该显示当前天气数据', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
        expect(screen.getByText('晴')).toBeInTheDocument()
      })
    })

    it('应该显示湿度信息', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('湿度 60%')).toBeInTheDocument()
      })
    })

    it('应该显示风向风力', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('东南风 3级')).toBeInTheDocument()
      })
    })

    it('应该显示攀岩适宜度', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('极佳攀岩')).toBeInTheDocument()
      })
    })

    it('应该显示适宜度描述', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('温湿度适宜，岩面干燥')).toBeInTheDocument()
      })
    })

    it('应该显示标题', async () => {
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('实时天气')).toBeInTheDocument()
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
      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('未来天气')).toBeInTheDocument()
      })

      // 检查温度范围
      expect(screen.getByText('15° / 28°')).toBeInTheDocument()
      expect(screen.getByText('16° / 26°')).toBeInTheDocument()
      expect(screen.getByText('14° / 22°')).toBeInTheDocument()
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

      render(<WeatherCard />)

      await waitFor(() => {
        expect(screen.getByText('25°')).toBeInTheDocument()
      })

      expect(screen.queryByText('未来天气')).not.toBeInTheDocument()
    })
  })

  describe('坐标参数', () => {
    it('应该传递坐标到 API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      render(
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

    it('无坐标时不应传递参数', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      render(<WeatherCard />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/weather?')
      })
    })
  })

  describe('动画延迟', () => {
    it('应该支持 delay 属性', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      })

      const { container } = render(<WeatherCard delay={100} />)

      await waitFor(() => {
        const card = container.firstChild as HTMLElement
        expect(card).toHaveStyle({ animationDelay: '100ms' })
      })
    })
  })
})
