/**
 * POST /api/routes — 创建线路
 *
 * 覆盖场景:
 * - 未登录返回 401
 * - 缺少必填字段返回 400
 * - 无岩场编辑权限返回 403
 * - 成功创建返回 201
 * - 数据库错误返回 500
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  createRoute: vi.fn(),
}))

vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  canEditCrag: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
  }),
}))

import { POST } from './route'
import { requireAuth } from '@/lib/require-auth'
import { canEditCrag } from '@/lib/permissions'
import { createRoute } from '@/lib/db'

const mockRequireAuth = vi.mocked(requireAuth)
const mockCanEditCrag = vi.mocked(canEditCrag)
const mockCreateRoute = vi.mocked(createRoute)

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/routes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/routes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    )
    const res = await POST(createRequest({}))
    expect(res.status).toBe(401)
  })

  it('should return 400 when name is missing', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    const res = await POST(createRequest({ grade: 'V3', cragId: 'c1', area: 'A' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('名称')
  })

  it('should return 400 when grade is missing', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    const res = await POST(createRequest({ name: '线路1', cragId: 'c1', area: 'A' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('难度')
  })

  it('should return 400 when cragId is missing', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    const res = await POST(createRequest({ name: '线路1', grade: 'V3', area: 'A' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('岩场')
  })

  it('should return 400 when area is missing', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    const res = await POST(createRequest({ name: '线路1', grade: 'V3', cragId: 'c1' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('区域')
  })

  it('should return 403 when user cannot edit crag', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'user' })
    mockCanEditCrag.mockResolvedValue(false)
    const res = await POST(createRequest({ name: '线路1', grade: 'V3', cragId: 'c1', area: 'A' }))
    expect(res.status).toBe(403)
  })

  it('should create route and return 201', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    mockCanEditCrag.mockResolvedValue(true)
    mockCreateRoute.mockResolvedValue({ id: 1, name: '线路1', grade: 'V3', cragId: 'c1', area: 'A' })

    const res = await POST(createRequest({ name: '线路1', grade: 'V3', cragId: 'c1', area: 'A', setter: 'Tom' }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.route.id).toBe(1)
  })

  it('should trim name and area', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    mockCanEditCrag.mockResolvedValue(true)
    mockCreateRoute.mockResolvedValue({ id: 2, name: '线路2', grade: 'V0', cragId: 'c1', area: 'B' })

    await POST(createRequest({ name: '  线路2  ', grade: 'V0', cragId: 'c1', area: '  B  ' }))
    expect(mockCreateRoute).toHaveBeenCalledWith(
      expect.objectContaining({ name: '线路2', area: 'B' })
    )
  })

  it('should return 500 on database error', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'u1', role: 'admin' })
    mockCanEditCrag.mockResolvedValue(true)
    mockCreateRoute.mockRejectedValue(new Error('DB error'))

    const res = await POST(createRequest({ name: '线路1', grade: 'V3', cragId: 'c1', area: 'A' }))
    expect(res.status).toBe(500)
  })
})
