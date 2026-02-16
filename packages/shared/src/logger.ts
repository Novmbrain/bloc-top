/**
 * 统一日志工具
 *
 * 设计目标:
 * - 格式统一，便于 Vercel Dashboard 搜索和过滤
 * - 零外部依赖
 * - 支持结构化日志 (JSON metadata)
 * - 生产环境自动过滤 debug 级别
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  /** 模块名，如 'DB', 'API', 'Weather' */
  module: string
  /** 操作名，如 'getCragById', 'fetchWeather' */
  action?: string
  /** 耗时 (ms) */
  duration?: number
  /** 额外数据 (会以 JSON 格式输出) */
  metadata?: Record<string, unknown>
}

/**
 * 格式化日志输出
 * 格式: `TIMESTAMP LEVEL [Module](action) message duration`
 *
 * 示例:
 * - `2025-01-19T10:30:45.123Z INFO [DB](getAllCrags) Fetched 5 crags 45ms`
 * - `2025-01-19T10:30:46.789Z ERROR [API](POST /api/beta) Beta creation failed 123ms`
 */
function formatLog(level: LogLevel, message: string, ctx?: LogContext): string {
  const timestamp = new Date().toISOString()
  const levelStr = level.toUpperCase().padEnd(5)
  const prefix = ctx?.module ? `[${ctx.module}]` : ''
  const action = ctx?.action ? `(${ctx.action})` : ''
  const duration = ctx?.duration !== undefined ? ` ${ctx.duration}ms` : ''

  return `${timestamp} ${levelStr} ${prefix}${action} ${message}${duration}`
}

/**
 * 输出日志
 * - 生产环境只输出 info 及以上级别
 * - metadata 以单独一行 JSON 输出，便于 Vercel 日志搜索
 */
function log(level: LogLevel, message: string, ctx?: LogContext): void {
  // 生产环境过滤 debug
  if (process.env.NODE_ENV === 'production' && level === 'debug') {
    return
  }

  const formatted = formatLog(level, message, ctx)

  switch (level) {
    case 'debug':
      console.log(formatted)
      break
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }

  // 附加 metadata（JSON 格式便于 Vercel 日志搜索）
  if (ctx?.metadata && Object.keys(ctx.metadata).length > 0) {
    console.log(JSON.stringify(ctx.metadata))
  }
}

/**
 * 输出错误日志（带 Error 对象）
 */
function logError(
  message: string,
  error?: Error | unknown,
  ctx?: LogContext
): void {
  const formatted = formatLog('error', message, ctx)
  console.error(formatted)

  // 输出错误详情
  if (error) {
    if (error instanceof Error) {
      console.error(JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // 只取前 5 行堆栈
        ...ctx?.metadata,
      }))
    } else {
      console.error(JSON.stringify({
        error: String(error),
        ...ctx?.metadata,
      }))
    }
  } else if (ctx?.metadata && Object.keys(ctx.metadata).length > 0) {
    console.error(JSON.stringify(ctx.metadata))
  }
}

/**
 * 统一 Logger
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger'
 *
 * // 基础使用
 * logger.info('User logged in', { module: 'Auth' })
 *
 * // 带耗时
 * const start = Date.now()
 * // ... 操作
 * logger.info('Data fetched', {
 *   module: 'DB',
 *   action: 'getAllCrags',
 *   duration: Date.now() - start,
 *   metadata: { count: 5 }
 * })
 *
 * // 错误日志
 * logger.error('Failed to fetch', error, {
 *   module: 'API',
 *   action: 'GET /api/weather'
 * })
 * ```
 */
export const logger = {
  debug: (message: string, ctx?: LogContext) => log('debug', message, ctx),
  info: (message: string, ctx?: LogContext) => log('info', message, ctx),
  warn: (message: string, ctx?: LogContext) => log('warn', message, ctx),
  error: (message: string, error?: Error | unknown, ctx?: LogContext) =>
    logError(message, error, ctx),
}

/**
 * 创建带模块前缀的 logger
 * 便于在同一模块中多次调用时减少重复代码
 *
 * @example
 * ```ts
 * const log = createModuleLogger('DB')
 * log.info('Connected', { action: 'connect' })
 * log.error('Query failed', error, { action: 'query' })
 * ```
 */
export function createModuleLogger(module: string) {
  return {
    debug: (message: string, ctx?: Omit<LogContext, 'module'>) =>
      log('debug', message, { module, ...ctx }),
    info: (message: string, ctx?: Omit<LogContext, 'module'>) =>
      log('info', message, { module, ...ctx }),
    warn: (message: string, ctx?: Omit<LogContext, 'module'>) =>
      log('warn', message, { module, ...ctx }),
    error: (
      message: string,
      error?: Error | unknown,
      ctx?: Omit<LogContext, 'module'>
    ) => logError(message, error, { module, ...ctx }),
  }
}
