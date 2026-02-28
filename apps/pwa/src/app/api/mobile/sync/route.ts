import { NextResponse } from 'next/server'
import { getAllCrags, getAllRoutes } from '@/lib/db'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:MobileSync')

/**
 * GET /api/mobile/sync
 * Returns all crags and routes in a single response for mobile clients.
 * No rate limiting — this replaces N+1 requests with one call.
 */
export async function GET() {
  try {
    const [crags, routes] = await Promise.all([
      getAllCrags(),
      getAllRoutes(),
    ])

    return NextResponse.json(
      {
        success: true,
        crags,
        routes,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    )
  } catch (error) {
    log.error('Failed to sync mobile data', error, {
      action: 'GET /api/mobile/sync',
    })
    return NextResponse.json(
      { success: false, error: 'Failed to load data' },
      { status: 500 }
    )
  }
}
