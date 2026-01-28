import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Revalidate')

/**
 * POST /api/revalidate
 * 手动触发页面重新验证 (On-Demand ISR)
 *
 * Body: { path: string } 或 { routeId: number }
 *
 * 示例:
 * - { "path": "/zh/route/34" } - 重新验证特定路径
 * - { "routeId": 34 } - 重新验证所有语言版本的线路详情页
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 方式 1: 直接指定路径
    if (body.path && typeof body.path === 'string') {
      revalidatePath(body.path)
      log.info('Revalidated path', {
        action: 'POST /api/revalidate',
        metadata: { path: body.path },
      })
      return NextResponse.json({
        success: true,
        message: `已重新验证: ${body.path}`,
        revalidated: [body.path],
      })
    }

    // 方式 2: 指定线路 ID，重新验证所有语言版本
    if (body.routeId && typeof body.routeId === 'number') {
      const paths = [
        `/zh/route/${body.routeId}`,
        `/en/route/${body.routeId}`,
        `/fr/route/${body.routeId}`,
      ]
      paths.forEach(path => revalidatePath(path))
      log.info('Revalidated route pages', {
        action: 'POST /api/revalidate',
        metadata: { routeId: body.routeId, paths },
      })
      return NextResponse.json({
        success: true,
        message: `已重新验证线路 ${body.routeId} 的所有页面`,
        revalidated: paths,
      })
    }

    return NextResponse.json(
      { success: false, error: '请提供 path 或 routeId 参数' },
      { status: 400 }
    )
  } catch (error) {
    log.error('Failed to revalidate', error, {
      action: 'POST /api/revalidate',
    })
    return NextResponse.json(
      { success: false, error: '重新验证失败' },
      { status: 500 }
    )
  }
}
