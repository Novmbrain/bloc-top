import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCitySelection } from './use-city-selection'
import type { CityConfig, PrefectureConfig } from '@/types'

const mockFetch = vi.fn()

const mockCities: CityConfig[] = [
  {
    id: 'luoyuan',
    name: '罗源',
    shortName: '罗源',
    adcode: '350123',
    coordinates: { lng: 119.549, lat: 26.489 },
    available: true,
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    adcode: '350200',
    coordinates: { lng: 118.089, lat: 24.479 },
    available: true,
  },
]

const mockPrefectures: PrefectureConfig[] = [
  {
    id: 'fuzhou',
    name: '福州',
    shortName: '福州',
    districts: ['luoyuan'],
    defaultDistrict: 'luoyuan',
  },
  {
    id: 'xiamen',
    name: '厦门',
    shortName: '厦门',
    districts: ['xiamen'],
    defaultDistrict: 'xiamen',
  },
]

const hookOptions = { cities: mockCities, prefectures: mockPrefectures }

describe('useCitySelection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    localStorage.clear()
    sessionStorage.clear()

    // Default: geo API returns luoyuan
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cityId: 'luoyuan', province: '福建' }),
    })
  })

  it('should return default city on first load', async () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cityId).toBe('luoyuan')
    expect(result.current.selection).toEqual({ type: 'city', id: 'luoyuan' })
    expect(result.current.city).toBeDefined()
    expect(result.current.cities.length).toBeGreaterThan(0)
  })

  it('should use stored city from localStorage (old format)', async () => {
    // 旧格式纯字符串 → 自动升级
    localStorage.setItem('selected-city', 'xiamen')
    localStorage.setItem('city-first-visit', 'true')

    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cityId).toBe('xiamen')
    expect(result.current.selection).toEqual({ type: 'city', id: 'xiamen' })
  })

  it('should use stored selection from localStorage (new format)', async () => {
    localStorage.setItem('selected-city', '{"type":"prefecture","id":"fuzhou"}')
    localStorage.setItem('city-first-visit', 'true')

    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.selection).toEqual({ type: 'prefecture', id: 'fuzhou' })
    // 兼容 cityId 应取 defaultDistrict
    expect(result.current.cityId).toBe('luoyuan')
  })

  it('should set isFirstVisit on first visit', async () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFirstVisit).toBe(true)
  })

  it('should not set isFirstVisit if already visited', async () => {
    localStorage.setItem('city-first-visit', 'true')

    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFirstVisit).toBe(false)
  })

  it('should update city when setCity is called', async () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setCity('xiamen')
    })

    expect(result.current.cityId).toBe('xiamen')
    expect(result.current.selection).toEqual({ type: 'city', id: 'xiamen' })
    // 新格式存储
    expect(localStorage.getItem('selected-city')).toBe('{"type":"city","id":"xiamen"}')
  })

  it('should update selection when setSelection is called with prefecture', async () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setSelection({ type: 'prefecture', id: 'fuzhou' })
    })

    expect(result.current.selection).toEqual({ type: 'prefecture', id: 'fuzhou' })
    expect(result.current.cityId).toBe('luoyuan') // defaultDistrict
    expect(localStorage.getItem('selected-city')).toBe('{"type":"prefecture","id":"fuzhou"}')
  })

  it('should dismiss first visit hint', async () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFirstVisit).toBe(true)

    act(() => {
      result.current.dismissFirstVisitHint()
    })

    expect(result.current.isFirstVisit).toBe(false)
  })

  it('should handle geo API failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should fall back to default city
    expect(result.current.cityId).toBe('luoyuan')
  })

  it('should skip geo API when localStorage has city and session is recorded', async () => {
    localStorage.setItem('selected-city', '{"type":"city","id":"luoyuan"}')
    localStorage.setItem('city-first-visit', 'true')
    sessionStorage.setItem('session-visit-recorded', 'true')

    const { result } = renderHook(() => useCitySelection(hookOptions))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should not have called fetch at all
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
