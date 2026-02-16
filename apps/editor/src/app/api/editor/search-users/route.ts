import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireAuth } from '@/lib/require-auth'
import { canAccessEditor } from '@bloctop/shared/permissions'
import { getDatabase } from '@bloctop/shared/mongodb'
import { createModuleLogger } from '@bloctop/shared/logger'

const log = createModuleLogger('API:SearchUsers')

/** Escape regex special characters to prevent ReDoS */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * GET /api/editor/search-users?q=xxx
 * Search users by email (contains match).
 * Requires editor access (admin or user with crag permissions).
 * Returns at most 10 results with minimal info.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  // Only users with editor access can search
  if (!(await canAccessEditor(userId, role))) {
    return NextResponse.json(
      { success: false, error: '无权限' },
      { status: 403 }
    )
  }

  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ success: true, users: [] })
  }

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('user')
      .find({
        email: { $regex: escapeRegex(query), $options: 'i' },
      })
      .project({ _id: 1, name: 1, email: 1 })
      .limit(10)
      .toArray()

    const users = docs.map((doc) => ({
      id: (doc._id as ObjectId).toString(),
      name: doc.name || '',
      email: doc.email,
    }))

    return NextResponse.json({ success: true, users })
  } catch (error) {
    log.error('Failed to search users', error, {
      action: 'GET /api/editor/search-users',
    })
    return NextResponse.json(
      { success: false, error: '搜索用户失败' },
      { status: 500 }
    )
  }
}
