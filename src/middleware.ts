import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * 国际化中间件
 *
 * 处理语言检测和路由：
 * 1. 从 URL 路径检测语言 (/zh/..., /en/...)
 * 2. 从 Cookie 检测语言偏好 (NEXT_LOCALE)
 * 3. 从 Accept-Language 请求头检测
 * 4. 如果都没有，使用默认语言
 *
 * 自动重定向到带语言前缀的 URL
 */
export default createMiddleware(routing)

export const config = {
  // 匹配所有路径，排除：
  // - API 路由 (/api/...)
  // - tRPC 路由 (/trpc/...)
  // - Next.js 内部路径 (/_next/...)
  // - Vercel 内部路径 (/_vercel/...)
  // - 静态文件 (*.ico, *.png, *.jpg 等)
  // - Service Worker (/sw.js)
  // - PWA 相关文件 (/manifest.json, /swe-worker-*.js)
  matcher: '/((?!api|trpc|_next|_vercel|sw\\.js|swe-worker-.*\\.js|manifest\\.json|.*\\..*).*)',
}
