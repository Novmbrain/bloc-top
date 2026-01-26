import { NextRequest, NextResponse } from 'next/server'
import { getRoutesByCragId } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:CragRoutes')

/**
 * GET /api/crags/[id]/routes
 * 获取指定岩场的所有线路
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cragId } = await params

  if (!cragId) {
    return NextResponse.json(
      { success: false, error: '岩场 ID 不能为空' },
      { status: 400 }
    )
  }

  try {
    const routes = await getRoutesByCragId(cragId)

    return NextResponse.json({
      success: true,
      routes,
      cragId,
    })
  } catch (error) {
    log.error('Failed to get crag routes', error, {
      action: 'GET /api/crags/[id]/routes',
      metadata: { cragId },
    })
    return NextResponse.json(
      { success: false, error: '获取线路列表失败' },
      { status: 500 }
    )
  }
}
