import { NextRequest } from 'next/server'

/**
 * 从 NextRequest 中提取客户端真实 IP
 * 优先读取代理头（Vercel/Cloudflare），本地开发时回退到 127.0.0.1
 */
export function getClientIp(request: NextRequest): string {
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
 * 净化用于构建存储路径的字符串，防止路径遍历攻击
 * 只保留字母、数字、中文、连字符和下划线
 */
export function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '')
}
