import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteListItem } from './route-list-item'
import type { Route } from '@/types'

const baseRoute: Route = {
  id: 1,
  name: '月亮弯弯',
  grade: 'V5',
  cragId: 'test-crag',
  area: '主墙',
}

describe('RouteListItem', () => {
  it('渲染线路名称和难度', () => {
    render(<RouteListItem route={baseRoute} onClick={vi.fn()} />)
    expect(screen.getByText('月亮弯弯')).toBeInTheDocument()
    expect(screen.getByText('V5')).toBeInTheDocument()
  })

  it('渲染区域名称', () => {
    render(<RouteListItem route={baseRoute} onClick={vi.fn()} />)
    expect(screen.getByText('主墙')).toBeInTheDocument()
  })

  it('有 FA 时显示首攀者', () => {
    const route = { ...baseRoute, FA: '小明' }
    render(<RouteListItem route={route} onClick={vi.fn()} />)
    expect(screen.getByText('小明')).toBeInTheDocument()
  })

  it('无 FA 时不显示首攀者', () => {
    render(<RouteListItem route={baseRoute} onClick={vi.fn()} />)
    expect(screen.queryByText('FA:')).not.toBeInTheDocument()
  })

  it('点击时调用 onClick 并传递 route', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<RouteListItem route={baseRoute} onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(baseRoute)
  })

  it('compact 模式下使用较小尺寸', () => {
    const { container } = render(
      <RouteListItem route={baseRoute} onClick={vi.fn()} compact />
    )
    // compact 模式下难度标签用 w-10 h-10
    const badge = container.querySelector('.w-10.h-10')
    expect(badge).toBeInTheDocument()
  })

  it('默认模式下使用较大尺寸', () => {
    const { container } = render(
      <RouteListItem route={baseRoute} onClick={vi.fn()} />
    )
    // 默认模式下难度标签用 w-12 h-12
    const badge = container.querySelector('.w-12.h-12')
    expect(badge).toBeInTheDocument()
  })

  it('compact 模式下有 Beta 链接时显示 Beta 标签', () => {
    const route = {
      ...baseRoute,
      betaLinks: [{ id: '1', platform: 'xiaohongshu' as const, noteId: 'n1', url: 'https://example.com' }],
    }
    render(<RouteListItem route={route} onClick={vi.fn()} compact />)
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('默认模式下不显示 Beta 标签', () => {
    const route = {
      ...baseRoute,
      betaLinks: [{ id: '1', platform: 'xiaohongshu' as const, noteId: 'n1', url: 'https://example.com' }],
    }
    render(<RouteListItem route={route} onClick={vi.fn()} />)
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('接受额外 className 和 style', () => {
    const { container } = render(
      <RouteListItem
        route={baseRoute}
        onClick={vi.fn()}
        className="animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      />
    )
    const button = container.querySelector('button')
    expect(button?.classList.contains('animate-fade-in-up')).toBe(true)
    expect(button?.style.animationDelay).toBe('100ms')
  })
})
