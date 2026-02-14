/**
 * PATCH /api/crags/[id]/areas — 认证+权限测试
 *
 * 覆盖场景:
 * - 未登录返回 401
 * - 无权限返回 403
 * - admin 可以编辑任意岩场
 * - 有 crag_permission 的用户可以编辑
 * - 正常更新返回 200
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock mongodb (permissions.ts -> getDatabase)
vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
}))

// Mock require-auth
vi.mock('@/lib/require-auth', () => ({
  requireAuth: vi.fn(),
}))

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  canEditCrag: vi.fn(),
}))

// Mock db
vi.mock('@/lib/db', () => ({
  updateCragAreas: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { PATCH } from './route'
import { requireAuth } from '@/lib/require-auth'
import { canEditCrag } from '@/lib/permissions'
import { updateCragAreas } from '@/lib/db'

const mockRequireAuth = vi.mocked(requireAuth)
const mockCanEditCrag = vi.mocked(canEditCrag)
const mockUpdateCragAreas = vi.mocked(updateCragAreas)

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/crags/test-crag/areas', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const mockParams = { params: Promise.resolve({ id: 'test-crag' }) }

describe('PATCH /api/crags/[id]/areas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    )

    const response = await PATCH(createRequest({ areas: ['A'] }), mockParams)
    expect(response.status).toBe(401)
  })

  it('should return 403 when user lacks permission', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'user' })
    mockCanEditCrag.mockResolvedValue(false)

    const response = await PATCH(createRequest({ areas: ['A'] }), mockParams)
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toContain('无权')
  })

  it('should allow admin to update areas', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'admin1', role: 'admin' })
    mockCanEditCrag.mockResolvedValue(true)
    mockUpdateCragAreas.mockResolvedValue(['区域A', '区域B'])

    const response = await PATCH(
      createRequest({ areas: ['区域A', '区域B'] }),
      mockParams
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.areas).toEqual(['区域A', '区域B'])
  })

  it('should allow permitted user to update areas', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user1', role: 'user' })
    mockCanEditCrag.mockResolvedValue(true)
    mockUpdateCragAreas.mockResolvedValue(['新区域'])

    const response = await PATCH(
      createRequest({ areas: ['新区域'] }),
      mockParams
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('should return 400 for invalid areas format', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'admin1', role: 'admin' })
    mockCanEditCrag.mockResolvedValue(true)

    const response = await PATCH(
      createRequest({ areas: 'not-an-array' }),
      mockParams
    )
    expect(response.status).toBe(400)
  })
})
