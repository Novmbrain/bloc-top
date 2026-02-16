/**
 * 简单的内存级 Rate Limiting
 * 使用固定窗口算法，适合小规模应用
 *
 * 注意：服务器重启后计数器会清空
 * 如需持久化，可迁移到 Redis 或 MongoDB
 */

interface RateLimitRecord {
  count: number
  resetTime: number // Unix timestamp (ms)
}

// 内存存储（Map 比 Object 性能更好）
const rateLimitStore = new Map<string, RateLimitRecord>()

// 清理间隔（5分钟清理一次过期记录）
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

/**
 * 清理过期的限流记录
 */
function cleanupExpiredRecords(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return
  }

  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

export interface RateLimitConfig {
  /** 时间窗口内允许的最大请求数 */
  maxRequests: number
  /** 时间窗口大小（毫秒） */
  windowMs: number
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean
  /** 剩余请求次数 */
  remaining: number
  /** 重置时间 (Unix timestamp) */
  resetTime: number
  /** 限流后需要等待的秒数（仅在 allowed=false 时有意义） */
  retryAfter: number
}

/**
 * 检查并更新限流状态
 *
 * @param identifier 标识符（如 IP 地址）
 * @param config 限流配置
 * @returns 限流检查结果
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // 定期清理过期记录
  cleanupExpiredRecords()

  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // 如果没有记录或已过期，创建新记录
  if (!record || record.resetTime < now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(identifier, newRecord)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
      retryAfter: 0,
    }
  }

  // 记录存在且未过期
  if (record.count < config.maxRequests) {
    // 还有配额
    record.count++
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
      retryAfter: 0,
    }
  }

  // 超出配额
  const retryAfter = Math.ceil((record.resetTime - now) / 1000)
  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
    retryAfter,
  }
}

/**
 * Beta API 的默认限流配置
 * 每分钟每个 IP 最多 5 次请求
 */
export const BETA_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 分钟
}
