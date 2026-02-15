/**
 * 工具函数测试
 */
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (className merge utility)', () => {
  it('合并多个类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('处理条件类名', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'active')).toBe('base')
  })

  it('处理 undefined 和 null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('合并 Tailwind 冲突类名（后者优先）', () => {
    // twMerge 的核心功能：相同属性的类名，后者覆盖前者
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('bg-white', 'bg-black')).toBe('bg-black')
  })

  it('保留不冲突的类名', () => {
    expect(cn('px-4', 'py-2', 'text-lg')).toBe('px-4 py-2 text-lg')
  })

  it('处理对象语法', () => {
    expect(cn({ active: true, disabled: false })).toBe('active')
  })

  it('处理数组语法', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('空输入返回空字符串', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })
})
