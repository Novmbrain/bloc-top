import { describe, it, expect } from 'vitest'
import { validateRouteForm } from './route-validation'

describe('validateRouteForm', () => {
  it('空名称返回错误', () => {
    const errors = validateRouteForm({ name: '', area: '主墙' })
    expect(errors.name).toBe('请输入线路名称')
    expect(errors.area).toBeUndefined()
  })

  it('空区域返回错误', () => {
    const errors = validateRouteForm({ name: '线路A', area: '' })
    expect(errors.area).toBe('请选择区域')
    expect(errors.name).toBeUndefined()
  })

  it('纯空白也算空', () => {
    const errors = validateRouteForm({ name: '  ', area: '  ' })
    expect(errors.name).toBeDefined()
    expect(errors.area).toBeDefined()
  })

  it('合法输入无错误', () => {
    const errors = validateRouteForm({ name: '线路A', area: '主墙' })
    expect(Object.keys(errors)).toHaveLength(0)
  })
})
