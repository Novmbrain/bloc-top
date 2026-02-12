import { NextRequest, NextResponse } from 'next/server'
import { getAllCities, getAllPrefectures } from '@/lib/db'
import { findCityByAdcode, DEFAULT_CITY_ID } from '@/lib/city-utils'
import { createModuleLogger } from '@/lib/logger'
import { getClientIp } from '@/lib/request-utils'

// 创建 Geo 模块专用 logger
const log = createModuleLogger('Geo')

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
  const start = Date.now()

  try {
    // 1. 获取客户端 IP
    const clientIp = getClientIp(request)

    // 本地开发环境，直接返回默认城市
    if (clientIp === '127.0.0.1' || clientIp === '::1') {
      log.debug('Localhost detected, using default city', {
        action: 'GET /api/geo',
        duration: Date.now() - start,
      })
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'localhost',
      })
    }

    // 2. 调用高德 IP 定位 API
    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY
    if (!amapKey) {
      log.error('NEXT_PUBLIC_AMAP_KEY not configured', undefined, {
        action: 'GET /api/geo',
      })
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
      log.error(`IP API HTTP error: ${response.status}`, undefined, {
        action: 'GET /api/geo',
        duration: Date.now() - start,
        metadata: { status: response.status, ip: clientIp },
      })
      throw new Error(`IP API returned ${response.status}`)
    }

    const data: IpLocationResponse = await response.json()

    if (data.status !== '1') {
      log.warn(`IP location failed: ${data.info}`, {
        action: 'GET /api/geo',
        duration: Date.now() - start,
        metadata: { info: data.info, ip: clientIp },
      })
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
      log.info('No adcode returned from IP location', {
        action: 'GET /api/geo',
        duration: Date.now() - start,
        metadata: { province: data.province, city: cityName },
      })
      return NextResponse.json({
        cityId: DEFAULT_CITY_ID,
        detected: false,
        reason: 'no_adcode',
        province: data.province,
        city: cityName,
      })
    }

    // 4. 从 DB 获取城市和地级市数据，匹配支持的城市
    const [cities, prefectures] = await Promise.all([
      getAllCities(),
      getAllPrefectures(),
    ])

    const matchedCity = findCityByAdcode(cities, prefectures, adcode)
    const cityId = matchedCity?.id ?? DEFAULT_CITY_ID

    log.info(`IP location successful: ${data.province} ${cityName}`, {
      action: 'GET /api/geo',
      duration: Date.now() - start,
      metadata: {
        adcode,
        detected: !!matchedCity,
        matchedCityId: cityId,
      },
    })

    return NextResponse.json({
      cityId,
      detected: !!matchedCity,
      province: data.province,
      city: cityName,
      adcode,
      matchedCity: matchedCity?.name,
    })
  } catch (error) {
    log.error('Geo API error', error, {
      action: 'GET /api/geo',
      duration: Date.now() - start,
    })
    return NextResponse.json({
      cityId: DEFAULT_CITY_ID,
      detected: false,
      reason: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
