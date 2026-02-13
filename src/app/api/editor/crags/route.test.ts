/**
 * GET /api/editor/crags — 编辑器岩场列表 (权限过滤)
 *
 * 覆盖场景:
 * - 未登录返回 401
 * - admin 看到所有岩场
 * - crag_creator 只看到有权限的岩场
 * - 无权限用户返回空数组
 * - 返回 role + canCreate 供前端 UI 决策
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
}))

vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  getEditableCragIds: vi.fn(),
  canCreateCrag: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAllCrags: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
  }),
}))

import { GET } from './route'
import { requireAuth } from '@/lib/require-auth'
import { getEditableCragIds, canCreateCrag } from '@/lib/permissions'
import { getAllCrags } from '@/lib/db'

const mockRequireAuth = vi.mocked(requireAuth)
const mockGetEditableCragIds = vi.mocked(getEditableCragIds)
const mockCanCreateCrag = vi.mocked(canCreateCrag)
const mockGetAllCrags = vi.mocked(getAllCrags)

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/editor/crags')
}

const ALL_CRAGS = [
  { id: 'crag-1', name: '岩场A', cityId: 'city1' },
  { id: 'crag-2', name: '岩场B', cityId: 'city1' },
  { id: 'crag-3', name: '岩场C', cityId: 'city2' },
]

describe('GET /api/editor/crags', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    )
    const res = await GET(createRequest())
    expect(res.status).toBe(401)
  })

  it('should return all crags for admin', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'admin1', role: 'admin' })
    mockGetEditableCragIds.mockResolvedValue('all')
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toHaveLength(3)
    expect(data.role).toBe('admin')
    expect(data.canCreate).toBe(true)
  })

  it('should return only permitted crags for crag_creator', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'crag_creator' })
    mockGetEditableCragIds.mockResolvedValue(['crag-1', 'crag-3'])
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toHaveLength(2)
    expect(data.crags.map((c: any) => c.id)).toEqual(['crag-1', 'crag-3'])
  })

  it('should return empty array for user with no permissions', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user2', role: 'user' })
    mockGetEditableCragIds.mockResolvedValue([])
    mockCanCreateCrag.mockReturnValue(false)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toEqual([])
    expect(data.canCreate).toBe(false)
  })

  it('should include role and canCreate in response', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'crag_creator' })
    mockGetEditableCragIds.mockResolvedValue(['crag-1'])
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)

    const res = await GET(createRequest())
    const data = await res.json()
    expect(data.role).toBe('crag_creator')
    expect(data.canCreate).toBe(true)
  })
})
