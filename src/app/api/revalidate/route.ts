import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Revalidate')

/**
 * POST /api/revalidate
 * On-Demand ISR revalidation endpoint
 *
 * Requires Bearer token auth (REVALIDATE_SECRET env var).
 * After editor split, this becomes the webhook receiver.
 *
 * Body options (all optional, at least one required):
 * - { path: string }           — single path
 * - { paths: string[] }        — batch paths (for webhook: localized paths)
 * - { tags: string[] }         — tag-based revalidation
 * - { routeId: number }        — revalidate all locale versions of a route
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    log.error('REVALIDATE_SECRET not configured', null, {
      action: 'POST /api/revalidate',
    })
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration' },
      { status: 500 }
    )
  }

  // Bearer token auth
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const revalidated: string[] = []
    const revalidatedTags: string[] = []

    // paths array (webhook format)
    if (Array.isArray(body.paths)) {
      for (const p of body.paths) {
        if (typeof p === 'string') {
          revalidatePath(p)
          revalidated.push(p)
        }
      }
    }

    // single path (legacy format)
    if (typeof body.path === 'string') {
      revalidatePath(body.path)
      revalidated.push(body.path)
    }

    // routeId — revalidate all locale versions
    if (typeof body.routeId === 'number') {
      const paths = [
        `/zh/route/${body.routeId}`,
        `/en/route/${body.routeId}`,
        `/fr/route/${body.routeId}`,
      ]
      paths.forEach(p => {
        revalidatePath(p)
        revalidated.push(p)
      })
    }

    // tag-based revalidation
    if (Array.isArray(body.tags)) {
      for (const tag of body.tags) {
        if (typeof tag === 'string') {
          revalidateTag(tag)
          revalidatedTags.push(tag)
        }
      }
    }

    if (revalidated.length === 0 && revalidatedTags.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供 path, paths, routeId, 或 tags 参数' },
        { status: 400 }
      )
    }

    log.info('Revalidated', {
      action: 'POST /api/revalidate',
      metadata: { paths: revalidated, tags: revalidatedTags },
    })

    return NextResponse.json({
      success: true,
      revalidated,
      revalidatedTags,
    })
  } catch (error) {
    log.error('Failed to revalidate', error, {
      action: 'POST /api/revalidate',
    })
    return NextResponse.json(
      { success: false, error: '重新验证失败' },
      { status: 500 }
    )
  }
}
