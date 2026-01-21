import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { recordVisit, getVisitStats } from '@/lib/db'

// 创建 Visit 模块专用 logger
const log = createModuleLogger('Visit')

/**
 * POST /api/visit
 *
 * 记录用户访问
 * Body: { province: string }
 *
 * 省份为空或非中国地区时，使用 "其他" 作为 key
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json()
    const { province } = body

    // 省份校验：为空时使用 "其他"
    const normalizedProvince = province && typeof province === 'string' && province.trim()
      ? province.trim()
      : '其他'

    await recordVisit(normalizedProvince)

    log.info('Visit recorded successfully', {
      action: 'POST /api/visit',
      duration: Date.now() - start,
      metadata: { province: normalizedProvince },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to record visit', error, {
      action: 'POST /api/visit',
      duration: Date.now() - start,
    })

    return NextResponse.json(
      { error: 'Failed to record visit' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/visit
 *
 * 获取访问统计数据
 * 返回: { total: number }
 *
 * 目前只返回总数，省份数据暂不暴露给前端
 */
export async function GET() {
  const start = Date.now()

  try {
    const stats = await getVisitStats()

    log.info('Visit stats fetched', {
      action: 'GET /api/visit',
      duration: Date.now() - start,
      metadata: { total: stats.total },
    })

    // 只返回总数，省份信息暂不展示
    return NextResponse.json({
      total: stats.total,
      lastUpdated: stats.lastUpdated,
    })
  } catch (error) {
    log.error('Failed to fetch visit stats', error, {
      action: 'GET /api/visit',
      duration: Date.now() - start,
    })

    return NextResponse.json(
      { error: 'Failed to fetch visit stats' },
      { status: 500 }
    )
  }
}
