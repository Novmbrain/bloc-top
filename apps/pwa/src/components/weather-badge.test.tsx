/**
 * WeatherBadge 组件测试
 * 测试卡片天气角标的渲染
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { WeatherBadge } from './weather-badge'

describe('WeatherBadge', () => {
  describe('渲染', () => {
    it('应该显示温度', () => {
      render(<WeatherBadge temperature={25} weather="晴" />)

      expect(screen.getByText('25°')).toBeTruthy()
    })

    it('应该显示天气图标', () => {
      render(<WeatherBadge temperature={25} weather="晴" />)

      // 晴天对应 ☀️ 图标
      expect(screen.getByText('☀️')).toBeTruthy()
    })

    it('多云天气应显示对应图标', () => {
      render(<WeatherBadge temperature={20} weather="多云" />)

      expect(screen.getByText('☁️')).toBeTruthy()
    })

    it('雨天天气应显示对应图标', () => {
      render(<WeatherBadge temperature={18} weather="小雨" />)

      expect(screen.getByText('🌧️')).toBeTruthy()
    })

    it('未知天气应显示问号图标', () => {
      render(<WeatherBadge temperature={22} weather="未知类型" />)

      expect(screen.getByText('❓')).toBeTruthy()
    })
  })

  describe('样式', () => {
    it('应该有正确的布局类', () => {
      const { container } = render(<WeatherBadge temperature={25} weather="晴" />)

      const badge = container.firstChild as HTMLElement
      expect(badge.classList.contains('flex')).toBe(true)
      expect(badge.classList.contains('items-center')).toBe(true)
      expect(badge.classList.contains('gap-1')).toBe(true)
    })

    it('应该有毛玻璃背景', () => {
      const { container } = render(<WeatherBadge temperature={25} weather="晴" />)

      const badge = container.firstChild as HTMLElement
      expect(badge.classList.contains('glass-light')).toBe(true)
    })

    it('应该是圆角胶囊形状', () => {
      const { container } = render(<WeatherBadge temperature={25} weather="晴" />)

      const badge = container.firstChild as HTMLElement
      expect(badge.classList.contains('rounded-full')).toBe(true)
    })
  })

  describe('不同温度', () => {
    it('应该正确显示负温度', () => {
      render(<WeatherBadge temperature={-5} weather="雪" />)

      expect(screen.getByText('-5°')).toBeTruthy()
    })

    it('应该正确显示高温', () => {
      render(<WeatherBadge temperature={40} weather="晴" />)

      expect(screen.getByText('40°')).toBeTruthy()
    })

    it('应该正确显示零度', () => {
      render(<WeatherBadge temperature={0} weather="阴" />)

      expect(screen.getByText('0°')).toBeTruthy()
    })
  })
})
