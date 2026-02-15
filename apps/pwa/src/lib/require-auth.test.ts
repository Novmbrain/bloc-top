/**
 * requireAuth — API 路由共享认证 helper
 *
 * 覆盖场景:
 * - 无 session → 返回 401 NextResponse
 * - session.user 存在但无 role → 默认 'user'
 * - session.user 存在且有 role → 返回对应 role
 * - 返回类型为 AuthInfo (非 NextResponse) 时包含 userId + role
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}))

import { requireAuth } from './require-auth'
import { getAuth } from '@/lib/auth'

const mockGetAuth = vi.mocked(getAuth)

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/test')
}

function mockSession(user: Record<string, unknown> | null) {
  mockGetAuth.mockResolvedValue({
    api: {
      getSession: vi.fn().mockResolvedValue(user ? { user } : null),
    },
  } as ReturnType<typeof getAuth> extends Promise<infer T> ? T : never)
}

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when no session', async () => {
    mockSession(null)
    const result = await requireAuth(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    const res = result as NextResponse
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('未登录')
  })

  it('should return 401 when session has no user', async () => {
    mockGetAuth.mockResolvedValue({
      api: {
        getSession: vi.fn().mockResolvedValue({ user: null }),
      },
    } as ReturnType<typeof getAuth> extends Promise<infer T> ? T : never)

    const result = await requireAuth(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it('should return 401 when user has no id', async () => {
    mockSession({ name: 'test' })
    const result = await requireAuth(createRequest())
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it('should return AuthInfo with role when session is valid', async () => {
    mockSession({ id: 'user-123', role: 'admin' })
    const result = await requireAuth(createRequest())
    expect(result).not.toBeInstanceOf(NextResponse)
    expect(result).toEqual({ userId: 'user-123', role: 'admin' })
  })

  it('should default role to user when role is missing', async () => {
    mockSession({ id: 'user-456' })
    const result = await requireAuth(createRequest())
    expect(result).not.toBeInstanceOf(NextResponse)
    expect(result).toEqual({ userId: 'user-456', role: 'user' })
  })

  it('should default role to user when role is empty string', async () => {
    mockSession({ id: 'user-789', role: '' })
    const result = await requireAuth(createRequest())
    expect(result).not.toBeInstanceOf(NextResponse)
    expect(result).toEqual({ userId: 'user-789', role: 'user' })
  })

  it('should pass request headers to getSession', async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      user: { id: 'u1', role: 'admin' },
    })
    mockGetAuth.mockResolvedValue({
      api: { getSession: mockGetSession },
    } as ReturnType<typeof getAuth> extends Promise<infer T> ? T : never)

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: { Authorization: 'Bearer token123' },
    })
    await requireAuth(req)

    expect(mockGetSession).toHaveBeenCalledWith({ headers: req.headers })
  })
})
