import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDelayedLoading } from './use-delayed-loading'

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not show loading immediately', () => {
    const { result } = renderHook(() => useDelayedLoading(true, 100))
    expect(result.current).toBe(false)
  })

  it('should show loading after delay', () => {
    const { result } = renderHook(() => useDelayedLoading(true, 100))

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(true)
  })

  it('should not show loading if finished before delay', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading, 200),
      { initialProps: { isLoading: true } }
    )

    // Advance only 50ms (before 200ms threshold)
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Loading finishes before threshold
    rerender({ isLoading: false })

    expect(result.current).toBe(false)
  })

  it('should use default delay of 100ms', () => {
    const { result } = renderHook(() => useDelayedLoading(true))

    act(() => {
      vi.advanceTimersByTime(99)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it('should not show loading when isLoading is false', () => {
    const { result } = renderHook(() => useDelayedLoading(false, 100))

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe(false)
  })
})
