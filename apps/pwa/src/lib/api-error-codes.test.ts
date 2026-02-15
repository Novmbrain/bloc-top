import { describe, it, expect } from 'vitest'
import { API_ERROR_CODES, createErrorResponse, type ApiErrorCode } from './api-error-codes'

describe('api-error-codes', () => {
  describe('API_ERROR_CODES 常量', () => {
    it('应该包含所有通用错误码', () => {
      expect(API_ERROR_CODES.SERVER_ERROR).toBe('SERVER_ERROR')
      expect(API_ERROR_CODES.RATE_LIMITED).toBe('RATE_LIMITED')
    })

    it('应该包含所有 Beta 相关错误码', () => {
      expect(API_ERROR_CODES.MISSING_ROUTE_ID).toBe('MISSING_ROUTE_ID')
      expect(API_ERROR_CODES.MISSING_FIELDS).toBe('MISSING_FIELDS')
      expect(API_ERROR_CODES.INVALID_URL).toBe('INVALID_URL')
      expect(API_ERROR_CODES.ONLY_XIAOHONGSHU).toBe('ONLY_XIAOHONGSHU')
      expect(API_ERROR_CODES.INVALID_HEIGHT).toBe('INVALID_HEIGHT')
      expect(API_ERROR_CODES.INVALID_REACH).toBe('INVALID_REACH')
      expect(API_ERROR_CODES.CANNOT_PARSE_NOTE).toBe('CANNOT_PARSE_NOTE')
      expect(API_ERROR_CODES.ROUTE_NOT_FOUND).toBe('ROUTE_NOT_FOUND')
      expect(API_ERROR_CODES.DUPLICATE_BETA).toBe('DUPLICATE_BETA')
      expect(API_ERROR_CODES.UPDATE_FAILED).toBe('UPDATE_FAILED')
    })

    it('应该是只读对象 (as const)', () => {
      // 验证类型系统确保值不可变
      const code: 'SERVER_ERROR' = API_ERROR_CODES.SERVER_ERROR
      expect(code).toBe('SERVER_ERROR')
    })
  })

  describe('createErrorResponse', () => {
    it('应该只传 code 时返回正确结构', () => {
      const response = createErrorResponse(API_ERROR_CODES.SERVER_ERROR)

      expect(response).toEqual({
        error: 'SERVER_ERROR',
        code: 'SERVER_ERROR',
      })
    })

    it('应该传递 details 时包含在响应中', () => {
      const response = createErrorResponse(
        API_ERROR_CODES.INVALID_URL,
        'URL 格式不正确'
      )

      expect(response).toEqual({
        error: 'INVALID_URL',
        code: 'INVALID_URL',
        details: 'URL 格式不正确',
      })
    })

    it('应该处理空 details 字符串 (不包含 details 字段)', () => {
      const response = createErrorResponse(API_ERROR_CODES.RATE_LIMITED, '')

      expect(response).toEqual({
        error: 'RATE_LIMITED',
        code: 'RATE_LIMITED',
      })
      expect(response).not.toHaveProperty('details')
    })

    it('应该正确处理所有错误码类型', () => {
      const testCases: ApiErrorCode[] = [
        'SERVER_ERROR',
        'RATE_LIMITED',
        'MISSING_ROUTE_ID',
        'DUPLICATE_BETA',
      ]

      testCases.forEach((code) => {
        const response = createErrorResponse(code)
        expect(response.error).toBe(code)
        expect(response.code).toBe(code)
      })
    })
  })
})
