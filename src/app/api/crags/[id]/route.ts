import { NextRequest, NextResponse } from 'next/server'
import { getCragById, updateCrag } from '@/lib/db'
import { getAuth } from '@/lib/auth'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Crag')

/**
 * GET /api/crags/[id]
 * 获取单个岩场
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const crag = await getCragById(id)
    if (!crag) {
      return NextResponse.json(
        { success: false, error: '岩场不存在' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, crag })
  } catch (error) {
    log.error('Failed to get crag', error, {
      action: 'GET /api/crags/[id]',
      metadata: { cragId: id },
    })
    return NextResponse.json(
      { success: false, error: '获取岩场失败' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/crags/[id]
 * 更新岩场信息 (需要 admin 权限)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const allowedFields = ['name', 'cityId', 'location', 'description', 'approach', 'coordinates', 'coverImages']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可更新的字段' },
        { status: 400 }
      )
    }

    const crag = await updateCrag(id, updates)
    if (!crag) {
      return NextResponse.json(
        { success: false, error: '岩场不存在' },
        { status: 404 }
      )
    }

    log.info('Crag updated', {
      action: 'PATCH /api/crags/[id]',
      metadata: { cragId: id, fields: Object.keys(updates) },
    })

    return NextResponse.json({ success: true, crag })
  } catch (error) {
    log.error('Failed to update crag', error, {
      action: 'PATCH /api/crags/[id]',
      metadata: { cragId: id },
    })
    return NextResponse.json(
      { success: false, error: '更新岩场失败' },
      { status: 500 }
    )
  }
}
