// apps/editor/src/hooks/use-face-data.test.ts
import { describe, it, expect } from 'vitest'
import type { Route } from '@bloctop/shared/types'

// 提取 faceGroups 计算的纯函数版本（将来 hook 也会用这个逻辑）
interface R2FaceInfo { faceId: string; area: string }
interface FaceGroup { faceId: string; area: string; routes: Route[]; imageUrl: string }

function computeFaceGroups(
  r2Faces: R2FaceInfo[],
  routes: Route[],
  selectedArea: string | null,
  getImageUrl: (params: { cragId: string; area: string; faceId: string }) => string,
  cragId: string
): FaceGroup[] {
  const map = new Map<string, FaceGroup>()
  r2Faces.forEach(({ faceId, area }) => {
    map.set(faceId, {
      faceId,
      area,
      routes: [],
      imageUrl: getImageUrl({ cragId, area, faceId }),
    })
  })
  routes.forEach(r => {
    if (!r.faceId) return
    const entry = map.get(r.faceId)
    if (entry) entry.routes.push(r)
  })
  let result = Array.from(map.values())
  if (selectedArea) result = result.filter(f => f.area === selectedArea)
  return result
}

const fakeGetImageUrl = ({ cragId, area, faceId }: { cragId: string; area: string; faceId: string }) =>
  `https://img.example.com/${cragId}/${area}/${faceId}.jpg`

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V3', cragId: 'test-crag', area: '主墙', faceId: 'face-1' } as Route,
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: '主墙', faceId: 'face-1' } as Route,
  { id: 3, name: '线路C', grade: 'V1', cragId: 'test-crag', area: '侧墙', faceId: 'face-2' } as Route,
  { id: 4, name: '线路D', grade: 'V2', cragId: 'test-crag', area: '主墙', faceId: undefined } as Route,
]

describe('computeFaceGroups', () => {
  it('应根据 r2Faces 构建 face 列表', () => {
    const r2Faces: R2FaceInfo[] = [
      { faceId: 'face-1', area: '主墙' },
      { faceId: 'face-2', area: '侧墙' },
    ]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(2)
    expect(result[0].faceId).toBe('face-1')
    expect(result[0].routes).toHaveLength(2)
    expect(result[1].faceId).toBe('face-2')
    expect(result[1].routes).toHaveLength(1)
  })

  it('没有 faceId 的线路不应关联到任何 face', () => {
    const r2Faces: R2FaceInfo[] = [{ faceId: 'face-1', area: '主墙' }]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    const face1 = result.find(f => f.faceId === 'face-1')!
    expect(face1.routes.map(r => r.id)).not.toContain(4)
  })

  it('area 筛选应过滤掉非当前 area 的 face', () => {
    const r2Faces: R2FaceInfo[] = [
      { faceId: 'face-1', area: '主墙' },
      { faceId: 'face-2', area: '侧墙' },
    ]
    const result = computeFaceGroups(r2Faces, mockRoutes, '侧墙', fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(1)
    expect(result[0].faceId).toBe('face-2')
  })

  it('imageUrl 应包含 cragId、area、faceId', () => {
    const r2Faces: R2FaceInfo[] = [{ faceId: 'face-1', area: '主墙' }]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result[0].imageUrl).toBe('https://img.example.com/test-crag/主墙/face-1.jpg')
  })

  it('r2Faces 为空时返回空数组', () => {
    const result = computeFaceGroups([], mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(0)
  })
})
