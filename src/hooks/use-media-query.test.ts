import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './use-media-query'

describe('useMediaQuery', () => {
  let listeners: Set<() => void>
  let currentMatches: boolean

  beforeEach(() => {
    listeners = new Set()
    currentMatches = false

    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      get matches() { return currentMatches },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: () => void) => { listeners.add(cb) },
      removeEventListener: (_: string, cb: () => void) => { listeners.delete(cb) },
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList)
  })

  it('returns false when query does not match', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('returns true when query matches', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(true)
  })

  it('updates when media query changes', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)

    // Simulate viewport resize
    currentMatches = true
    act(() => {
      listeners.forEach(cb => cb())
    })

    expect(result.current).toBe(true)
  })

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(listeners.size).toBe(1)

    unmount()
    expect(listeners.size).toBe(0)
  })
})
