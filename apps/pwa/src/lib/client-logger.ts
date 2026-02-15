'use client'

/**
 * 客户端日志工具
 *
 * 设计目标:
 * - 本地开发时在浏览器控制台输出
 * - 生产环境将错误/警告上报到服务端 (/api/log)
 * - 服务端日志可在 Vercel Dashboard 中查看
 */

type LogLevel = 'info' | 'warn' | 'error'

export interface ClientLogContext {
  /** 组件名，如 'ErrorBoundary', 'SearchOverlay' */
  component?: string
  /** 操作名，如 'render', 'handleSubmit' */
  action?: string
  /** 额外数据 */
  metadata?: Record<string, unknown>
}

interface LogPayload {
  level: LogLevel
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
 * 发送日志到服务端
 * - 使用 sendBeacon 确保页面卸载时也能发送
 * - 失败时静默处理，不影响主流程
 */
async function sendLog(
  level: LogLevel,
  message: string,
  error?: Error,
  context?: ClientLogContext
): Promise<void> {
  const prefix = context?.component ? `[${context.component}]` : '[Client]'
  const action = context?.action ? `(${context.action})` : ''

  // 本地也打印一份（便于开发调试）
  const localMessage = `${prefix}${action} ${message}`
  switch (level) {
    case 'info':
      console.log(localMessage, context?.metadata || '')
      break
    case 'warn':
      console.warn(localMessage, context?.metadata || '')
      break
    case 'error':
      console.error(localMessage, error || '', context?.metadata || '')
      break
  }

  // 仅在生产环境上报
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  // 仅上报 warn 和 error
  if (level === 'info') {
    return
  }

  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: {
      component: context?.component,
      action: context?.action,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      metadata: context?.metadata,
    },
  }

  if (error) {
    payload.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  try {
    // 优先使用 sendBeacon（即使页面关闭也能发送）
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      })
      const sent = navigator.sendBeacon('/api/log', blob)
      if (sent) return
    }

    // Fallback: 使用 fetch（keepalive 确保页面卸载时也能发送）
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // 上报失败不影响主流程
  }
}

/**
 * 客户端 Logger
 *
 * @example
 * ```tsx
 * import { clientLogger } from '@/lib/client-logger'
 *
 * // 在 Error Boundary 中
 * clientLogger.error('Unhandled error', error, {
 *   component: 'ErrorBoundary',
 *   action: 'render'
 * })
 *
 * // 在组件中记录警告
 * clientLogger.warn('API response unexpected', {
 *   component: 'SearchOverlay',
 *   metadata: { responseCode: 404 }
 * })
 * ```
 */
export const clientLogger = {
  info: (message: string, ctx?: ClientLogContext) =>
    sendLog('info', message, undefined, ctx),

  warn: (message: string, ctx?: ClientLogContext) =>
    sendLog('warn', message, undefined, ctx),

  error: (message: string, error?: Error, ctx?: ClientLogContext) =>
    sendLog('error', message, error, ctx),
}

/**
 * 创建带组件前缀的 logger
 *
 * @example
 * ```tsx
 * const log = createClientLogger('SearchOverlay')
 * log.info('Component mounted')
 * log.error('Search failed', error)
 * ```
 */
export function createClientLogger(component: string) {
  return {
    info: (message: string, ctx?: Omit<ClientLogContext, 'component'>) =>
      sendLog('info', message, undefined, { component, ...ctx }),

    warn: (message: string, ctx?: Omit<ClientLogContext, 'component'>) =>
      sendLog('warn', message, undefined, { component, ...ctx }),

    error: (
      message: string,
      error?: Error,
      ctx?: Omit<ClientLogContext, 'component'>
    ) => sendLog('error', message, error, { component, ...ctx }),
  }
}
