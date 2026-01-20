import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'

// Rate Limiting 配置：每 IP 每分钟最多 20 次
const LOG_RATE_LIMIT = { maxRequests: 20, windowMs: 60000 }

/**
 * 获取客户端 IP 地址
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}

/**
 * 客户端日志上报请求体
 */
interface ClientLogPayload {
  level: 'info' | 'warn' | 'error'
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context: {
    component?: string
    action?: string
    url?: string
    userAgent?: string
    metadata?: Record<string, unknown>
  }
  timestamp: string
}

/**
 * 验证日志级别
 */
function isValidLogLevel(level: unknown): level is 'info' | 'warn' | 'error' {
  return level === 'info' || level === 'warn' || level === 'error'
}

/**
 * POST /api/log
 *
 * 接收客户端日志上报
 * - 将客户端错误/警告转发到服务端日志（Vercel 可见）
 * - 添加 [Client] 前缀以区分来源
 */
export async function POST(request: NextRequest) {
  // Rate Limiting 检查（防止日志洪水攻击）
  const clientIp = getClientIp(request)
  const rateCheck = checkRateLimit(`log:${clientIp}`, LOG_RATE_LIMIT)

  if (!rateCheck.allowed) {
    // 被限流时静默返回成功，避免触发客户端重试
    return NextResponse.json(
      { success: true, throttled: true },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(rateCheck.retryAfter),
        },
      }
    )
  }

  try {
    // 解析请求体
    const body: ClientLogPayload = await request.json()
    const { level, message, error, context, timestamp } = body

    // 验证必填字段
    if (!message || !isValidLogLevel(level)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // 构建日志上下文
    const logContext = {
      module: 'Client',
      action: context?.component
        ? `${context.component}${context.action ? `.${context.action}` : ''}`
        : undefined,
      metadata: {
        url: context?.url,
        userAgent: context?.userAgent
          ? truncateUserAgent(context.userAgent)
          : undefined,
        clientTimestamp: timestamp,
        ...context?.metadata,
      },
    }

    // 根据级别输出日志
    switch (level) {
      case 'info':
        logger.info(message, logContext)
        break
      case 'warn':
        logger.warn(message, logContext)
        break
      case 'error':
        if (error) {
          // 创建一个错误对象用于日志
          const errorObj = new Error(error.message)
          errorObj.name = error.name
          errorObj.stack = error.stack
          logger.error(message, errorObj, logContext)
        } else {
          logger.error(message, undefined, logContext)
        }
        break
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    // 解析失败时的简单日志
    logger.warn('Failed to parse client log', {
      module: 'API',
      action: 'POST /api/log',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    })

    return NextResponse.json(
      { success: false, error: 'Parse error' },
      { status: 400 }
    )
  }
}

/**
 * 截断 User-Agent 以减少日志体积
 * 保留前 100 个字符
 */
function truncateUserAgent(ua: string): string {
  if (ua.length <= 100) return ua
  return ua.slice(0, 100) + '...'
}
