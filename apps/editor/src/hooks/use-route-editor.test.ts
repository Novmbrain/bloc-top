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

  it('切换岩面时原有标注的 topoLine 不被清空', () => {
    const { result } = setup()
    act(() => {
      result.current.handleFaceSelect('face-2', '主墙')
    })
    // 新模型：handleFaceSelect 新增标注，激活 face-2（新标注，topoLine 为空）
    expect(result.current.selectedFaceId).toBe('face-2')
    // face-1 的原有 topoLine 保留在第一条标注中
    expect(result.current.annotations[0].topoLine).toHaveLength(2)
    expect(result.current.annotations[0].faceId).toBe('face-1')
  })

  it('切换岩面后 hasUnsavedChanges 返回 true', () => {
    // 使用无 topoLine 的 mockRoute，排除 topoLine 长度差异对 dirty 检测的干扰
    // faceId 变更应被 hasUnsavedChanges 感知，即使 topoLine 长度不变
    const routeWithoutTopo = { ...mockRoute, topoLine: undefined }
    const { result } = setup(routeWithoutTopo)
    expect(result.current.hasUnsavedChanges()).toBe(false)
    act(() => {
      // faceId 从 'face-1' 切换到 'face-2'；topoLine 从 [] 变成 []，长度不变
      result.current.handleFaceSelect('face-2', '主墙')
    })
    expect(result.current.hasUnsavedChanges()).toBe(true)
  })

  describe('多图标注管理', () => {
    it('初始化时从旧字段合成 annotations', () => {
      const { result } = setup()
      // mockRoute 有 faceId: 'face-1' 和 topoLine (2 点)
      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.annotations[0].faceId).toBe('face-1')
      expect(result.current.annotations[0].topoLine).toHaveLength(2)
      expect(result.current.activeAnnotationIndex).toBe(0)
    })

    it('初始化时从新字段加载 annotations', () => {
      const routeWithAnnotations: Route = {
        ...mockRoute,
        topoAnnotations: [
          { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
          { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
        ],
      }
      const { result } = setup(routeWithAnnotations)
      expect(result.current.annotations).toHaveLength(2)
      expect(result.current.annotations[1].faceId).toBe('face-2')
    })

    it('addAnnotation 新增标注并激活新 index', () => {
      const { result } = setup()
      act(() => {
        result.current.addAnnotation('face-2', '主墙')
      })
      expect(result.current.annotations).toHaveLength(2)
      expect(result.current.annotations[1].faceId).toBe('face-2')
      expect(result.current.annotations[1].topoLine).toHaveLength(0)
      expect(result.current.activeAnnotationIndex).toBe(1)
    })

    it('removeAnnotation 后 activeAnnotationIndex 不越界', () => {
      const routeWith2: Route = {
        ...mockRoute,
        topoAnnotations: [
          { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
          { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
        ],
      }
      const { result } = setup(routeWith2)
      act(() => { result.current.setActiveAnnotationIndex(1) })
      act(() => { result.current.removeAnnotation(1) })
      expect(result.current.annotations).toHaveLength(1)
      expect(result.current.activeAnnotationIndex).toBe(0)
    })

    it('updateActiveTopoLine 只修改激活标注的 topoLine', () => {
      const routeWith2: Route = {
        ...mockRoute,
        topoAnnotations: [
          { faceId: 'face-1', area: '主墙', topoLine: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] },
          { faceId: 'face-2', area: '主墙', topoLine: [{ x: 0.5, y: 0.6 }, { x: 0.7, y: 0.8 }] },
        ],
      }
      const { result } = setup(routeWith2)
      act(() => { result.current.setActiveAnnotationIndex(0) })
      act(() => {
        result.current.updateActiveTopoLine([{ x: 0.9, y: 0.9 }, { x: 0.8, y: 0.8 }])
      })
      expect(result.current.annotations[0].topoLine[0]).toEqual({ x: 0.9, y: 0.9 })
      // 第二条标注不变
      expect(result.current.annotations[1].topoLine[0]).toEqual({ x: 0.5, y: 0.6 })
    })

    it('保存时 patch body 包含 topoAnnotations 和 compat sync', async () => {
      const { result } = setup()
      await act(async () => {
        await result.current.handleSave()
      })
      const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      // 新字段
      expect(body.topoAnnotations).toBeDefined()
      expect(Array.isArray(body.topoAnnotations)).toBe(true)
      // compat sync：旧字段与第一条标注一致
      if (result.current.annotations.length > 0) {
        expect(body.faceId).toBe(result.current.annotations[0].faceId)
      }
    })

    it('添加标注后 hasUnsavedChanges 返回 true', () => {
      const { result } = setup()
      act(() => {
        result.current.addAnnotation('face-2', '主墙')
      })
      expect(result.current.hasUnsavedChanges()).toBe(true)
    })
  })
})
