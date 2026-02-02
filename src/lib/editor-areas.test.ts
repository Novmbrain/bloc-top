import { describe, it, expect } from 'vitest'
import { deriveAreas } from './editor-areas'
import type { Route, Crag } from '@/types'

function makeRoute(overrides: Partial<Route> & { cragId: string; area: string }): Route {
  return {
    id: 1,
    name: 'test',
    grade: 'V0',
    ...overrides,
  }
}

function makeCrag(overrides: Partial<Crag> & { id: string }): Crag {
  return {
    name: 'Test Crag',
    cityId: 'test',
    location: '',
    developmentTime: '',
    description: '',
    approach: '',
    ...overrides,
  }
}

describe('deriveAreas', () => {
  it('returns empty array when no crag selected', () => {
    const routes = [makeRoute({ cragId: 'a', area: '区域1' })]
    expect(deriveAreas(routes, null, undefined)).toEqual([])
  })

  it('returns only areas from routes matching selectedCragId', () => {
    const routes = [
      makeRoute({ id: 1, cragId: 'crag-a', area: '区域A' }),
      makeRoute({ id: 2, cragId: 'crag-b', area: '区域B' }),
      makeRoute({ id: 3, cragId: 'crag-a', area: '区域C' }),
    ]
    const result = deriveAreas(routes, 'crag-a', makeCrag({ id: 'crag-a' }))
    expect(result).toEqual(['区域A', '区域C'])
    expect(result).not.toContain('区域B')
  })

  it('filters out stale routes from previous crag during transition', () => {
    // Simulates the race condition: routes still contain old crag data
    // but selectedCragId has already changed
    const staleRoutes = [
      makeRoute({ id: 1, cragId: 'old-crag', area: '旧区域1' }),
      makeRoute({ id: 2, cragId: 'old-crag', area: '旧区域2' }),
    ]
    const newCrag = makeCrag({ id: 'new-crag', areas: ['新区域'] })
    const result = deriveAreas(staleRoutes, 'new-crag', newCrag)
    expect(result).toEqual(['新区域'])
    expect(result).not.toContain('旧区域1')
    expect(result).not.toContain('旧区域2')
  })

  it('merges crag.areas with route-derived areas without duplicates', () => {
    const routes = [
      makeRoute({ id: 1, cragId: 'c1', area: '区域A' }),
      makeRoute({ id: 2, cragId: 'c1', area: '区域B' }),
    ]
    const crag = makeCrag({ id: 'c1', areas: ['区域A', '区域C'] })
    const result = deriveAreas(routes, 'c1', crag)
    expect(result).toEqual(['区域A', '区域B', '区域C'])
  })

  it('returns sorted areas', () => {
    const routes = [
      makeRoute({ id: 1, cragId: 'c1', area: 'C区' }),
      makeRoute({ id: 2, cragId: 'c1', area: 'A区' }),
    ]
    const crag = makeCrag({ id: 'c1', areas: ['B区'] })
    expect(deriveAreas(routes, 'c1', crag)).toEqual(['A区', 'B区', 'C区'])
  })

  it('skips routes with empty area', () => {
    const routes = [
      makeRoute({ id: 1, cragId: 'c1', area: '' }),
      makeRoute({ id: 2, cragId: 'c1', area: '有效区域' }),
    ]
    expect(deriveAreas(routes, 'c1', makeCrag({ id: 'c1' }))).toEqual(['有效区域'])
  })

  it('returns crag.areas even when routes is empty', () => {
    const crag = makeCrag({ id: 'c1', areas: ['预设区域'] })
    expect(deriveAreas([], 'c1', crag)).toEqual(['预设区域'])
  })
})
