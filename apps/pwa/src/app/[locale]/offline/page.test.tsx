/**
 * 离线页面测试
 * 测试 AppTabbar 显示和岩场卡片点击行为
 */
/* eslint-disable @next/next/no-html-link-for-pages */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OfflinePage from './page'

// Mock offline-storage
const mockOfflineCrags = [
  {
    cragId: 'ba-jing-cun',
    crag: {
      id: 'ba-jing-cun',
      name: '八井村',
      cityId: 'luoyuan',
      location: '罗源县八井村',
      developmentTime: '2023',
      description: '测试描述',
      approach: '测试接近方式',
    },
    routes: [
      { id: 1, name: '线路1', grade: 'V2', cragId: 'ba-jing-cun', area: '区域1' },
      { id: 2, name: '线路2', grade: 'V4', cragId: 'ba-jing-cun', area: '区域1' },
    ],
    downloadedAt: Date.now(),
  },
]

vi.mock('@/lib/offline-storage', () => ({
  getAllOfflineCrags: vi.fn(() => Promise.resolve(mockOfflineCrags)),
}))

// Mock router.push
const mockPush = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
    }),
  }
})

// Mock AppTabbar component
vi.mock('@/components/app-tabbar', () => ({
  AppTabbar: () => (
    <nav data-testid="app-tabbar">
      <a href="/">home</a>
      <a href="/route">routes</a>
      <a href="/profile">settings</a>
    </nav>
  ),
}))

describe('OfflinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    })
  })

  describe('AppTabbar 集成', () => {
    it('在页面底部显示 AppTabbar', async () => {
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByTestId('app-tabbar')).toBeInTheDocument()
      })
    })

    it('AppTabbar 包含正确的导航链接', async () => {
      render(<OfflinePage />)

      await waitFor(() => {
        const tabbar = screen.getByTestId('app-tabbar')
        expect(tabbar.querySelector('a[href="/"]')).toBeInTheDocument()
        expect(tabbar.querySelector('a[href="/route"]')).toBeInTheDocument()
        expect(tabbar.querySelector('a[href="/profile"]')).toBeInTheDocument()
      })
    })
  })

  describe('岩场卡片点击行为', () => {
    it('点击岩场卡片跳转到线路页面（带岩场过滤参数）', async () => {
      const user = userEvent.setup()
      render(<OfflinePage />)

      // 等待数据加载
      await waitFor(() => {
        expect(screen.getByText('八井村')).toBeInTheDocument()
      })

      // 点击岩场卡片
      const cragButton = screen.getByRole('button', { name: /八井村/i })
      await user.click(cragButton)

      // 验证跳转到正确的 URL
      expect(mockPush).toHaveBeenCalledWith('/zh/route?crag=ba-jing-cun')
    })

    it('不再跳转到离线岩场详情页', async () => {
      const user = userEvent.setup()
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByText('八井村')).toBeInTheDocument()
      })

      const cragButton = screen.getByRole('button', { name: /八井村/i })
      await user.click(cragButton)

      // 确保不会跳转到旧的离线详情页
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/offline/crag/'))
    })
  })

  describe('基础渲染', () => {
    it('显示页面标题', async () => {
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByText('title')).toBeInTheDocument()
      })
    })

    it('显示已下载岩场数量', async () => {
      render(<OfflinePage />)

      await waitFor(() => {
        // Mock 的翻译函数会直接返回 key + 参数
        expect(screen.getByText(/downloadedCrags/i)).toBeInTheDocument()
      })
    })

    it('显示岩场线路数量', async () => {
      render(<OfflinePage />)

      await waitFor(() => {
        // routeCount 带参数 count: 2
        expect(screen.getByText(/routeCount/i)).toBeInTheDocument()
      })
    })
  })

  describe('网络状态', () => {
    it('离线时显示离线状态', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByText('offline')).toBeInTheDocument()
      })
    })

    it('在线时显示恢复提示', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true })
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByText('backOnline')).toBeInTheDocument()
      })
    })

    it('在线时显示返回首页按钮', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true })
      render(<OfflinePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'goHome' })).toBeInTheDocument()
      })
    })
  })
})
