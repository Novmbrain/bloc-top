import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { TopoPreview } from './topo-preview'

const MockOverlay = () => <div data-testid="mock-overlay" />

const baseProps = {
  imageUrl: null as string | null,
  imageLoadError: false,
  isImageLoading: false,
  imageAspectRatio: undefined as number | undefined,
  topoLine: [] as Array<{ x: number; y: number }>,
  routeColor: '#ff0000',
  scaledPoints: [] as Array<{ x: number; y: number }>,
  pathData: '',
  vb: { width: 1000, height: 750 },
  sameFaceRoutes: [],
  showOtherRoutes: true,
  onToggleOtherRoutes: vi.fn(),
  onOpenFullscreen: vi.fn(),
  onRouteClick: vi.fn(),
  onImageLoad: vi.fn(),
  onImageError: vi.fn(),
  MultiTopoLineOverlay: MockOverlay,
}

describe('TopoPreview', () => {
  it('无图片时显示提示', () => {
    render(<TopoPreview {...baseProps} />)
    expect(screen.getByText('暂无岩面照片')).toBeInTheDocument()
  })

  it('有图片时渲染 img 元素', () => {
    render(<TopoPreview {...baseProps} imageUrl="https://img.example.com/face.jpg" />)
    expect(screen.getByAltText('岩面照片')).toBeInTheDocument()
  })

  it('无标注点时显示"开始标注"', () => {
    render(<TopoPreview {...baseProps} imageUrl="https://img.example.com/face.jpg" />)
    expect(screen.getByText('开始标注')).toBeInTheDocument()
  })

  it('有标注点时显示"编辑标注"', () => {
    const points = [{ x: 10, y: 20 }, { x: 30, y: 40 }]
    render(
      <TopoPreview
        {...baseProps}
        imageUrl="https://img.example.com/face.jpg"
        topoLine={points}
        scaledPoints={points}
        pathData="M10,20 L30,40"
      />
    )
    expect(screen.getByText('编辑标注')).toBeInTheDocument()
    expect(screen.getByText('2 个控制点')).toBeInTheDocument()
  })

  it('isImageLoading 显示加载状态', () => {
    render(<TopoPreview {...baseProps} imageUrl="https://img.example.com/face.jpg" isImageLoading />)
    expect(screen.getByText('加载云端图片...')).toBeInTheDocument()
  })

  it('点击标注按钮触发 onOpenFullscreen', async () => {
    const onOpenFullscreen = vi.fn()
    const { user } = render(
      <TopoPreview {...baseProps} imageUrl="https://img.example.com/face.jpg" onOpenFullscreen={onOpenFullscreen} />
    )
    await user.click(screen.getByText('开始标注'))
    expect(onOpenFullscreen).toHaveBeenCalledOnce()
  })
})
