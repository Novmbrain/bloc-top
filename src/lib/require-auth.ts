import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import type { UserRole } from '@/types'

export interface AuthInfo {
  userId: string
  role: UserRole
}

/**
 * 从请求中提取认证信息
 * 返回 AuthInfo 或 401 响应
 */
export async function requireAuth(request: NextRequest): Promise<AuthInfo | NextResponse> {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: '未登录' },
      { status: 401 }
    )
  }

  return {
    userId: session.user.id,
    role: ((session.user as { role?: string }).role || 'user') as UserRole,
  }
}
