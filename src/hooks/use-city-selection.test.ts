/**
 * 城市选择 Hook 测试
 *
 * 测试覆盖:
 * - localStorage 读取已存储的城市
 * - 首次访问时的 IP 定位
 * - API 失败时的回退逻辑
 * - 城市切换功能
 * - 首次访问提示管理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCitySelection } from './use-city-selection'

// Mock localStorage
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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage (用于单会话访问去重)
const sessionStorageMock = (() => {
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

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useCitySelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
    // 默认 fetch 返回罗源
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cityId: 'luoyuan' }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始化', () => {
    it('从 localStorage 读取已存储的城市', async () => {
      localStorageMock.setItem('selected-city', 'xiamen')

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cityId).toBe('xiamen')
      expect(result.current.city.name).toBe('厦门')
      // 即使有存储的城市，也会调用 /api/geo 获取省份信息用于访问记录
      expect(mockFetch).toHaveBeenCalledWith('/api/geo')
    })

    it('localStorage 中的无效城市 ID 被忽略', async () => {
      localStorageMock.setItem('selected-city', 'invalid-city')

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 无效 ID 时会调用 API
      expect(mockFetch).toHaveBeenCalledWith('/api/geo')
    })

    it('首次访问时调用 IP 定位 API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cityId: 'luoyuan' }),
      })

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/geo')
      expect(result.current.cityId).toBe('luoyuan')
      // 检测到的城市应存入 localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'selected-city',
        'luoyuan'
      )
    })

    it('API 返回无效城市 ID 时使用默认值', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cityId: 'unknown-city' }),
      })

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 使用默认城市 (luoyuan)
      expect(result.current.cityId).toBe('luoyuan')
    })

    it('API 失败时使用默认城市', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 使用默认城市
      expect(result.current.cityId).toBe('luoyuan')
    })

    it('API 返回非 OK 状态时使用默认城市', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cityId).toBe('luoyuan')
    })
  })

  describe('首次访问标记', () => {
    it('首次访问时 isFirstVisit 为 true', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFirstVisit).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'city-first-visit',
        'true'
      )
    })

    it('非首次访问时 isFirstVisit 为 false', async () => {
      localStorageMock.setItem('city-first-visit', 'true')

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFirstVisit).toBe(false)
    })

    it('dismissFirstVisitHint 清除首次访问标记', async () => {
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
  })

  describe('城市切换', () => {
    it('setCity 更新当前城市', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setCity('xiamen')
      })

      expect(result.current.cityId).toBe('xiamen')
      expect(result.current.city.name).toBe('厦门')
    })

    it('setCity 将新城市存入 localStorage', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setCity('xiamen')
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'selected-city',
        'xiamen'
      )
    })

    it('setCity 清除首次访问提示', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFirstVisit).toBe(true)

      act(() => {
        result.current.setCity('xiamen')
      })

      expect(result.current.isFirstVisit).toBe(false)
    })
  })

  describe('返回值', () => {
    it('返回所有可用城市列表', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cities).toBeDefined()
      expect(result.current.cities.length).toBeGreaterThan(0)
      expect(result.current.cities.some((c) => c.id === 'luoyuan')).toBe(true)
      expect(result.current.cities.some((c) => c.id === 'xiamen')).toBe(true)
    })

    it('city 对象包含完整配置', async () => {
      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { city } = result.current
      expect(city.id).toBeDefined()
      expect(city.name).toBeDefined()
      expect(city.adcode).toBeDefined()
      expect(city.coordinates).toBeDefined()
      expect(typeof city.available).toBe('boolean')
    })
  })

  describe('用户场景模拟', () => {
    it('新用户首次访问：IP 定位到罗源', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cityId: 'luoyuan' }),
      })

      const { result } = renderHook(() => useCitySelection())

      // 初始加载中
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // IP 定位成功
      expect(result.current.cityId).toBe('luoyuan')
      expect(result.current.isFirstVisit).toBe(true)
    })

    it('老用户再次访问：直接读取存储的城市', async () => {
      localStorageMock.setItem('selected-city', 'xiamen')
      localStorageMock.setItem('city-first-visit', 'true')

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.cityId).toBe('xiamen')
      expect(result.current.isFirstVisit).toBe(false)
      // 即使是老用户，也会调用 /api/geo 获取省份信息用于访问记录
      expect(mockFetch).toHaveBeenCalledWith('/api/geo')
    })

    it('用户手动切换城市后再次访问', async () => {
      // 模拟之前用户手动切换到厦门
      localStorageMock.setItem('selected-city', 'xiamen')
      localStorageMock.setItem('city-first-visit', 'true')

      const { result } = renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 读取到厦门
      expect(result.current.cityId).toBe('xiamen')

      // 切换回罗源
      act(() => {
        result.current.setCity('luoyuan')
      })

      expect(result.current.cityId).toBe('luoyuan')
      expect(localStorageMock._store['selected-city']).toBe('luoyuan')
    })
  })

  describe('访问记录', () => {
    it('首次访问时记录访问', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cityId: 'luoyuan', province: '福建省' }),
      })

      renderHook(() => useCitySelection())

      await waitFor(() => {
        // 等待 /api/visit 被调用
        expect(mockFetch).toHaveBeenCalledWith('/api/visit', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }))
      })

      // 检查 sessionStorage 标记已设置
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'session-visit-recorded',
        'true'
      )
    })

    it('同一会话内多次渲染不重复记录', async () => {
      // 模拟已经在本会话中记录过
      sessionStorageMock.setItem('session-visit-recorded', 'true')

      renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/geo')
      })

      // /api/visit 不应被调用
      expect(mockFetch).not.toHaveBeenCalledWith('/api/visit', expect.anything())
    })

    it('访问记录包含省份信息', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ cityId: 'luoyuan', province: '福建省' }),
      })

      renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/visit', expect.objectContaining({
          body: JSON.stringify({ province: '福建省' }),
        }))
      })
    })

    it('geo API 失败时仍然记录访问（无省份）', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      renderHook(() => useCitySelection())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/visit', expect.objectContaining({
          body: JSON.stringify({ province: undefined }),
        }))
      })
    })
  })
})
