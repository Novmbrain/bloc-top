import { NextRequest, NextResponse } from 'next/server'
import { getCityByAdcode, DEFAULT_CITY_ID, type CityId } from '@/lib/city-config'

/**
 * 高德 IP 定位 API 响应类型
 */
interface IpLocationResponse {
  status: string
  info: string
  infocode: string
  province?: string
  city?: string | string[]  // 可能是数组（直辖市）
  adcode?: string | string[]
  rectangle?: string
}

/**
 * GET /api/geo
 *
 * 根据客户端 IP 推断所在城市
 * 用于首次访问时智能选择默认城市
 *
 * 返回:
 * - cityId: 匹配到的城市 ID
 * - detected: 是否成功检测（false 时使用默认值）
 * - province: 省份名称（调试用）
 * - city: 城市名称（调试用）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取客户端 IP
    const clientIp = getClientIp(request)

    // 本地开发环境，直接返回默认城市
    if (clientIp === '127.0.0.1' || clientIp === '::1') {
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'localhost',
      })
    }

    // 2. 调用高德 IP 定位 API
    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY
    if (!amapKey) {
      console.error('[Geo API] NEXT_PUBLIC_AMAP_KEY not configured')
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'api_key_missing',
      })
    }

    const ipApiUrl = `https://restapi.amap.com/v3/ip?key=${amapKey}&ip=${clientIp}`
    const response = await fetch(ipApiUrl, {
      signal: AbortSignal.timeout(5000), // 5 秒超时
    })

    if (!response.ok) {
      throw new Error(`IP API returned ${response.status}`)
    }

    const data: IpLocationResponse = await response.json()

    if (data.status !== '1') {
      console.warn('[Geo API] IP location failed:', data.info)
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'ip_location_failed',
        info: data.info,
      })
    }

    // 3. 解析 adcode（处理数组情况）
    const adcode = Array.isArray(data.adcode) ? data.adcode[0] : data.adcode
    const cityName = Array.isArray(data.city) ? data.city[0] : data.city

    if (!adcode) {
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'no_adcode',
        province: data.province,
        city: cityName,
      })
    }

    // 4. 匹配支持的城市
    const matchedCity = getCityByAdcode(adcode)
    const cityId: CityId = matchedCity?.id ?? DEFAULT_CITY_ID

    return NextResponse.json({
      cityId,
      detected: !!matchedCity,
      province: data.province,
      city: cityName,
      adcode,
      matchedCity: matchedCity?.name,
    })
  } catch (error) {
    console.error('[Geo API] Error:', error)
    return NextResponse.json({
      cityId: DEFAULT_CITY_ID,
      detected: false,
      reason: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 获取客户端 IP 地址
 */
function getClientIp(request: NextRequest): string {
  // Vercel/Cloudflare 等代理会设置这些头
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // 本地开发环境
  return '127.0.0.1'
}
