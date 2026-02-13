import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { getEditableCragIds, canCreateCrag } from '@/lib/permissions'
import { getAllCrags } from '@/lib/db'

/**
 * GET /api/editor/crags
 * 返回当前用户可编辑的岩场列表（编辑器专用）
 * 同时返回 role 和 canCreate 供前端 UI 决策
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const editableIds = await getEditableCragIds(userId, role)
  const allCrags = await getAllCrags()

  const crags = editableIds === 'all'
    ? allCrags
    : allCrags.filter(c => editableIds.includes(c.id))

  return NextResponse.json({
    crags,
    role,
    canCreate: canCreateCrag(role),
  })
}
