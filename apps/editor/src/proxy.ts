import { NextRequest, NextResponse } from 'next/server'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth API 路由和静态资源不需要 guard
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // 检查 session cookie
  // HTTPS 环境下 crossSubDomainCookies 会加 __Secure- 前缀
  const sessionToken = request.cookies.get('__Secure-better-auth.session_token')
    || request.cookies.get('better-auth.session_token')
  if (!sessionToken) {
    // 未登录 → 重定向到 PWA 登录页
    const pwaUrl = process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'
    const loginUrl = new URL(`${pwaUrl}/zh/login`)
    loginUrl.searchParams.set('callbackURL', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon\\.ico|.*\\..*).*)',],
}
