import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('renders with default form variant', () => {
    render(<Textarea value="" onChange={() => {}} placeholder="test" />)
    const textarea = screen.getByPlaceholderText('test')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('data-variant', 'form')
    expect(textarea.className).toContain('rounded-xl')
  })

  it('renders unstyled variant', () => {
    render(<Textarea variant="unstyled" value="" onChange={() => {}} placeholder="raw" />)
    const textarea = screen.getByPlaceholderText('raw')
    expect(textarea.className).not.toContain('rounded-xl')
  })

  it('applies theme styles by default', () => {
    render(<Textarea value="" onChange={() => {}} placeholder="themed" />)
    const textarea = screen.getByPlaceholderText('themed')
    expect(textarea.style.backgroundColor).toBe('var(--theme-surface)')
    expect(textarea.style.color).toBe('var(--theme-on-surface)')
  })

  it('merges custom style with theme styles', () => {
    render(<Textarea value="" onChange={() => {}} placeholder="custom" style={{ border: '1px solid red' }} />)
    const textarea = screen.getByPlaceholderText('custom')
    expect(textarea.style.backgroundColor).toBe('var(--theme-surface)')
    expect(textarea.style.border).toBe('1px solid red')
  })

  it('calls onChange with string value', async () => {
    const onChange = vi.fn()
    render(<Textarea value="" onChange={onChange} placeholder="type" />)
    const textarea = screen.getByPlaceholderText('type')
    await userEvent.type(textarea, 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} value="" onChange={() => {}} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('passes rows and other HTML attributes', () => {
    render(<Textarea value="" onChange={() => {}} placeholder="attrs" rows={5} disabled />)
    const textarea = screen.getByPlaceholderText('attrs')
    expect(textarea).toHaveAttribute('rows', '5')
    expect(textarea).toBeDisabled()
  })
})
