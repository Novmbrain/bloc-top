/**
 * GET /api/editor/crags — 编辑器岩场列表 (权限过滤)
 *
 * 覆盖场景:
 * - 未登录返回 401
 * - admin 看到所有岩场 (permissionRole: 'admin')
 * - 有岩场权限的用户只看到有权限的岩场 (permissionRole: 'manager')
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
  canCreateCrag: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  getAllCrags: vi.fn(),
  getCragPermissionsByUserId: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
  }),
}))

import { GET } from './route'
import { requireAuth } from '@/lib/require-auth'
import { canCreateCrag } from '@/lib/permissions'
import { getAllCrags, getCragPermissionsByUserId } from '@/lib/db'

const mockRequireAuth = vi.mocked(requireAuth)
const mockCanCreateCrag = vi.mocked(canCreateCrag)
const mockGetAllCrags = vi.mocked(getAllCrags)
const mockGetCragPermissions = vi.mocked(getCragPermissionsByUserId)

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

  it('should return all crags for admin, with specific roles where available', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'admin1', role: 'admin' })
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)
    mockGetCragPermissions.mockResolvedValue([
      { userId: 'admin1', cragId: 'crag-1', role: 'manager', assignedBy: 'system', createdAt: new Date() },
    ])

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toHaveLength(3)
    // crag-1 有具体角色 → 显示 manager
    expect(data.crags.find((c: any) => c.id === 'crag-1').permissionRole).toBe('manager')
    // crag-2, crag-3 无记录 → fallback 为 admin
    expect(data.crags.find((c: any) => c.id === 'crag-2').permissionRole).toBe('admin')
    expect(data.crags.find((c: any) => c.id === 'crag-3').permissionRole).toBe('admin')
    expect(data.role).toBe('admin')
    expect(data.canCreate).toBe(true)
  })

  it('should return only permitted crags with correct roles', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'user' })
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)
    mockGetCragPermissions.mockResolvedValue([
      { userId: 'user1', cragId: 'crag-1', role: 'manager', assignedBy: 'system', createdAt: new Date() },
      { userId: 'user1', cragId: 'crag-3', role: 'manager', assignedBy: 'admin1', createdAt: new Date() },
    ])

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toHaveLength(2)
    expect(data.crags[0].id).toBe('crag-1')
    expect(data.crags[0].permissionRole).toBe('manager')
    expect(data.crags[1].id).toBe('crag-3')
    expect(data.crags[1].permissionRole).toBe('manager')
  })

  it('should return empty array for user with no permissions', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user2', role: 'user' })
    mockCanCreateCrag.mockReturnValue(false)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)
    mockGetCragPermissions.mockResolvedValue([])

    const res = await GET(createRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.crags).toEqual([])
    expect(data.canCreate).toBe(false)
  })

  it('should include role and canCreate in response', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'user' })
    mockCanCreateCrag.mockReturnValue(true)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)
    mockGetCragPermissions.mockResolvedValue([
      { userId: 'user1', cragId: 'crag-1', role: 'manager', assignedBy: 'system', createdAt: new Date() },
    ])

    const res = await GET(createRequest())
    const data = await res.json()
    expect(data.role).toBe('user')
    expect(data.canCreate).toBe(true)
  })

  it('should not include crags without permission records', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'user' })
    mockCanCreateCrag.mockReturnValue(false)
    mockGetAllCrags.mockResolvedValue(ALL_CRAGS as any)
    mockGetCragPermissions.mockResolvedValue([
      { userId: 'user1', cragId: 'crag-2', role: 'manager', assignedBy: 'admin1', createdAt: new Date() },
    ])

    const res = await GET(createRequest())
    const data = await res.json()
    expect(data.crags).toHaveLength(1)
    expect(data.crags[0].id).toBe('crag-2')
    // crag-1 和 crag-3 不应出现
  })
})
