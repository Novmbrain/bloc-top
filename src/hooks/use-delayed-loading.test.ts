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

  describe('初始状态', () => {
    it('初始应返回 false', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 100))
      expect(result.current).toBe(false)
    })

    it('isLoading 为 false 时应返回 false', () => {
      const { result } = renderHook(() => useDelayedLoading(false, 100))
      expect(result.current).toBe(false)
    })
  })

  describe('延迟显示', () => {
    it('延迟时间内应保持 false', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 100))

      // 前进 50ms（未到阈值）
      act(() => {
        vi.advanceTimersByTime(50)
      })

      expect(result.current).toBe(false)
    })

    it('超过延迟时间后应变为 true', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 100))

      // 前进 100ms（到达阈值）
      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(result.current).toBe(true)
    })

    it('使用自定义延迟时间', () => {
      const { result } = renderHook(() => useDelayedLoading(true, 200))

      // 前进 150ms（未到阈值）
      act(() => {
        vi.advanceTimersByTime(150)
      })
      expect(result.current).toBe(false)

      // 再前进 50ms（到达阈值）
      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(result.current).toBe(true)
    })
  })

  describe('isLoading 变化', () => {
    it('isLoading 变为 false 后应返回 false', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } }
      )

      // 超过延迟时间
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe(true)

      // isLoading 变为 false
      rerender({ isLoading: false })
      expect(result.current).toBe(false)
    })

    it('延迟时间内 isLoading 变为 false 应返回 false', () => {
      const { result, rerender } = renderHook(
        ({ isLoading }) => useDelayedLoading(isLoading, 100),
        { initialProps: { isLoading: true } }
      )

      // 前进 50ms（未到阈值）
      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(result.current).toBe(false)

      // isLoading 变为 false（在延迟时间内）
      rerender({ isLoading: false })
      expect(result.current).toBe(false)

      // 继续前进时间，应该仍然是 false
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe(false)
    })
  })

  describe('定时器清理', () => {
    it('卸载时应清理定时器', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount } = renderHook(() => useDelayedLoading(true, 100))
      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('delay 变化时应重置定时器', () => {
      const { result, rerender } = renderHook(
        ({ delay }) => useDelayedLoading(true, delay),
        { initialProps: { delay: 100 } }
      )

      // 前进 80ms
      act(() => {
        vi.advanceTimersByTime(80)
      })
      expect(result.current).toBe(false)

      // 改变 delay 为 200ms（重置定时器）
      rerender({ delay: 200 })

      // 再前进 100ms（总共 180ms < 200ms）
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe(false)

      // 再前进 100ms（总共 280ms > 200ms）
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe(true)
    })
  })

  describe('默认参数', () => {
    it('delay 默认为 100ms', () => {
      const { result } = renderHook(() => useDelayedLoading(true))

      // 前进 99ms
      act(() => {
        vi.advanceTimersByTime(99)
      })
      expect(result.current).toBe(false)

      // 再前进 1ms
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current).toBe(true)
    })
  })
})
