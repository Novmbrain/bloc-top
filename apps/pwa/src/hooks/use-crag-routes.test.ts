/**
 * useCragRoutes hook 测试
 *
 * 覆盖场景:
 * - 默认模式：从 /api/crags 加载岩场列表，自动选择第一个
 * - editorMode：从 /api/editor/crags 加载，提取 role + canCreate
 * - 选择岩场后加载线路
 * - includeFaces: 并行加载 R2 faces
 * - stats 计算 (marked/unmarked)
 * - updateCragAreas 更新并同步本地状态
 * - 网络错误不崩溃
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCragRoutes } from './use-crag-routes'

const CRAGS = [
  { id: 'crag-1', name: '岩场A', cityId: 'city1' },
  { id: 'crag-2', name: '岩场B', cityId: 'city1' },
]

const ROUTES = [
  { id: 1, name: '线路1', grade: 'V3', cragId: 'crag-1', area: 'A', topoLine: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
  { id: 2, name: '线路2', grade: 'V5', cragId: 'crag-1', area: 'A' },
]

const FACES = [
  { faceId: 'face1', area: 'A' },
]

describe('useCragRoutes', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  function mockCragsResponse(data: { crags: unknown[]; role?: string; canCreate?: boolean }) {
    return { ok: true, json: () => Promise.resolve(data) }
  }

  function mockRoutesResponse(routes: unknown[]) {
    return { ok: true, json: () => Promise.resolve({ routes }) }
  }

  function mockFacesResponse(faces: unknown[]) {
    return { ok: true, json: () => Promise.resolve({ success: true, faces }) }
  }

  it('should load crags from /api/crags and auto-select first', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/crags') return Promise.resolve(mockCragsResponse({ crags: CRAGS }))
      if (url.includes('/api/crags/crag-1/routes')) return Promise.resolve(mockRoutesResponse(ROUTES))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.isLoadingCrags).toBe(false)
    })

    expect(result.current.crags).toHaveLength(2)
    expect(result.current.selectedCragId).toBe('crag-1')
  })

  it('should load from /api/editor/crags in editor mode', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/editor/crags') {
        return Promise.resolve(mockCragsResponse({ crags: CRAGS, role: 'admin', canCreate: true }))
      }
      if (url.includes('/routes')) return Promise.resolve(mockRoutesResponse([]))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes({ editorMode: true }))

    await waitFor(() => {
      expect(result.current.isLoadingCrags).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/editor/crags')
    expect((result.current as Record<string, unknown>).userRole).toBe('admin')
    expect((result.current as Record<string, unknown>).canCreate).toBe(true)
  })

  it('should load routes when crag is selected', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/crags') return Promise.resolve(mockCragsResponse({ crags: CRAGS }))
      if (url.includes('/api/crags/crag-1/routes')) return Promise.resolve(mockRoutesResponse(ROUTES))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(2)
    })
  })

  it('should compute stats correctly', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/crags') return Promise.resolve(mockCragsResponse({ crags: CRAGS }))
      if (url.includes('/routes')) return Promise.resolve(mockRoutesResponse(ROUTES))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.routes).toHaveLength(2)
    })

    // 线路1 有 topoLine (2 points), 线路2 没有
    expect(result.current.stats.total).toBe(2)
    expect(result.current.stats.marked).toBe(1)
    expect(result.current.stats.unmarked).toBe(1)
    expect(result.current.stats.progress).toBe(50)
  })

  it('should load faces when includeFaces is true', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/crags') return Promise.resolve(mockCragsResponse({ crags: CRAGS }))
      if (url.includes('/routes')) return Promise.resolve(mockRoutesResponse(ROUTES))
      if (url.includes('/api/faces')) return Promise.resolve(mockFacesResponse(FACES))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes({ includeFaces: true }))

    await waitFor(() => {
      expect((result.current as Record<string, unknown>).r2Faces).toEqual(FACES)
    })
  })

  it('should handle empty crags response', async () => {
    mockFetch.mockResolvedValue(mockCragsResponse({ crags: [] }))

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.isLoadingCrags).toBe(false)
    })

    expect(result.current.crags).toEqual([])
    expect(result.current.selectedCragId).toBeNull()
  })

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.isLoadingCrags).toBe(false)
    })

    expect(result.current.crags).toEqual([])
    consoleSpy.mockRestore()
  })

  it('updateCragAreas should update local crags state', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === '/api/crags') return Promise.resolve(mockCragsResponse({ crags: CRAGS }))
      if (url.includes('/routes')) return Promise.resolve(mockRoutesResponse([]))
      if (url.includes('/areas') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ areas: ['区域X'] }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { result } = renderHook(() => useCragRoutes())

    await waitFor(() => {
      expect(result.current.isLoadingCrags).toBe(false)
    })

    let savedAreas: string[] = []
    await act(async () => {
      savedAreas = await result.current.updateCragAreas('crag-1', ['区域X'])
    })

    expect(savedAreas).toEqual(['区域X'])
    const updatedCrag = result.current.crags.find(c => c.id === 'crag-1')
    expect(updatedCrag?.areas).toEqual(['区域X'])
  })
})
