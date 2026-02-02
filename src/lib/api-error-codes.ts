/**
 * API 错误码常量
 *
 * 使用错误码模式实现 API 国际化：
 * - API 返回错误码（如 'RATE_LIMITED'）
 * - 前端根据错误码翻译为用户可读消息
 *
 * 翻译键路径: APIError.{code}
 */
export const API_ERROR_CODES = {
  // 通用错误
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',

  // Beta 相关
  MISSING_ROUTE_ID: 'MISSING_ROUTE_ID',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_URL: 'INVALID_URL',
  ONLY_XIAOHONGSHU: 'ONLY_XIAOHONGSHU',
  INVALID_HEIGHT: 'INVALID_HEIGHT',
  INVALID_REACH: 'INVALID_REACH',
  CANNOT_PARSE_NOTE: 'CANNOT_PARSE_NOTE',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  DUPLICATE_BETA: 'DUPLICATE_BETA',
  UPDATE_FAILED: 'UPDATE_FAILED',
  MISSING_BETA_ID: 'MISSING_BETA_ID',
  BETA_NOT_FOUND: 'BETA_NOT_FOUND',
} as const

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]

/**
 * 创建 API 错误响应对象
 */
export function createErrorResponse(code: ApiErrorCode, details?: string) {
  return {
    error: code,
    code,
    ...(details && { details }),
  }
}
