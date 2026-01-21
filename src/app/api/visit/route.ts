import { NextRequest, NextResponse } from 'next/server'
import { createModuleLogger } from '@/lib/logger'
import { recordVisit, getVisitStats } from '@/lib/db'

// 创建 Visit 模块专用 logger
const log = createModuleLogger('Visit')

/**
 * POST /api/visit
 *
 * 记录一次 App 打开（不去重，每次都计数）
 * Body: { province?: string }
 *
 * - 有省份：记录该省份
 * - 无省份/海外：记录为「海外」
 */
export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const { province } = body as { province?: string }

    // 省份为空（海外用户或 geo 失败）记录为「海外」
    const normalizedProvince = province?.trim() || '海外'

    await recordVisit(normalizedProvince)

    log.info('Visit recorded', {
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
