import { NextRequest, NextResponse } from 'next/server'
import { getRouteById, updateRoute, deleteRoute } from '@/lib/db'
import { requireAuth } from '@/lib/require-auth'
import { canEditCrag } from '@/lib/permissions'
import { createModuleLogger } from '@/lib/logger'
import { revalidateCragPages } from '@/lib/revalidate-helpers'
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
  // 认证检查
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const { id } = await params
  const routeId = parseInt(id, 10)

  if (isNaN(routeId)) {
    return NextResponse.json(
      { success: false, error: '无效的线路 ID' },
      { status: 400 }
    )
  }

  // 先获取线路以得到 cragId
  const existingRoute = await getRouteById(routeId)
  if (!existingRoute) {
    return NextResponse.json(
      { success: false, error: '线路不存在' },
      { status: 404 }
    )
  }

  // 权限检查
  if (!(await canEditCrag(userId, existingRoute.cragId, role))) {
    return NextResponse.json(
      { success: false, error: '无权编辑此岩场的线路' },
      { status: 403 }
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

    // 验证 topoTension
    if (body.topoTension !== undefined) {
      if (body.topoTension === null) {
        updates.topoTension = undefined
      } else if (typeof body.topoTension !== 'number' || !Number.isFinite(body.topoTension) || body.topoTension < 0 || body.topoTension > 1) {
        return NextResponse.json(
          { success: false, error: 'topoTension 必须是 0-1 之间的数字' },
          { status: 400 }
        )
      } else {
        updates.topoTension = body.topoTension
      }
    }

    // 验证 topoAnnotations
    if (body.topoAnnotations !== undefined) {
      if (body.topoAnnotations === null || (Array.isArray(body.topoAnnotations) && body.topoAnnotations.length === 0)) {
        updates.topoAnnotations = []
      } else if (!Array.isArray(body.topoAnnotations)) {
        return NextResponse.json(
          { success: false, error: 'topoAnnotations 必须是数组' },
          { status: 400 }
        )
      } else {
        // 验证每条标注
        for (const annotation of body.topoAnnotations) {
          if (
            typeof annotation.faceId !== 'string' ||
            typeof annotation.area !== 'string' ||
            !validateTopoLine(annotation.topoLine)
          ) {
            return NextResponse.json(
              { success: false, error: 'topoAnnotations 中的标注数据格式无效' },
              { status: 400 }
            )
          }
        }
        updates.topoAnnotations = body.topoAnnotations
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

    revalidateCragPages(existingRoute.cragId)

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

/**
 * DELETE /api/routes/[id]
 * 删除线路（含内嵌的 betaLinks、topoLine）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 认证检查
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  const start = Date.now()
  const { id } = await params
  const routeId = parseInt(id, 10)

  if (isNaN(routeId)) {
    return NextResponse.json(
      { success: false, error: '无效的线路 ID' },
      { status: 400 }
    )
  }

  // 先获取线路以得到 cragId
  const existingRoute = await getRouteById(routeId)
  if (!existingRoute) {
    return NextResponse.json(
      { success: false, error: '线路不存在' },
      { status: 404 }
    )
  }

  // 权限检查
  if (!(await canEditCrag(userId, existingRoute.cragId, role))) {
    return NextResponse.json(
      { success: false, error: '无权删除此岩场的线路' },
      { status: 403 }
    )
  }

  try {
    const deleted = await deleteRoute(routeId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '线路不存在' },
        { status: 404 }
      )
    }

    log.info('Route deleted', {
      action: 'DELETE /api/routes/[id]',
      duration: Date.now() - start,
      metadata: { routeId },
    })

    revalidateCragPages(existingRoute.cragId)

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete route', error, {
      action: 'DELETE /api/routes/[id]',
      duration: Date.now() - start,
    })
    return NextResponse.json(
      { success: false, error: '删除线路失败' },
      { status: 500 }
    )
  }
}
