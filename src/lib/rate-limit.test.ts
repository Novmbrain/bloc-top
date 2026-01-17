import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, type RateLimitConfig } from './rate-limit'

describe('rate-limit', () => {
  const testConfig: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60000, // 1 分钟
  }

  beforeEach(() => {
    // 使用假时间以便测试
    vi.useFakeTimers()
  })

  it('应该允许第一次请求', () => {
    const result = checkRateLimit('test-ip-1', testConfig)
    
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2) // maxRequests - 1
    expect(result.retryAfter).toBe(0)
  })

  it('应该在达到限制前允许请求', () => {
    const identifier = 'test-ip-2'
    
    // 第 1 次请求
    let result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    
    // 第 2 次请求
    result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
    
    // 第 3 次请求
    result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('应该在达到限制后拒绝请求', () => {
    const identifier = 'test-ip-3'
    
    // 消耗所有配额
    checkRateLimit(identifier, testConfig)
    checkRateLimit(identifier, testConfig)
    checkRateLimit(identifier, testConfig)
    
    // 第 4 次请求应该被拒绝
    const result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('应该在时间窗口过期后重置配额', () => {
    const identifier = 'test-ip-4'
    
    // 消耗所有配额
    checkRateLimit(identifier, testConfig)
    checkRateLimit(identifier, testConfig)
    checkRateLimit(identifier, testConfig)
    
    // 被拒绝
    let result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(false)
    
    // 时间前进超过窗口期
    vi.advanceTimersByTime(testConfig.windowMs + 1000)
    
    // 应该重新允许
    result = checkRateLimit(identifier, testConfig)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('应该为不同标识符独立计数', () => {
    const ip1 = 'test-ip-5'
    const ip2 = 'test-ip-6'
    
    // IP1 消耗配额
    checkRateLimit(ip1, testConfig)
    checkRateLimit(ip1, testConfig)
    checkRateLimit(ip1, testConfig)
    
    // IP1 被拒绝
    expect(checkRateLimit(ip1, testConfig).allowed).toBe(false)
    
    // IP2 仍然可以请求
    expect(checkRateLimit(ip2, testConfig).allowed).toBe(true)
  })

  it('应该返回正确的 resetTime', () => {
    const identifier = 'test-ip-7'
    const now = Date.now()
    
    const result = checkRateLimit(identifier, testConfig)
    
    // resetTime 应该是 now + windowMs
    expect(result.resetTime).toBeGreaterThanOrEqual(now + testConfig.windowMs - 100)
    expect(result.resetTime).toBeLessThanOrEqual(now + testConfig.windowMs + 100)
  })
})
