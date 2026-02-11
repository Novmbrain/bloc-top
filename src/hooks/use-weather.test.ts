import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import { useWeather } from './use-weather'

const mockWeatherData = {
  adcode: '350123',
  city: '罗源县',
  live: { temperature: '25', humidity: '60', weather: '晴', wind: '东风' },
  forecasts: [],
}

// SWR wrapper to isolate cache between tests
function swrWrapper({ children }: { children: ReactNode }) {
  return createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children)
}

describe('useWeather', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  it('should not fetch when no location params provided', () => {
    const { result } = renderHook(() => useWeather(), { wrapper: swrWrapper })

    // No adcode or coordinates → key is null → SWR skips fetch
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.weather).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('should fetch weather data with adcode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    const { result } = renderHook(
      () => useWeather({ adcode: '350123' }),
      { wrapper: swrWrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.weather).toEqual(mockWeatherData)
    expect(result.current.error).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/weather?adcode=350123')
  })

  it('should pass coordinates as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    renderHook(
      () => useWeather({ coordinates: { lng: 119.5, lat: 26.4 } }),
      { wrapper: swrWrapper }
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

    renderHook(
      () => useWeather({ adcode: '350123', forecast: false }),
      { wrapper: swrWrapper }
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/weather?adcode=350123&forecast=false')
    })
  })

  it('should handle fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(
      () => useWeather({ adcode: '350123' }),
      { wrapper: swrWrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.weather).toBeNull()
    expect(result.current.error).toBe(true)
  })

  it('should prefer adcode over coordinates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    renderHook(
      () => useWeather({ adcode: '350200', coordinates: { lng: 119.5, lat: 26.4 } }),
      { wrapper: swrWrapper }
    )

    await waitFor(() => {
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('adcode=350200')
      expect(calledUrl).not.toContain('lng=')
      expect(calledUrl).not.toContain('lat=')
    })
  })

  it('should refetch when adcode changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWeatherData),
    })

    const { rerender } = renderHook(
      ({ adcode }: { adcode?: string }) => useWeather({ adcode }),
      { initialProps: { adcode: '350123' }, wrapper: swrWrapper }
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    rerender({ adcode: '350200' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/weather?adcode=350200')
    })
  })

  it('should handle non-ok responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(
      () => useWeather({ adcode: '350123' }),
      { wrapper: swrWrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(true)
  })
})
