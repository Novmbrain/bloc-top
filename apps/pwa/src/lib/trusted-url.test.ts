import { describe, it, expect } from 'vitest'
import { isTrustedCallbackURL } from './trusted-url'

describe('isTrustedCallbackURL', () => {
  // 可信 URL
  it('accepts root-relative paths', () => {
    expect(isTrustedCallbackURL('/')).toBe(true)
    expect(isTrustedCallbackURL('/profile')).toBe(true)
    expect(isTrustedCallbackURL('/auth/security-setup')).toBe(true)
  })

  it('accepts bouldering.top URLs', () => {
    expect(isTrustedCallbackURL('https://bouldering.top/')).toBe(true)
    expect(isTrustedCallbackURL('https://www.bouldering.top/zh/profile')).toBe(true)
    expect(isTrustedCallbackURL('https://editor.bouldering.top/')).toBe(true)
    expect(isTrustedCallbackURL('https://editor.bouldering.top/crags')).toBe(true)
  })

  it('accepts localhost in development', () => {
    expect(isTrustedCallbackURL('http://localhost:3000/')).toBe(true)
    expect(isTrustedCallbackURL('http://localhost:3001/editor')).toBe(true)
  })

  // 不可信 URL
  it('rejects external URLs', () => {
    expect(isTrustedCallbackURL('https://evil.com')).toBe(false)
    expect(isTrustedCallbackURL('https://bouldering.top.evil.com')).toBe(false)
    expect(isTrustedCallbackURL('https://notbouldering.top')).toBe(false)
  })

  it('rejects protocol-relative URLs', () => {
    expect(isTrustedCallbackURL('//evil.com')).toBe(false)
  })

  it('rejects javascript URLs', () => {
    expect(isTrustedCallbackURL('javascript:alert(1)')).toBe(false)
  })

  it('returns false for empty/null', () => {
    expect(isTrustedCallbackURL('')).toBe(false)
    expect(isTrustedCallbackURL(null as unknown as string)).toBe(false)
    expect(isTrustedCallbackURL(undefined as unknown as string)).toBe(false)
  })
})
