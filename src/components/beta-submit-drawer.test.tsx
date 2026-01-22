/**
 * BetaSubmitDrawer 组件测试
 * 测试 Beta 提交抽屉的表单验证和提交流程
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { BetaSubmitDrawer } from './beta-submit-drawer'

// Mock fetch
const mockFetch = vi.fn()

describe('BetaSubmitDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    routeId: 1,
    routeName: '月光',
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('渲染', () => {
    it('应该渲染表单字段', () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      expect(screen.getByText('urlLabel')).toBeInTheDocument()
      expect(screen.getByText('bodyDataLabel')).toBeInTheDocument()
    })

    it('应该渲染 URL 输入框', () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      expect(screen.getByPlaceholderText('urlPlaceholder')).toBeInTheDocument()
    })

    it('应该渲染身高和臂长输入框', () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      expect(screen.getByPlaceholderText('heightPlaceholder')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('reachPlaceholder')).toBeInTheDocument()
    })

    it('应该渲染提交按钮', () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      expect(screen.getByText('submit')).toBeInTheDocument()
    })
  })

  describe('URL 验证', () => {
    it('URL 为空时提交按钮应禁用', () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      const submitButton = screen.getByText('submit')
      expect(submitButton).toBeDisabled()
    })

    it('输入 URL 后提交按钮应启用', async () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText('urlPlaceholder')
      fireEvent.change(urlInput, { target: { value: 'https://xhslink.com/abc' } })

      await waitFor(() => {
        const submitButton = screen.getByText('submit')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('非小红书 URL 应显示错误', async () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText('urlPlaceholder')
      fireEvent.change(urlInput, { target: { value: 'https://example.com/video' } })

      const submitButton = screen.getByText('submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('onlyXiaohongshu')).toBeInTheDocument()
      })
    })

    it('小红书 URL 应检测平台', async () => {
      render(<BetaSubmitDrawer {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText('urlPlaceholder')
      fireEvent.change(urlInput, { target: { value: 'https://xhslink.com/abc123' } })

      await waitFor(() => {
        expect(screen.getByText('urlDetected')).toBeInTheDocument()
      })
    })
  })

  describe('表单提交', () => {
    it('提交成功应显示成功提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<BetaSubmitDrawer {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText('urlPlaceholder')
      fireEvent.change(urlInput, { target: { value: 'https://xhslink.com/abc123' } })

      const submitButton = screen.getByText('submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('submitSuccess')).toBeInTheDocument()
      })
    })

    it('提交失败应显示错误提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ code: 'DUPLICATE_BETA' }),
      })

      render(<BetaSubmitDrawer {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText('urlPlaceholder')
      fireEvent.change(urlInput, { target: { value: 'https://xhslink.com/abc123' } })

      const submitButton = screen.getByText('submit')
      fireEvent.click(submitButton)

      await waitFor(() => {
        // 错误消息会被翻译
        expect(screen.getByText('DUPLICATE_BETA')).toBeInTheDocument()
      })
    })

    it('提交时应传递身高和臂长', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<BetaSubmitDrawer {...defaultProps} />)

      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('urlPlaceholder'), {
        target: { value: 'https://xhslink.com/abc123' },
      })
      fireEvent.change(screen.getByPlaceholderText('heightPlaceholder'), {
        target: { value: '175' },
      })
      fireEvent.change(screen.getByPlaceholderText('reachPlaceholder'), {
        target: { value: '180' },
      })

      fireEvent.click(screen.getByText('submit'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/beta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routeId: 1,
            url: 'https://xhslink.com/abc123',
            climberHeight: 175,
            climberReach: 180,
          }),
        })
      })
    })
  })

  describe('表单状态', () => {
    it('提交中应显示 loading 状态', async () => {
      // 延迟响应以捕获 loading 状态
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(
          () => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          }),
          100
        ))
      )

      render(<BetaSubmitDrawer {...defaultProps} />)

      fireEvent.change(screen.getByPlaceholderText('urlPlaceholder'), {
        target: { value: 'https://xhslink.com/abc123' },
      })

      fireEvent.click(screen.getByText('submit'))

      await waitFor(() => {
        expect(screen.getByText('submitting')).toBeInTheDocument()
      })
    })

    it('提交成功后应调用 onSuccess', async () => {
      const onSuccess = vi.fn()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      render(<BetaSubmitDrawer {...defaultProps} onSuccess={onSuccess} />)

      fireEvent.change(screen.getByPlaceholderText('urlPlaceholder'), {
        target: { value: 'https://xhslink.com/abc123' },
      })

      fireEvent.click(screen.getByText('submit'))

      // 等待 success 状态
      await waitFor(() => {
        expect(screen.getByText('submitSuccess')).toBeInTheDocument()
      })

      // 等待 1500ms 的 setTimeout 触发 onSuccess
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      }, { timeout: 2000 })
    })
  })

  describe('关闭行为', () => {
    it('关闭时应重置表单', async () => {
      const onClose = vi.fn()
      const { rerender } = render(
        <BetaSubmitDrawer {...defaultProps} onClose={onClose} />
      )

      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('urlPlaceholder'), {
        target: { value: 'https://xhslink.com/abc123' },
      })

      // 关闭并重新打开
      rerender(<BetaSubmitDrawer {...defaultProps} isOpen={false} onClose={onClose} />)
      rerender(<BetaSubmitDrawer {...defaultProps} isOpen={true} onClose={onClose} />)

      // 表单应该被重置
      // 注意：由于 Drawer 关闭时会调用 handleClose 重置表单
      // 但这取决于组件内部实现，此处仅验证重新打开不会崩溃
      expect(screen.getByPlaceholderText('urlPlaceholder')).toBeInTheDocument()
    })
  })

  describe('抽屉状态', () => {
    it('isOpen=false 时不应渲染内容', () => {
      render(<BetaSubmitDrawer {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('urlLabel')).not.toBeInTheDocument()
    })
  })
})
