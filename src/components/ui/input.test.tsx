import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { Input } from './input'

describe('Input', () => {
  it('renders with default form variant', () => {
    render(<Input value="" onChange={() => {}} placeholder="test" />)
    const input = screen.getByPlaceholderText('test')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('data-variant', 'form')
    expect(input.className).toContain('rounded-xl')
  })

  it('renders search variant', () => {
    render(<Input variant="search" value="" onChange={() => {}} placeholder="search" />)
    const input = screen.getByPlaceholderText('search')
    expect(input).toHaveAttribute('data-variant', 'search')
    expect(input.className).toContain('pl-10')
  })

  it('renders unstyled variant', () => {
    render(<Input variant="unstyled" value="" onChange={() => {}} placeholder="raw" />)
    const input = screen.getByPlaceholderText('raw')
    expect(input).toHaveAttribute('data-variant', 'unstyled')
    expect(input.className).not.toContain('rounded-xl')
  })

  it('applies theme styles by default', () => {
    render(<Input value="" onChange={() => {}} placeholder="themed" />)
    const input = screen.getByPlaceholderText('themed')
    expect(input.style.backgroundColor).toBe('var(--theme-surface)')
    expect(input.style.color).toBe('var(--theme-on-surface)')
  })

  it('skips theme styles when themed=false', () => {
    render(<Input themed={false} value="" onChange={() => {}} placeholder="no-theme" />)
    const input = screen.getByPlaceholderText('no-theme')
    expect(input.style.backgroundColor).toBe('')
  })

  it('merges custom style with theme styles', () => {
    render(<Input value="" onChange={() => {}} placeholder="custom" style={{ border: '1px solid red' }} />)
    const input = screen.getByPlaceholderText('custom')
    expect(input.style.backgroundColor).toBe('var(--theme-surface)')
    expect(input.style.border).toBe('1px solid red')
  })

  it('merges custom className', () => {
    render(<Input value="" onChange={() => {}} placeholder="cls" className="my-class" />)
    const input = screen.getByPlaceholderText('cls')
    expect(input.className).toContain('my-class')
    expect(input.className).toContain('rounded-xl')
  })

  it('calls onChange with string value', async () => {
    const onChange = vi.fn()
    render(<Input value="" onChange={onChange} placeholder="type" />)
    const input = screen.getByPlaceholderText('type')
    await userEvent.type(input, 'hello')
    expect(onChange).toHaveBeenCalledWith('h')
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} value="" onChange={() => {}} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('defaults to type="text"', () => {
    render(<Input value="" onChange={() => {}} placeholder="default-type" />)
    const input = screen.getByPlaceholderText('default-type')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('passes additional HTML attributes', () => {
    render(<Input value="" onChange={() => {}} placeholder="attrs" disabled autoFocus />)
    const input = screen.getByPlaceholderText('attrs')
    expect(input).toBeDisabled()
  })
})
