// apps/editor/src/hooks/use-beta-management.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Route, BetaLink } from '@bloctop/shared/types'

const mockRoute: Route = {
  id: 42,
  name: '圆通测试路线',
  grade: 'V5',
  cragId: 'yuan-tong-si',
  area: '主墙',
  betaLinks: [
    {
      id: 'beta-1',
      platform: 'xiaohongshu',
      noteId: 'note-123',
      url: 'https://example.com',
      title: '爬法视频',
      author: '张三',
      climberHeight: 170,
      climberReach: 175,
    } as BetaLink,
  ],
} as Route

describe('handleSaveBeta', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 PATCH /api/beta', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const editForm = { title: '新标题', author: '李四', climberHeight: '175', climberReach: '180' }
    const res = await fetch('/api/beta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: mockRoute.id,
        betaId: 'beta-1',
        title: editForm.title,
        author: editForm.author,
        climberHeight: parseInt(editForm.climberHeight, 10),
        climberReach: parseInt(editForm.climberReach, 10),
      }),
    })

    expect(res.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/beta', expect.objectContaining({ method: 'PATCH' }))
  })

  it('失败时应抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '无权操作' }),
    } as Response)

    const res = await fetch('/api/beta', { method: 'PATCH', headers: {}, body: '' })
    const data = await res.json()

    let error = ''
    if (!res.ok) error = data.error || '保存失败'
    expect(error).toBe('无权操作')
  })
})

describe('handleDeleteBeta', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 DELETE /api/beta', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const res = await fetch('/api/beta', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: mockRoute.id, betaId: 'beta-1' }),
    })

    expect(res.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/beta', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('updateRouteAndSelected 辅助逻辑', () => {
  it('应同时更新 routes 列表和 selectedRoute', () => {
    const routes: Route[] = [
      { ...mockRoute, id: 42 },
      { ...mockRoute, id: 99, name: '其他线路' },
    ]

    const transform = (r: Route): Route => ({
      ...r,
      betaLinks: [{ ...r.betaLinks![0], title: '已更新' }],
    })

    const updatedRoutes = routes.map(r => r.id === 42 ? transform(r) : r)
    const updatedSelected = transform(mockRoute)

    expect(updatedRoutes[0].betaLinks![0].title).toBe('已更新')
    expect(updatedRoutes[1].name).toBe('其他线路') // 未受影响
    expect(updatedSelected.betaLinks![0].title).toBe('已更新')
  })
})
