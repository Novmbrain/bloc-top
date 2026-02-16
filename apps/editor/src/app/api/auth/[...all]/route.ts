import { getAuth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export async function GET(req: Request) {
  try {
    const auth = await getAuth()
    return toNextJsHandler(auth).GET(req)
  } catch (err) {
    console.error('[Editor Auth] GET init failed:', err)
    return Response.json({ error: 'Auth initialization failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth()
    return toNextJsHandler(auth).POST(req)
  } catch (err) {
    console.error('[Editor Auth] POST init failed:', err)
    return Response.json({ error: 'Auth initialization failed' }, { status: 500 })
  }
}
