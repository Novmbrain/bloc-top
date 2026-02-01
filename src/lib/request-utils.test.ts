import { describe, it, expect } from 'vitest'
import { getClientIp, sanitizePathSegment } from './request-utils'
import { NextRequest } from 'next/server'

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('getClientIp', () => {
  it('should return first IP from x-forwarded-for', () => {
    const req = createRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('should trim whitespace from x-forwarded-for', () => {
    const req = createRequest({ 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('should return x-real-ip when x-forwarded-for is absent', () => {
    const req = createRequest({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = createRequest({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('should return 127.0.0.1 when no proxy headers exist', () => {
    const req = createRequest()
    expect(getClientIp(req)).toBe('127.0.0.1')
  })

  it('should handle single IP in x-forwarded-for', () => {
    const req = createRequest({ 'x-forwarded-for': '8.8.8.8' })
    expect(getClientIp(req)).toBe('8.8.8.8')
  })
})

describe('sanitizePathSegment', () => {
  it('should keep alphanumeric characters', () => {
    expect(sanitizePathSegment('abc123')).toBe('abc123')
  })

  it('should keep Chinese characters', () => {
    expect(sanitizePathSegment('月光宝盒')).toBe('月光宝盒')
  })

  it('should keep hyphens and underscores', () => {
    expect(sanitizePathSegment('yuan-tong_si')).toBe('yuan-tong_si')
  })

  it('should strip path traversal characters', () => {
    expect(sanitizePathSegment('../../etc/passwd')).toBe('etcpasswd')
  })

  it('should strip dots and slashes', () => {
    expect(sanitizePathSegment('foo.bar/baz')).toBe('foobarbaz')
  })

  it('should strip special characters', () => {
    expect(sanitizePathSegment('a<script>b')).toBe('ascriptb')
  })

  it('should return empty string for only special chars', () => {
    expect(sanitizePathSegment('../../')).toBe('')
  })
})
