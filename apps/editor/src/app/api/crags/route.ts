import { NextRequest, NextResponse } from 'next/server'
import { getAllCrags, getCragsByCityId, createCrag, createCragPermission, getAllCities } from '@bloctop/shared/db'
import { isCityValid } from '@bloctop/shared/city-utils'
import { requireAuth } from '@/lib/require-auth'
import { canCreateCrag } from '@bloctop/shared/permissions'
import { createModuleLogger } from '@bloctop/shared/logger'
import { revalidateHomePage } from '@bloctop/shared/revalidate-helpers'

const log = createModuleLogger('API:Crags')

// Slug 格式: 小写字母、数字、连字符，不能以连字符开头或结尾
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * GET /api/crags
 * GET /api/crags?cityId=luoyuan
 * 获取岩场列表（可选按城市过滤）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    const cities = await getAllCities()
    const crags = cityId && isCityValid(cities, cityId)
      ? await getCragsByCityId(cityId)
      : await getAllCrags()

    return NextResponse.json({
      success: true,
      crags,
    })
  } catch (error) {
    log.error('Failed to get crags', error, {
      action: 'GET /api/crags',
    })
    return NextResponse.json(
      { success: false, error: '获取岩场列表失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crags
 * 创建新岩场 (需要 admin 权限)
 */
export async function POST(request: NextRequest) {
  // 认证 + 角色检查
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  if (!canCreateCrag(role)) {
    return NextResponse.json(
      { success: false, error: '需要管理员权限' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { id, name, cityId, location, description, approach, coordinates } = body

    if (!id || !name || !cityId || !location || !description || !approach) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    if (!SLUG_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID 格式无效，仅支持小写字母、数字和连字符' },
        { status: 400 }
      )
    }

    const crag = await createCrag({
      id,
      name,
      cityId,
      location,
      description,
      approach,
      createdBy: userId,
      ...(coordinates ? { coordinates } : {}),
    })

    // 自动为创建者建立 manager 权限
    await createCragPermission({
      userId,
      cragId: id,
      role: 'manager',
      assignedBy: userId,
    })

    log.info('Crag created', {
      action: 'POST /api/crags',
      metadata: { cragId: id, name, createdBy: userId },
    })

    revalidateHomePage()

    return NextResponse.json({ success: true, crag }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建岩场失败'
    const status = message.includes('已存在') ? 409 : 500
    log.error('Failed to create crag', error, { action: 'POST /api/crags' })
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
