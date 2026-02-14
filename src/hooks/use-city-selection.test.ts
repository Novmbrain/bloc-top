import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCitySelection } from './use-city-selection'
import type { CityConfig, PrefectureConfig, CitySelection } from '@/types'

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

const defaultServerSelection: CitySelection = { type: 'city', id: 'luoyuan' }

const hookOptions = {
  cities: mockCities,
  prefectures: mockPrefectures,
  serverSelection: defaultServerSelection,
}

describe('useCitySelection', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie = 'city=; max-age=0; path=/'
  })

  it('should initialize with serverSelection', () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    expect(result.current.cityId).toBe('luoyuan')
    expect(result.current.selection).toEqual({ type: 'city', id: 'luoyuan' })
    expect(result.current.city).toBeDefined()
    expect(result.current.cities.length).toBeGreaterThan(0)
  })

  it('should initialize with xiamen when serverSelection says so', () => {
    const { result } = renderHook(() =>
      useCitySelection({
        ...hookOptions,
        serverSelection: { type: 'city', id: 'xiamen' },
      }),
    )

    expect(result.current.cityId).toBe('xiamen')
    expect(result.current.selection).toEqual({ type: 'city', id: 'xiamen' })
  })

  it('should resolve prefecture selection to defaultDistrict for cityId', () => {
    const { result } = renderHook(() =>
      useCitySelection({
        ...hookOptions,
        serverSelection: { type: 'prefecture', id: 'fuzhou' },
      }),
    )

    expect(result.current.selection).toEqual({ type: 'prefecture', id: 'fuzhou' })
    expect(result.current.cityId).toBe('luoyuan') // defaultDistrict
  })

  it('should update city when setCity is called', () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    act(() => {
      result.current.setCity('xiamen')
    })

    expect(result.current.cityId).toBe('xiamen')
    expect(result.current.selection).toEqual({ type: 'city', id: 'xiamen' })
    // Cookie should be set
    expect(document.cookie).toContain('city=')
  })

  it('should update selection when setSelection is called with prefecture', () => {
    const { result } = renderHook(() => useCitySelection(hookOptions))

    act(() => {
      result.current.setSelection({ type: 'prefecture', id: 'fuzhou' })
    })

    expect(result.current.selection).toEqual({ type: 'prefecture', id: 'fuzhou' })
    expect(result.current.cityId).toBe('luoyuan') // defaultDistrict
  })

  it('should fall back to FALLBACK_CITY when cityId not found in cities', () => {
    const { result } = renderHook(() =>
      useCitySelection({
        ...hookOptions,
        serverSelection: { type: 'city', id: 'nonexistent' },
      }),
    )

    // Should use first city in list as fallback
    expect(result.current.city.id).toBe('luoyuan')
  })

  it('should fall back to DEFAULT_CITY_ID when prefecture has no matching defaultDistrict', () => {
    const { result } = renderHook(() =>
      useCitySelection({
        ...hookOptions,
        prefectures: [],
        serverSelection: { type: 'prefecture', id: 'nonexistent' },
      }),
    )

    // Should fall back to DEFAULT_CITY_ID
    expect(result.current.cityId).toBe('luoyuan')
  })

  it('should write cookie when setSelection is called', () => {
    const cookieSpy = vi.spyOn(document, 'cookie', 'set')

    const { result } = renderHook(() => useCitySelection(hookOptions))

    act(() => {
      result.current.setSelection({ type: 'city', id: 'xiamen' })
    })

    expect(cookieSpy).toHaveBeenCalled()
    const lastCall = cookieSpy.mock.calls[cookieSpy.mock.calls.length - 1][0]
    expect(lastCall).toContain('city=')
    expect(lastCall).toContain('xiamen')

    cookieSpy.mockRestore()
  })
})
