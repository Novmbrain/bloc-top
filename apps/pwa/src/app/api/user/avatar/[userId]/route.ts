import { NextRequest, NextResponse } from 'next/server'
import { getAvatar } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Avatar')

/**
 * GET /api/user/avatar/[userId]
 * 获取用户头像图片（公开访问，带 HTTP 缓存）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const start = Date.now()
  const { userId } = await params

  try {
    const avatar = await getAvatar(userId)

    if (!avatar) {
      return new NextResponse(null, { status: 404 })
    }

    // 基于 updatedAt 生成 ETag
    const etag = `"avatar-${userId}-${avatar.updatedAt.getTime()}"`
    const ifNoneMatch = request.headers.get('if-none-match')

    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 })
    }

    log.debug(`Served avatar for user: ${userId}`, {
      action: 'GET /api/user/avatar',
      duration: Date.now() - start,
    })

    return new NextResponse(new Uint8Array(avatar.data), {
      status: 200,
      headers: {
        'Content-Type': avatar.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'ETag': etag,
      },
    })
  } catch (error) {
    log.error(`Failed to serve avatar for user: ${userId}`, error, {
      action: 'GET /api/user/avatar',
      duration: Date.now() - start,
    })

    return new NextResponse(null, { status: 500 })
  }
}
