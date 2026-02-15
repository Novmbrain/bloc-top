import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import { upsertAvatar, deleteAvatar } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'
import { headers } from 'next/headers'

const log = createModuleLogger('API:Avatar')

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/user/avatar
 * 上传用户头像（需要登录）
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    // 验证登录状态
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '缺少文件' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，请上传 JPG/PNG/WebP' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '图片太大，请上传 2MB 以内的图片' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    await upsertAvatar(userId, buffer, file.type)

    const avatarUrl = `/api/user/avatar/${userId}?t=${Date.now()}`

    log.info('Avatar uploaded', {
      action: 'POST /api/user/avatar',
      duration: Date.now() - start,
      metadata: { userId, size: file.size, type: file.type },
    })

    return NextResponse.json({
      success: true,
      avatarUrl,
    })
  } catch (error) {
    log.error('Failed to upload avatar', error, {
      action: 'POST /api/user/avatar',
      duration: Date.now() - start,
    })

    return NextResponse.json(
      { success: false, error: '头像上传失败，请重试' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user/avatar
 * 删除用户头像（需要登录）
 */
export async function DELETE() {
  const start = Date.now()

  try {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const deleted = await deleteAvatar(userId)

    log.info(`Avatar deleted: ${deleted}`, {
      action: 'DELETE /api/user/avatar',
      duration: Date.now() - start,
      metadata: { userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete avatar', error, {
      action: 'DELETE /api/user/avatar',
      duration: Date.now() - start,
    })

    return NextResponse.json(
      { success: false, error: '删除失败，请重试' },
      { status: 500 }
    )
  }
}
