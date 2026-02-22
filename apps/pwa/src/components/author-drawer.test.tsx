import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthorDrawer } from './author-drawer'

describe('AuthorDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('打开时显示作者名和签名', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('傅文杰')).toBeTruthy()
  })

  it('显示微信联系方式', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Novmbrain')).toBeTruthy()
  })

  it('显示小红书联系方式', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('WindOfBretagne')).toBeTruthy()
  })

  it('点击微信按钮复制到剪贴板', async () => {
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)

    const wechatButton = screen.getByText('Novmbrain').closest('button')!
    await user.click(wechatButton)

    expect(writeTextMock).toHaveBeenCalledWith('Novmbrain')
  })

  it('点击小红书按钮复制到剪贴板', async () => {
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)

    const xhsButton = screen.getByText('WindOfBretagne').closest('button')!
    await user.click(xhsButton)

    expect(writeTextMock).toHaveBeenCalledWith('WindOfBretagne')
  })

  it('显示反馈文本区域', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeTruthy()
  })

  it('反馈为空时提交按钮禁用', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    // 发送按钮有 absolute + disabled
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.classList.contains('absolute')
    )
    expect(sendButton!.getAttribute('disabled')).not.toBeNull()
  })

  it('输入反馈后可提交', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, '很棒的应用！')

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.classList.contains('absolute')
    )!
    await user.click(sendButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('提交成功后显示感谢信息', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, '测试反馈')

    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn =>
      btn.classList.contains('absolute')
    )!
    await user.click(sendButton)

    // mock translation returns the key
    await waitFor(() => {
      expect(screen.getByText('feedbackThanks')).toBeTruthy()
    })
  })

  it('显示捐赠按钮', () => {
    render(<AuthorDrawer isOpen={true} onClose={vi.fn()} />)
    // mock translation returns the key 'donate'
    expect(screen.getByText('donate')).toBeTruthy()
  })
})
