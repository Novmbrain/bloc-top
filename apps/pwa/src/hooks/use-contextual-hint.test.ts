import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContextualHint } from './use-contextual-hint'

describe('useContextualHint', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should be visible for a new hint key', () => {
    const { result } = renderHook(() => useContextualHint('test-hint'))
    expect(result.current.visible).toBe(true)
  })

  it('should hide after dismiss', () => {
    const { result } = renderHook(() => useContextualHint('test-hint'))
    act(() => {
      result.current.dismiss()
    })
    expect(result.current.visible).toBe(false)
  })

  it('should persist dismissal in localStorage', () => {
    const { result } = renderHook(() => useContextualHint('test-hint'))
    act(() => {
      result.current.dismiss()
    })

    const stored = localStorage.getItem('hints-dismissed')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toContain('test-hint')
  })

  it('should remain hidden after re-render for dismissed hint', () => {
    const { result, rerender } = renderHook(() => useContextualHint('test-hint'))
    act(() => {
      result.current.dismiss()
    })
    rerender()
    expect(result.current.visible).toBe(false)
  })

  it('should track different hint keys independently', () => {
    const { result: hint1 } = renderHook(() => useContextualHint('hint-a'))
    const { result: hint2 } = renderHook(() => useContextualHint('hint-b'))

    act(() => {
      hint1.current.dismiss()
    })

    expect(hint1.current.visible).toBe(false)
    expect(hint2.current.visible).toBe(true)
  })
})
