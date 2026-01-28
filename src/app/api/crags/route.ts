import { NextResponse } from 'next/server'
import { getAllCrags } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Crags')

/**
 * GET /api/crags
 * 获取所有岩场列表
 */
export async function GET() {
  try {
    const crags = await getAllCrags()

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
