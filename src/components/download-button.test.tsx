/**
 * 下载按钮组件测试
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, type RenderOptions } from '@testing-library/react'
import { DownloadButton, DownloadStatusIndicator } from './download-button'
import { ToastProvider } from '@/components/ui/toast'
import type { Crag, Route, DownloadProgress } from '@/types'
import type { ReactElement } from 'react'

// 测试包装器 - 提供必要的 Context Providers
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ToastProvider>{children}</ToastProvider>
    ),
    ...options,
  })
}

// 测试数据
const mockCrag: Crag = {
  id: 'test-crag',
  name: '测试岩场',
  cityId: 'luoyuan',
  location: '测试位置',
  developmentTime: '2024',
  description: '测试描述',
  approach: '测试接近方式',
}

const mockRoutes: Route[] = [
  {
    id: 1,
    name: '线路1',
    grade: 'V3',
    cragId: 'test-crag',
    area: '区域A',
  },
]

describe('DownloadButton', () => {
  it('should render download icon when idle', () => {
    const onDownload = vi.fn()
    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={false}
        progress={null}
        onDownload={onDownload}
      />
    )

    // 按钮应该存在
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'download')
  })

  it('should render check icon when completed', () => {
    const onDownload = vi.fn()
    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={true}
        progress={null}
        onDownload={onDownload}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'downloaded')
  })

  it('should render progress when downloading', () => {
    const onDownload = vi.fn()
    const progress: DownloadProgress = {
      cragId: 'test-crag',
      status: 'downloading',
      totalImages: 10,
      downloadedImages: 5,
    }

    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={false}
        progress={progress}
        onDownload={onDownload}
      />
    )

    const button = screen.getByRole('button')
    // 进度应该是 50%
    expect(button).toHaveAttribute('title', 'downloading 50%')
  })

  it('should call onDownload when clicked in idle state', async () => {
    const onDownload = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={false}
        progress={null}
        onDownload={onDownload}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onDownload).toHaveBeenCalledWith(mockCrag, mockRoutes)
  })

  it('should not call onDownload when downloading', () => {
    const onDownload = vi.fn()
    const progress: DownloadProgress = {
      cragId: 'test-crag',
      status: 'downloading',
      totalImages: 10,
      downloadedImages: 5,
    }

    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={false}
        progress={progress}
        onDownload={onDownload}
      />
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onDownload).not.toHaveBeenCalled()
  })

  it('should show failed state', () => {
    const onDownload = vi.fn()
    const progress: DownloadProgress = {
      cragId: 'test-crag',
      status: 'failed',
      totalImages: 10,
      downloadedImages: 0,
      error: 'Network error',
    }

    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={false}
        progress={progress}
        onDownload={onDownload}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'failed')
  })

  it('should render badge variant when downloaded', () => {
    const onDownload = vi.fn()
    renderWithProviders(
      <DownloadButton
        crag={mockCrag}
        routes={mockRoutes}
        isDownloaded={true}
        progress={null}
        onDownload={onDownload}
        variant="badge"
      />
    )

    // Badge 变体应该显示文字
    expect(screen.getByText('downloaded')).toBeInTheDocument()
  })

  it('should stop event propagation', () => {
    const onDownload = vi.fn().mockResolvedValue(undefined)
    const parentClick = vi.fn()

    renderWithProviders(
      <div onClick={parentClick}>
        <DownloadButton
          crag={mockCrag}
          routes={mockRoutes}
          isDownloaded={false}
          progress={null}
          onDownload={onDownload}
        />
      </div>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // 点击按钮不应该触发父级点击
    expect(parentClick).not.toHaveBeenCalled()
  })
})

describe('DownloadStatusIndicator', () => {
  it('should return null when not downloaded', () => {
    const { container } = render(
      <DownloadStatusIndicator isDownloaded={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should show available text when downloaded', () => {
    render(<DownloadStatusIndicator isDownloaded={true} />)
    expect(screen.getByText('available')).toBeInTheDocument()
  })

  it('should show downloading state', () => {
    render(<DownloadStatusIndicator isDownloaded={false} isDownloading={true} />)
    expect(screen.getByText('downloading')).toBeInTheDocument()
  })
})
