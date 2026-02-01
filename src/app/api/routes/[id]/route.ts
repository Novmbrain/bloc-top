import { NextRequest, NextResponse } from 'next/server'
import { getRouteById, updateRoute } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'
import type { Route, TopoPoint } from '@/types'

const log = createModuleLogger('API:Routes')

/**
 * GET /api/routes/[id]
 * 获取单条线路详情
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const routeId = parseInt(id, 10)

  if (isNaN(routeId)) {
    return NextResponse.json(
      { success: false, error: '无效的线路 ID' },
      { status: 400 }
    )
  }

  try {
    const route = await getRouteById(routeId)

    if (!route) {
      return NextResponse.json(
        { success: false, error: '线路不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, route })
  } catch (error) {
    log.error('Failed to get route', error, {
      action: 'GET /api/routes/[id]',
      metadata: { routeId },
    })
    return NextResponse.json(
      { success: false, error: '获取线路失败' },
      { status: 500 }
    )
  }
}

/**
 * 验证 TopoPoint 数组
 */
function validateTopoLine(line: unknown): line is TopoPoint[] {
  if (!Array.isArray(line)) return false
  return line.every(
    (point) =>
      typeof point === 'object' &&
      point !== null &&
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1
  )
}

/**
 * PATCH /api/routes/[id]
 * 更新线路信息（支持部分更新）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const routeId = parseInt(id, 10)

  if (isNaN(routeId)) {
    return NextResponse.json(
      { success: false, error: '无效的线路 ID' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const updates: Partial<Omit<Route, 'id'>> = {}

    // 验证并收集可更新的字段
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { success: false, error: '线路名称不能为空' },
          { status: 400 }
        )
      }
      updates.name = body.name.trim()
    }

    if (body.grade !== undefined) {
      if (typeof body.grade !== 'string') {
        return NextResponse.json(
          { success: false, error: '难度格式无效' },
          { status: 400 }
        )
      }
      updates.grade = body.grade
    }

    if (body.area !== undefined) {
      if (typeof body.area !== 'string') {
        return NextResponse.json(
          { success: false, error: '区域格式无效' },
          { status: 400 }
        )
      }
      updates.area = body.area.trim()
    }

    if (body.setter !== undefined) {
      updates.setter = body.setter?.trim() || undefined
    }

    if (body.FA !== undefined) {
      updates.FA = body.FA?.trim() || undefined
    }

    if (body.description !== undefined) {
      updates.description = body.description?.trim() || undefined
    }

    if (body.image !== undefined) {
      updates.image = body.image?.trim() || undefined
    }

    // 验证 faceId
    if (body.faceId !== undefined) {
      if (body.faceId === null) {
        updates.faceId = undefined
      } else if (typeof body.faceId === 'string' && /^[\u4e00-\u9fffa-z0-9-]+$/.test(body.faceId)) {
        updates.faceId = body.faceId
      } else {
        return NextResponse.json(
          { success: false, error: 'faceId 格式无效，仅允许中文、小写字母、数字和连字符' },
          { status: 400 }
        )
      }
    }

    // 验证 topoLine
    if (body.topoLine !== undefined) {
      if (body.topoLine === null) {
        // 允许清空 topoLine
        updates.topoLine = undefined
      } else if (!validateTopoLine(body.topoLine)) {
        return NextResponse.json(
          { success: false, error: 'Topo 线路数据格式无效' },
          { status: 400 }
        )
      } else {
        updates.topoLine = body.topoLine
      }
    }

    // 检查是否有需要更新的字段
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      )
    }

    const updatedRoute = await updateRoute(routeId, updates)

    if (!updatedRoute) {
      return NextResponse.json(
        { success: false, error: '线路不存在' },
        { status: 404 }
      )
    }

    log.info('Route updated', {
      action: 'PATCH /api/routes/[id]',
      metadata: { routeId, fields: Object.keys(updates) },
    })

    return NextResponse.json({
      success: true,
      route: updatedRoute,
      message: '更新成功',
    })
  } catch (error) {
    log.error('Failed to update route', error, {
      action: 'PATCH /api/routes/[id]',
      metadata: { routeId },
    })
    return NextResponse.json(
      { success: false, error: '更新线路失败' },
      { status: 500 }
    )
  }
}
