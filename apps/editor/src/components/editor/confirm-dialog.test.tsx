import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { ConfirmDialog } from './confirm-dialog'

describe('ConfirmDialog', () => {
  const defaults = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    title: '确认操作',
    description: '是否继续？',
    confirmLabel: '确认',
  }

  it('isOpen=false 不渲染', () => {
    render(<ConfirmDialog {...defaults} isOpen={false} />)
    expect(screen.queryByText('确认操作')).toBeNull()
  })

  it('isOpen=true 渲染标题和描述', () => {
    render(<ConfirmDialog {...defaults} />)
    expect(screen.getByText('确认操作')).toBeInTheDocument()
    expect(screen.getByText('是否继续？')).toBeInTheDocument()
  })

  it('点击确认按钮触发 onConfirm', async () => {
    const onConfirm = vi.fn()
    const { user } = render(<ConfirmDialog {...defaults} onConfirm={onConfirm} />)
    await user.click(screen.getByText('确认'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('点击取消按钮触发 onCancel', async () => {
    const onCancel = vi.fn()
    const { user } = render(<ConfirmDialog {...defaults} onCancel={onCancel} />)
    await user.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('自定义 cancelLabel', () => {
    render(<ConfirmDialog {...defaults} cancelLabel="丢弃" />)
    expect(screen.getByText('丢弃')).toBeInTheDocument()
  })

  it('isLoading 时按钮禁用', () => {
    render(<ConfirmDialog {...defaults} isLoading />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('点击遮罩触发 onCancel', async () => {
    const onCancel = vi.fn()
    const { user } = render(<ConfirmDialog {...defaults} onCancel={onCancel} />)
    await user.click(screen.getByTestId('confirm-dialog-backdrop'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('children 正常渲染', () => {
    render(
      <ConfirmDialog {...defaults}>
        <div data-testid="custom-content">自定义内容</div>
      </ConfirmDialog>
    )
    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
  })
})
