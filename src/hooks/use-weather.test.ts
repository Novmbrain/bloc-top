import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeather } from './use-weather'

const mockWeatherData = {
  adcode: '350123',
  city: '罗源县',
  live: { temperature: '25', humidity: '60', weather: '晴', wind: '东风' },
  forecasts: [],
}

describe('useWeather', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  it('should fetch weather data successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    const { result } = renderHook(() => useWeather())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.weather).toEqual(mockWeatherData)
    expect(result.current.error).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/weather?')
  })

  it('should pass coordinates as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    renderHook(() =>
      useWeather({ coordinates: { lng: 119.5, lat: 26.4 } })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/weather?lng=119.5&lat=26.4'
      )
    })
  })

  it('should pass forecast=false when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    renderHook(() => useWeather({ forecast: false }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/weather?forecast=false')
    })
  })

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useWeather())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.weather).toBeNull()
    expect(result.current.error).toBe(true)
  })

  it('should handle non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useWeather())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(true)
  })
})
