import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRouteEditor } from './use-route-editor'
import type { Route } from '@bloctop/shared/types'

// Mock external dependencies
vi.mock('@bloctop/shared/topo-utils', () => ({
  catmullRomCurve: vi.fn().mockReturnValue('M0,0 L10,10'),
  scalePoints: vi.fn().mockImplementation((pts: Array<{x: number; y: number}>) => pts),
}))
vi.mock('@bloctop/shared/tokens', () => ({
  getGradeColor: vi.fn().mockReturnValue('#ff0000'),
}))
vi.mock('@bloctop/shared/topo-constants', () => ({
  computeViewBox: vi.fn().mockReturnValue({ width: 1000, height: 750 }),
}))
vi.mock('@bloctop/ui/components/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock('@/lib/route-validation', () => ({
  validateRouteForm: vi.fn().mockReturnValue({}),
}))

const mockRoute: Route = {
  id: 1,
  name: '测试线路',
  grade: 'V3',
  cragId: 'test-crag',
  area: '主墙',
  faceId: 'face-1',
  setter: '张三',
  FA: '李四',
  description: '一条测试线路',
  topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
  topoTension: 0.5,
}

const mockCache = {
  getImageUrl: vi.fn().mockReturnValue('https://img.example.com/face.jpg'),
  getFaceKey: vi.fn(),
  invalidate: vi.fn(),
  invalidateByPrefix: vi.fn(),
  subscribe: vi.fn(),
  subscribeByPrefix: vi.fn(),
  prefetch: vi.fn(),
}

function setup(route: Route | null = mockRoute) {
  const setRoutes = vi.fn()
  const updateCragAreas = vi.fn().mockResolvedValue(undefined)

  return renderHook(() =>
    useRouteEditor({
      selectedRoute: route,
      faceImageCache: mockCache as never,
      setRoutes,
      persistedAreas: ['主墙'],
      selectedCragId: 'test-crag',
      updateCragAreas,
    })
  )
}

describe('useRouteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ route: mockRoute }),
    })
  })

  it('初始化编辑状态从选中线路', () => {
    const { result } = setup()
    expect(result.current.editedRoute.name).toBe('测试线路')
    expect(result.current.editedRoute.grade).toBe('V3')
    expect(result.current.editedRoute.area).toBe('主墙')
    expect(result.current.topoLine).toHaveLength(2)
    expect(result.current.topoTension).toBe(0.5)
  })

  it('无选中线路时 hasUnsavedChanges 返回 false', () => {
    const { result } = setup(null)
    expect(result.current.hasUnsavedChanges()).toBe(false)
  })

  it('未修改时 hasUnsavedChanges 返回 false', () => {
    const { result } = setup()
    expect(result.current.hasUnsavedChanges()).toBe(false)
  })

  it('修改字段后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    act(() => {
      result.current.setEditedRoute(prev => ({ ...prev, name: '新名称' }))
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })

  it('修改 topoLine 后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    act(() => {
      result.current.setTopoLine([{ x: 0.5, y: 0.5 }])
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })

  it('修改 topoTension 后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    act(() => {
      result.current.setTopoTension(0.8)
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })

  it('handleClearPoints 清空 topoLine 和 tension', () => {
    const { result } = setup()
    act(() => result.current.handleClearPoints())
    expect(result.current.topoLine).toHaveLength(0)
    expect(result.current.topoTension).toBe(0)
  })

  it('handleRemoveLastPoint 移除最后一个点', () => {
    const { result } = setup()
    act(() => result.current.handleRemoveLastPoint())
    expect(result.current.topoLine).toHaveLength(1)
    expect(result.current.topoLine[0]).toEqual({ x: 0.1, y: 0.2 })
  })

  it('routeColor 基于 grade 计算', () => {
    const { result } = setup()
    expect(result.current.routeColor).toBe('#ff0000')
  })

  it('切换岩面时 topoLine 不被清空', () => {
    const { result } = setup()
    // 初始化后 topoLine 应有 2 个点
    expect(result.current.topoLine).toHaveLength(2)
    act(() => {
      result.current.handleFaceSelect('face-2', '主墙')
    })
    // 切换 face 后 topoLine 应保留
    expect(result.current.topoLine).toHaveLength(2)
    expect(result.current.selectedFaceId).toBe('face-2')
  })

  it('切换岩面后 hasUnsavedChanges 返回 true', () => {
    const { result } = setup()
    // mockRoute.faceId 为 'face-1'，切换到 'face-2' 应标记为 dirty
    expect(result.current.hasUnsavedChanges()).toBe(false)
    act(() => {
      result.current.handleFaceSelect('face-2', '主墙')
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })
})
