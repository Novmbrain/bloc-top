import { getAuth } from '@/lib/auth'
import { headers } from 'next/headers'

/**
 * POST /api/auth/set-password
 * Server-only wrapper for auth.api.setPassword()
 * 用于 Magic Link 用户首次设置密码（无需旧密码）
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuth()
    const { newPassword } = await req.json()

    if (!newPassword || typeof newPassword !== 'string') {
      return Response.json({ error: 'newPassword is required' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return Response.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('[Auth] setPassword failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to set password'
    return Response.json({ error: message }, { status: 500 })
  }
}
