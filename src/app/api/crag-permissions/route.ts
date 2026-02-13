import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCragPermission, getCragPermissionsByCragId, createCragPermission, deleteCragPermission } from '@/lib/db'
import { requireAuth } from '@/lib/require-auth'
import { canManagePermissions } from '@/lib/permissions'
import { getDatabase } from '@/lib/mongodb'
import { createModuleLogger } from '@/lib/logger'
import type { CragPermissionRole } from '@/types'

const log = createModuleLogger('API:CragPermissions')

const VALID_ROLES: CragPermissionRole[] = ['creator', 'manager']

/**
 * GET /api/crag-permissions?cragId=xxx
 * 获取指定岩场的权限列表 (需要 creator/admin 权限)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const cragId = request.nextUrl.searchParams.get('cragId')
  if (!cragId) {
    return NextResponse.json(
      { success: false, error: '缺少 cragId 参数' },
      { status: 400 }
    )
  }

  if (!(await canManagePermissions(userId, cragId, role))) {
    return NextResponse.json(
      { success: false, error: '无权管理此岩场的权限' },
      { status: 403 }
    )
  }

  try {
    const permissions = await getCragPermissionsByCragId(cragId)

    // Batch-fetch user info for all permissions
    const userIds = permissions.map(p => p.userId)
    if (userIds.length > 0) {
      const db = await getDatabase()
      const objectIds = userIds.map(id => new ObjectId(id))
      const users = await db
        .collection('user')
        .find({ _id: { $in: objectIds } })
        .project({ _id: 1, name: 1, email: 1 })
        .toArray()

      const userMap = new Map(
        users.map(u => [(u._id as ObjectId).toString(), { name: u.name || '', email: u.email }])
      )

      const enriched = permissions.map(p => ({
        ...p,
        user: userMap.get(p.userId) || { name: '', email: '' },
      }))

      return NextResponse.json({ success: true, permissions: enriched })
    }

    return NextResponse.json({ success: true, permissions: [] })
  } catch (error) {
    log.error('Failed to get crag permissions', error, {
      action: 'GET /api/crag-permissions',
      metadata: { cragId },
    })
    return NextResponse.json(
      { success: false, error: '获取权限列表失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crag-permissions
 * 为用户分配岩场权限 (需要 creator/admin 权限)
 *
 * Body: { userId, cragId, role: 'manager' }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId: currentUserId, role: currentRole } = authResult

  try {
    const body = await request.json()
    const { userId: targetUserId, cragId, role: permRole } = body

    if (!targetUserId || !cragId || !permRole) {
      return NextResponse.json(
        { success: false, error: '缺少 userId、cragId 或 role' },
        { status: 400 }
      )
    }

    if (!VALID_ROLES.includes(permRole)) {
      return NextResponse.json(
        { success: false, error: `角色无效，允许的值: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // 只有 admin 可以分配 creator 角色
    if (permRole === 'creator' && currentRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: '只有管理员可以分配创建者角色' },
        { status: 403 }
      )
    }

    if (!(await canManagePermissions(currentUserId, cragId, currentRole))) {
      return NextResponse.json(
        { success: false, error: '无权管理此岩场的权限' },
        { status: 403 }
      )
    }

    const permission = await createCragPermission({
      userId: targetUserId,
      cragId,
      role: permRole,
      assignedBy: currentUserId,
    })

    log.info('Crag permission created', {
      action: 'POST /api/crag-permissions',
      metadata: { targetUserId, cragId, permRole, assignedBy: currentUserId },
    })

    return NextResponse.json({ success: true, permission }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '分配权限失败'
    const status = message.includes('已存在') ? 409 : 500
    log.error('Failed to create crag permission', error, {
      action: 'POST /api/crag-permissions',
    })
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

/**
 * DELETE /api/crag-permissions
 * 移除用户的岩场权限 (需要 creator/admin 权限)
 *
 * Body: { userId, cragId }
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId: currentUserId, role: currentRole } = authResult

  try {
    const body = await request.json()
    const { userId: targetUserId, cragId } = body

    if (!targetUserId || !cragId) {
      return NextResponse.json(
        { success: false, error: '缺少 userId 或 cragId' },
        { status: 400 }
      )
    }

    if (!(await canManagePermissions(currentUserId, cragId, currentRole))) {
      return NextResponse.json(
        { success: false, error: '无权管理此岩场的权限' },
        { status: 403 }
      )
    }

    // 保护: creator 不能删除自己的权限（防止岩场变成无主状态）
    const targetPerm = await getCragPermission(targetUserId, cragId)
    if (targetPerm?.role === 'creator' && currentRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: '无法移除创建者权限，请联系管理员' },
        { status: 400 }
      )
    }

    const deleted = await deleteCragPermission(targetUserId, cragId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '权限记录不存在' },
        { status: 404 }
      )
    }

    log.info('Crag permission deleted', {
      action: 'DELETE /api/crag-permissions',
      metadata: { targetUserId, cragId, deletedBy: currentUserId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete crag permission', error, {
      action: 'DELETE /api/crag-permissions',
    })
    return NextResponse.json(
      { success: false, error: '移除权限失败' },
      { status: 500 }
    )
  }
}
