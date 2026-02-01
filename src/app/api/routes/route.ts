import { NextRequest, NextResponse } from 'next/server'
import { createRoute } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Routes')

/**
 * POST /api/routes
 * 创建新线路
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必填字段
    const { name, grade, cragId, area } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: '线路名称不能为空' },
        { status: 400 }
      )
    }

    if (!grade || typeof grade !== 'string') {
      return NextResponse.json(
        { success: false, error: '难度不能为空' },
        { status: 400 }
      )
    }

    if (!cragId || typeof cragId !== 'string') {
      return NextResponse.json(
        { success: false, error: '岩场 ID 不能为空' },
        { status: 400 }
      )
    }

    if (!area || typeof area !== 'string') {
      return NextResponse.json(
        { success: false, error: '区域不能为空' },
        { status: 400 }
      )
    }

    const routeData = {
      name: name.trim(),
      grade,
      cragId,
      area: area.trim(),
      setter: body.setter?.trim() || undefined,
      FA: body.FA?.trim() || undefined,
      description: body.description?.trim() || undefined,
      faceId: body.faceId || undefined,
    }

    const route = await createRoute(routeData)

    log.info('Route created', {
      action: 'POST /api/routes',
      metadata: { routeId: route.id, name: route.name, cragId: route.cragId },
    })

    return NextResponse.json({ success: true, route }, { status: 201 })
  } catch (error) {
    log.error('Failed to create route', error, {
      action: 'POST /api/routes',
    })
    return NextResponse.json(
      { success: false, error: '创建线路失败' },
      { status: 500 }
    )
  }
}
