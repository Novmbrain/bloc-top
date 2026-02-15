import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

const MOCK_SECRET = 'test-revalidate-secret-123'

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('REVALIDATE_SECRET', MOCK_SECRET)
  })

  it('returns 401 without Authorization header', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong Bearer token', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/test' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wrong-token',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct Bearer token and path', async () => {
    const { POST } = await import('./route')
    const { revalidatePath } = await import('next/cache')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/yuan-tong-si' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/zh/crag/yuan-tong-si')
  })

  it('supports paths array for batch revalidation', async () => {
    const { POST } = await import('./route')
    const { revalidatePath } = await import('next/cache')
    const paths = ['/zh/crag/test', '/en/crag/test', '/fr/crag/test']
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ paths }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    paths.forEach(p => expect(revalidatePath).toHaveBeenCalledWith(p))
  })

  it('supports tags for tag-based revalidation', async () => {
    const { revalidateTag } = await import('next/cache')
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ tags: ['crag-yuan-tong-si'] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('crag-yuan-tong-si')
  })

  it('supports routeId to revalidate all locale versions', async () => {
    const { POST } = await import('./route')
    const { revalidatePath } = await import('next/cache')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ routeId: 42 }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/zh/route/42')
    expect(revalidatePath).toHaveBeenCalledWith('/en/route/42')
    expect(revalidatePath).toHaveBeenCalledWith('/fr/route/42')
  })

  it('returns 500 when REVALIDATE_SECRET is not configured', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '')
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/test' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer something',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 400 when no path/paths/tags/routeId provided', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
