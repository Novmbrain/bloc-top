import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireAuth } from '@/lib/require-auth'
import { getDatabase } from '@/lib/mongodb'

/**
 * GET /api/editor/search-users?q=xxx
 * Search users by email (contains match). Requires authentication.
 * Returns at most 10 results with minimal info.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] })
  }

  try {
    const db = await getDatabase()
    const docs = await db
      .collection('user')
      .find({
        email: { $regex: query, $options: 'i' },
      })
      .project({ _id: 1, name: 1, email: 1 })
      .limit(10)
      .toArray()

    const users = docs.map((doc) => ({
      id: (doc._id as ObjectId).toString(),
      name: doc.name || '',
      email: doc.email,
    }))

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json(
      { error: '搜索用户失败' },
      { status: 500 }
    )
  }
}
