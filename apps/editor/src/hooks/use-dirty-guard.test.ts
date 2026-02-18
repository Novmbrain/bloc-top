import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDirtyGuard } from './use-dirty-guard'

describe('useDirtyGuard', () => {
  const setup = (dirty = false) => {
    const executeAction = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)
    const hasUnsavedChanges = vi.fn().mockReturnValue(dirty)

    const { result } = renderHook(() =>
      useDirtyGuard({ hasUnsavedChanges, onSave, executeAction })
    )
    return { result, executeAction, onSave, hasUnsavedChanges }
  }

  it('无脏数据时直接执行 action', () => {
    const { result, executeAction } = setup(false)
    act(() => result.current.guardAction('switch-route'))
    expect(executeAction).toHaveBeenCalledWith('switch-route')
    expect(result.current.showUnsavedDialog).toBe(false)
  })

  it('有脏数据时弹出对话框', () => {
    const { result, executeAction } = setup(true)
    act(() => result.current.guardAction('switch-route'))
    expect(executeAction).not.toHaveBeenCalled()
    expect(result.current.showUnsavedDialog).toBe(true)
  })

  it('丢弃后执行挂起的 action', () => {
    const { result, executeAction } = setup(true)
    act(() => result.current.guardAction('switch-crag'))
    act(() => result.current.handleDiscard())
    expect(executeAction).toHaveBeenCalledWith('switch-crag')
    expect(result.current.showUnsavedDialog).toBe(false)
  })

  it('保存成功后执行挂起的 action', async () => {
    const { result, executeAction, onSave } = setup(true)
    act(() => result.current.guardAction('switch-area'))
    await act(() => result.current.handleSaveAndProceed())
    expect(onSave).toHaveBeenCalledOnce()
    expect(executeAction).toHaveBeenCalledWith('switch-area')
    expect(result.current.showUnsavedDialog).toBe(false)
  })

  it('保存失败时不执行 action', async () => {
    const executeAction = vi.fn()
    const onSave = vi.fn().mockResolvedValue(false)
    const { result } = renderHook(() =>
      useDirtyGuard({
        hasUnsavedChanges: () => true,
        onSave,
        executeAction,
      })
    )
    act(() => result.current.guardAction('switch-route'))
    await act(() => result.current.handleSaveAndProceed())
    expect(executeAction).not.toHaveBeenCalled()
    expect(result.current.showUnsavedDialog).toBe(false)
  })

  it('dismiss 关闭对话框但不执行 action', () => {
    const { result, executeAction } = setup(true)
    act(() => result.current.guardAction('switch-route'))
    act(() => result.current.handleDismiss())
    expect(executeAction).not.toHaveBeenCalled()
    expect(result.current.showUnsavedDialog).toBe(false)
  })
})
