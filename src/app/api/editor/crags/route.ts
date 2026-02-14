import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { canCreateCrag } from '@/lib/permissions'
import { getAllCrags, getCragPermissionsByUserId } from '@/lib/db'

/**
 * GET /api/editor/crags
 * 返回当前用户可编辑的岩场列表（编辑器专用）
 * 同时返回 role、canCreate、每个岩场的用户权限角色
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const isAdmin = role === 'admin'

  // admin 不需要查 permission 表
  const [allCrags, permissions] = await Promise.all([
    getAllCrags(),
    isAdmin ? Promise.resolve([]) : getCragPermissionsByUserId(userId),
  ])

  // 构建 cragId → permission role 映射
  const permMap = new Map(permissions.map(p => [p.cragId, p.role]))

  const crags = isAdmin
    ? allCrags.map(c => ({ ...c, permissionRole: 'admin' as const }))
    : allCrags
        .filter(c => permMap.has(c.id))
        .map(c => ({ ...c, permissionRole: permMap.get(c.id)! }))

  return NextResponse.json({
    crags,
    role,
    canCreate: canCreateCrag(role),
  })
}
