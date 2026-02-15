import { NextRequest, NextResponse } from 'next/server'
import { getRouteCountByCragId } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:CragVersion')

/**
 * GET /api/crags/[id]/version
 * 轻量级端点：仅返回线路数量，用于离线数据 stale 检测
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
    const routeCount = await getRouteCountByCragId(cragId)

    return NextResponse.json({
      success: true,
      routeCount,
    })
  } catch (error) {
    log.error('Failed to get crag version', error, {
      action: 'GET /api/crags/[id]/version',
      metadata: { cragId },
    })
    return NextResponse.json(
      { success: false, error: '获取版本信息失败' },
      { status: 500 }
    )
  }
}
