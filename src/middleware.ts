import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { CITY_COOKIE_NAME, CITY_COOKIE_MAX_AGE, serializeCitySelection } from '@/lib/city-utils'

const intlMiddleware = createMiddleware(routing)

/** 合法 IPv4/IPv6 格式校验（防止 SSRF） */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

/** 仅对首页路径执行 IP 检测（城市选择只在首页有意义） */
const HOME_PATH_REGEX = /^\/(zh|en|fr)?\/?$/

/**
 * 中间件
 *
 * 1. 国际化路由（next-intl）
 * 2. 首次访问首页时通过 IP 检测城市 adcode，写入 cookie
 *    Edge Runtime 无法连接 MongoDB，故存储 adcode:XXX 格式，
 *    由 page.tsx 在服务端解析为具体 cityId
 */
export default async function middleware(request: NextRequest) {
  // 先运行 next-intl 中间件，获取 response
  const response = intlMiddleware(request)

  // 仅对首页 + 无 city cookie 的请求执行 IP 检测
  if (
    request.cookies.has(CITY_COOKIE_NAME) ||
    !HOME_PATH_REGEX.test(request.nextUrl.pathname)
  ) {
    return response
  }

  // 提取客户端 IP 并验证格式
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim()

  if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || !IP_REGEX.test(clientIp)) {
    return response
  }

  // 调用高德 IP 定位 API
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY
  if (!amapKey) return response

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const geoRes = await fetch(
      `https://restapi.amap.com/v3/ip?key=${amapKey}&ip=${clientIp}`,
      { signal: controller.signal },
    )
    clearTimeout(timeout)

    if (!geoRes.ok) return response

    const data = await geoRes.json()

    // 高德返回的 adcode（必须是 6 位数字行政区划代码）
    const adcode = Array.isArray(data?.adcode) ? data.adcode[0] : data?.adcode
    if (!adcode || typeof adcode !== 'string' || !/^\d{6}$/.test(adcode)) {
      return response
    }

    // 写入 cookie（adcode:XXX 格式，page.tsx 会解析为 cityId）
    const cookieValue = serializeCitySelection({ type: 'city', id: `adcode:${adcode}` })
    response.cookies.set(CITY_COOKIE_NAME, cookieValue, {
      path: '/',
      maxAge: CITY_COOKIE_MAX_AGE,
      sameSite: 'lax',
    })
  } catch {
    // IP 检测失败：静默跳过，page.tsx 会使用默认城市
  }

  return response
}

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
