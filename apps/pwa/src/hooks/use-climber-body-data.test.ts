/**
 * useClimberBodyData Hook 测试
 * 测试攀岩者身体数据（身高/臂长）的 localStorage 缓存功能
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClimberBodyData } from './use-climber-body-data'

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get _store() {
      return store
    },
  }
})()

describe('useClimberBodyData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('localStorage 为空时应返回空字符串默认值', () => {
      const { result } = renderHook(() => useClimberBodyData())

      expect(result.current.bodyData).toEqual({
        height: '',
        reach: '',
      })
    })

    it('应从 localStorage 读取缓存数据', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '175', reach: '180' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      // useEffect 需要一个渲染周期才能读取 localStorage
      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '180',
      })
    })

    it('localStorage 数据损坏时应使用默认值', () => {
      localStorageMock.setItem('climber-body-data', 'invalid-json')

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() => useClimberBodyData())

      expect(result.current.bodyData).toEqual({
        height: '',
        reach: '',
      })
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('部分数据缺失时应使用空字符串填充', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '175' }) // reach 缺失
      )

      const { result } = renderHook(() => useClimberBodyData())

      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '',
      })
    })
  })

  describe('updateBodyData', () => {
    it('应正确更新并保存数据到 localStorage', () => {
      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ height: '175', reach: '180' })
      })

      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '180',
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'climber-body-data',
        JSON.stringify({ height: '175', reach: '180' })
      )
    })

    it('只更新 height 不应影响 reach', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '170', reach: '175' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ height: '180' })
      })

      expect(result.current.bodyData).toEqual({
        height: '180',
        reach: '175',
      })
    })

    it('只更新 reach 不应影响 height', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '170', reach: '175' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ reach: '185' })
      })

      expect(result.current.bodyData).toEqual({
        height: '170',
        reach: '185',
      })
    })

    it('空字符串不应覆盖现有数据', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '175', reach: '180' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ height: '', reach: '' })
      })

      // 空字符串不应覆盖，保留原值
      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '180',
      })
    })

    it('只有空格的字符串不应覆盖现有数据', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '175', reach: '180' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ height: '   ', reach: '  ' })
      })

      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '180',
      })
    })

    it('应去除值两端的空格', () => {
      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.updateBodyData({ height: ' 175 ', reach: ' 180 ' })
      })

      expect(result.current.bodyData).toEqual({
        height: '175',
        reach: '180',
      })
    })
  })

  describe('clearBodyData', () => {
    it('应清除状态和 localStorage', () => {
      localStorageMock.setItem(
        'climber-body-data',
        JSON.stringify({ height: '175', reach: '180' })
      )

      const { result } = renderHook(() => useClimberBodyData())

      act(() => {
        result.current.clearBodyData()
      })

      expect(result.current.bodyData).toEqual({
        height: '',
        reach: '',
      })
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('climber-body-data')
    })
  })

  describe('错误处理', () => {
    it('localStorage 写入失败时不应崩溃', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // 模拟 localStorage 写入失败
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      const { result } = renderHook(() => useClimberBodyData())

      // 不应抛出异常
      act(() => {
        result.current.updateBodyData({ height: '175' })
      })

      // 状态仍然应该更新（内存中）
      expect(result.current.bodyData.height).toBe('175')
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('localStorage 删除失败时不应崩溃', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      const { result } = renderHook(() => useClimberBodyData())

      // 不应抛出异常
      act(() => {
        result.current.clearBodyData()
      })

      // 状态仍然应该被清除（内存中）
      expect(result.current.bodyData).toEqual({
        height: '',
        reach: '',
      })
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })
})
