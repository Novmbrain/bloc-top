import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCitySelection } from './use-city-selection'

const mockFetch = vi.fn()

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
    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cityId).toBe('luoyuan')
    expect(result.current.city).toBeDefined()
    expect(result.current.cities.length).toBeGreaterThan(0)
  })

  it('should use stored city from localStorage', async () => {
    localStorage.setItem('selected-city', 'xiamen')
    localStorage.setItem('city-first-visit', 'true')

    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.cityId).toBe('xiamen')
  })

  it('should set isFirstVisit on first visit', async () => {
    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFirstVisit).toBe(true)
  })

  it('should not set isFirstVisit if already visited', async () => {
    localStorage.setItem('city-first-visit', 'true')

    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isFirstVisit).toBe(false)
  })

  it('should update city when setCity is called', async () => {
    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setCity('xiamen')
    })

    expect(result.current.cityId).toBe('xiamen')
    expect(localStorage.getItem('selected-city')).toBe('xiamen')
  })

  it('should dismiss first visit hint', async () => {
    const { result } = renderHook(() => useCitySelection())

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

    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should fall back to default city
    expect(result.current.cityId).toBe('luoyuan')
  })

  it('should skip geo API when localStorage has city and session is recorded', async () => {
    localStorage.setItem('selected-city', 'luoyuan')
    localStorage.setItem('city-first-visit', 'true')
    sessionStorage.setItem('session-visit-recorded', 'true')

    const { result } = renderHook(() => useCitySelection())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should not have called fetch at all
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
