import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createRef } from 'react'
import { CompositionInput, CompositionTextarea } from './composition-input'

describe('CompositionInput', () => {
  it('calls onChange immediately for normal typing', () => {
    const onChange = vi.fn()
    render(<CompositionInput value="" onChange={onChange} placeholder="test" />)
    const input = screen.getByPlaceholderText('test')

    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('suppresses onChange during composition and fires on compositionEnd', () => {
    const onChange = vi.fn()
    render(<CompositionInput value="" onChange={onChange} placeholder="test" />)
    const input = screen.getByPlaceholderText('test')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ni' } })
    expect(onChange).not.toHaveBeenCalled()

    // localValue should still update (DOM responsive)
    expect((input as HTMLInputElement).value).toBe('ni')

    fireEvent.compositionEnd(input, { currentTarget: input })
    expect(onChange).toHaveBeenCalledWith('ni')
  })

  it('keeps localValue responsive during composition (mobile predictive text)', () => {
    const onChange = vi.fn()
    render(<CompositionInput value="" onChange={onChange} placeholder="test" />)
    const input = screen.getByPlaceholderText('test')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'h' } })
    fireEvent.change(input, { target: { value: 'he' } })
    fireEvent.change(input, { target: { value: 'hello' } })

    // DOM should show latest value even though onChange not called
    expect((input as HTMLInputElement).value).toBe('hello')
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.compositionEnd(input, { currentTarget: input })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('syncs external value changes when not composing', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CompositionInput value="a" onChange={onChange} placeholder="test" />)
    const input = screen.getByPlaceholderText('test') as HTMLInputElement

    expect(input.value).toBe('a')

    rerender(<CompositionInput value="b" onChange={onChange} placeholder="test" />)
    expect(input.value).toBe('b')
  })

  it('does not overwrite localValue with external value during composition', () => {
    const onChange = vi.fn()
    const { rerender } = render(<CompositionInput value="" onChange={onChange} placeholder="test" />)
    const input = screen.getByPlaceholderText('test') as HTMLInputElement

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'typing' } })

    // Parent tries to set value to something else
    rerender(<CompositionInput value="external" onChange={onChange} placeholder="test" />)

    // localValue should still be what user typed
    expect(input.value).toBe('typing')
  })

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLInputElement>()
    const onChange = vi.fn()
    render(<CompositionInput ref={ref} value="" onChange={onChange} placeholder="test" />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.tagName).toBe('INPUT')
  })
})

describe('CompositionTextarea', () => {
  it('calls onChange immediately for normal typing', () => {
    const onChange = vi.fn()
    render(<CompositionTextarea value="" onChange={onChange} placeholder="test" />)
    const textarea = screen.getByPlaceholderText('test')

    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('suppresses onChange during composition', () => {
    const onChange = vi.fn()
    render(<CompositionTextarea value="" onChange={onChange} placeholder="test" />)
    const textarea = screen.getByPlaceholderText('test')

    fireEvent.compositionStart(textarea)
    fireEvent.change(textarea, { target: { value: 'ni' } })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.compositionEnd(textarea, { currentTarget: textarea })
    expect(onChange).toHaveBeenCalledWith('ni')
  })

  it('forwards ref correctly', () => {
    const ref = createRef<HTMLTextAreaElement>()
    const onChange = vi.fn()
    render(<CompositionTextarea ref={ref} value="" onChange={onChange} placeholder="test" />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })
})
