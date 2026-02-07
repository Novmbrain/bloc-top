import { NextRequest, NextResponse } from 'next/server'
import type { WeatherData, WeatherLive, WeatherForecast } from '@/types'
import { evaluateClimbingCondition, evaluateForecastCondition } from '@/lib/weather-utils'
import { DEFAULT_WEATHER_COORDS, BAD_WEATHER_KEYWORDS } from '@/lib/weather-constants'
import { API_CACHE, HTTP_CACHE } from '@/lib/cache-config'
import { createModuleLogger } from '@/lib/logger'

// 创建 Weather 模块专用 logger
const log = createModuleLogger('Weather')

// ==================== 类型定义 ====================

interface GeoCodeResponse {
  status: string
  info: string
  regeocode?: {
    addressComponent?: {
      adcode?: string
      city?: string | string[]
      district?: string
    }
  }
}

interface WeatherResponse {
  status: string
  info: string
  lives?: Array<{
    weather: string
    temperature: string
    humidity: string
    winddirection: string
    windpower: string
    reporttime: string
    adcode: string
    city: string
  }>
  forecasts?: Array<{
    city: string
    adcode: string
    casts: Array<{
      date: string
      week: string
      dayweather: string
      nightweather: string
      daytemp: string
      nighttemp: string
      daywind: string
      nightwind: string
      daypower: string
      nightpower: string
    }>
  }>
}

interface CacheEntry {
  data: WeatherData
  expireAt: number
}

// ==================== 缓存 ====================

// 简单的内存缓存 (按 adcode 缓存)
const weatherCache = new Map<string, CacheEntry>()

function getCachedWeather(adcode: string): WeatherData | null {
  const entry = weatherCache.get(adcode)
  if (entry && entry.expireAt > Date.now()) {
    return entry.data
  }
  // 过期则删除
  if (entry) {
    weatherCache.delete(adcode)
  }
  return null
}

function setCachedWeather(adcode: string, data: WeatherData): void {
  weatherCache.set(adcode, {
    data,
    expireAt: Date.now() + API_CACHE.WEATHER_TTL,
  })
}

// ==================== 高德 API 调用 ====================

/**
 * 逆地理编码：坐标 -> adcode
 */
async function getAdcodeFromCoords(
  lng: number,
  lat: number,
  apiKey: string
): Promise<{ adcode: string; city: string } | null> {
  try {
    const location = `${lng},${lat}`
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${apiKey}&location=${location}&extensions=base`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      log.error(`Geocode API HTTP error: ${response.status}`, undefined, {
        action: 'getAdcodeFromCoords',
        metadata: { status: response.status, lng, lat },
      })
      return null
    }

    const data: GeoCodeResponse = await response.json()

    if (data.status !== '1' || !data.regeocode?.addressComponent?.adcode) {
      log.warn(`Geocode API failed: ${data.info}`, {
        action: 'getAdcodeFromCoords',
        metadata: { info: data.info, lng, lat },
      })
      return null
    }

    const { adcode, city, district } = data.regeocode.addressComponent

    // city 可能是数组或字符串
    const cityName = Array.isArray(city) ? city[0] : city || district || '未知'

    return { adcode, city: cityName }
  } catch (error) {
    log.error('Geocode request failed', error, {
      action: 'getAdcodeFromCoords',
      metadata: { lng, lat },
    })
    return null
  }
}

/**
 * 获取天气数据
 * @param adcode 城市编码
 * @param apiKey API Key
 * @param extensions 'base' 仅实况, 'all' 包含预报
 */
async function fetchWeatherData(
  adcode: string,
  apiKey: string,
  extensions: 'base' | 'all' = 'all'
): Promise<WeatherResponse | null> {
  try {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${apiKey}&city=${adcode}&extensions=${extensions}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      log.error(`Weather API HTTP error: ${response.status}`, undefined, {
        action: 'fetchWeatherData',
        metadata: { status: response.status, adcode, extensions },
      })
      return null
    }

    const data: WeatherResponse = await response.json()

    if (data.status !== '1') {
      log.warn(`Weather API failed: ${data.info}`, {
        action: 'fetchWeatherData',
        metadata: { info: data.info, adcode },
      })
      return null
    }

    return data
  } catch (error) {
    log.error('Weather request failed', error, {
      action: 'fetchWeatherData',
      metadata: { adcode },
    })
    return null
  }
}

// ==================== API 路由 ====================

/**
 * GET /api/weather
 *
 * 查询参数:
 * - lng: 经度 (可选，默认使用罗源县中心)
 * - lat: 纬度 (可选，默认使用罗源县中心)
 * - forecast: 是否包含预报 (可选，默认 true)
 *
 * 返回:
 * - WeatherData 对象
 */
export async function GET(request: NextRequest) {
  const start = Date.now()

  try {
    const apiKey = process.env.NEXT_PUBLIC_AMAP_KEY

    if (!apiKey) {
      log.error('NEXT_PUBLIC_AMAP_KEY not configured', undefined, {
        action: 'GET /api/weather',
      })
      return NextResponse.json(
        { error: '天气服务未配置' },
        { status: 503 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const adcodeParam = searchParams.get('adcode')
    const cityParam = searchParams.get('city')
    const includeForecast = searchParams.get('forecast') !== 'false'

    let adcode: string
    let city: string

    if (adcodeParam) {
      // 直接使用 adcode，跳过逆地理编码
      adcode = adcodeParam
      city = cityParam || adcodeParam
    } else {
      // 通过坐标逆地理编码
      const lng = parseFloat(searchParams.get('lng') || String(DEFAULT_WEATHER_COORDS.lng))
      const lat = parseFloat(searchParams.get('lat') || String(DEFAULT_WEATHER_COORDS.lat))

      if (isNaN(lng) || isNaN(lat)) {
        return NextResponse.json(
          { error: '无效的坐标参数' },
          { status: 400 }
        )
      }

      const geoResult = await getAdcodeFromCoords(lng, lat, apiKey)

      if (!geoResult) {
        return NextResponse.json(
          { error: '无法获取位置信息' },
          { status: 500 }
        )
      }

      adcode = geoResult.adcode
      city = geoResult.city
    }

    // 2. 检查缓存
    const cached = getCachedWeather(adcode)
    if (cached) {
      log.debug('Weather cache hit', {
        action: 'GET /api/weather',
        duration: Date.now() - start,
        metadata: { adcode, city },
      })
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `public, max-age=${HTTP_CACHE.WEATHER_MAX_AGE}`,
        },
      })
    }

    // 3. 获取天气数据
    // 使用两次调用：base 获取实况，all 获取预报
    // (高德 API 的 all 模式不包含实况的完整字段)
    const [liveData, forecastData] = await Promise.all([
      fetchWeatherData(adcode, apiKey, 'base'),
      includeForecast ? fetchWeatherData(adcode, apiKey, 'all') : null,
    ])

    if (!liveData?.lives?.[0]) {
      log.error('Failed to get weather live data', undefined, {
        action: 'GET /api/weather',
        duration: Date.now() - start,
        metadata: { adcode },
      })
      return NextResponse.json(
        { error: '无法获取天气数据' },
        { status: 500 }
      )
    }

    // 4. 解析实况数据
    const liveRaw = liveData.lives[0]
    const live: WeatherLive = {
      weather: liveRaw.weather,
      temperature: parseInt(liveRaw.temperature, 10),
      humidity: parseInt(liveRaw.humidity, 10),
      windDirection: liveRaw.winddirection,
      windPower: liveRaw.windpower,
      reportTime: liveRaw.reporttime,
    }

    // 5. 解析预报数据 (如果有)
    let forecasts: WeatherForecast[] | undefined
    let todayHasRain = false

    if (forecastData?.forecasts?.[0]?.casts) {
      forecasts = forecastData.forecasts[0].casts.map((cast, index) => {
        const forecast: WeatherForecast = {
          date: cast.date,
          week: cast.week,
          dayWeather: cast.dayweather,
          nightWeather: cast.nightweather,
          dayTemp: parseInt(cast.daytemp, 10),
          nightTemp: parseInt(cast.nighttemp, 10),
          dayWind: cast.daywind,
          nightWind: cast.nightwind,
          dayPower: cast.daypower,
          nightPower: cast.nightpower,
        }

        // 为每天计算攀岩适宜度
        forecast.climbing = evaluateForecastCondition(forecast)

        // 检测今天的降雨预报
        if (index === 0) {
          todayHasRain = BAD_WEATHER_KEYWORDS.some(keyword =>
            forecast.dayWeather.includes(keyword) || forecast.nightWeather.includes(keyword)
          )
        }

        return forecast
      })
    }

    // 6. 评估攀岩适宜度 (含降雨提醒)
    const climbing = evaluateClimbingCondition(live, { todayHasRain })

    // 7. 组装响应
    const weatherData: WeatherData = {
      adcode,
      city,
      live,
      forecasts,
      climbing,
      updatedAt: new Date().toISOString(),
    }

    // 8. 缓存并返回
    setCachedWeather(adcode, weatherData)

    log.info(`Fetched weather for ${city}`, {
      action: 'GET /api/weather',
      duration: Date.now() - start,
      metadata: {
        adcode,
        temperature: live.temperature,
        weather: live.weather,
        climbingLevel: climbing.level,
      },
    })

    return NextResponse.json(weatherData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${HTTP_CACHE.WEATHER_MAX_AGE}`,
      },
    })
  } catch (error) {
    log.error('Weather API unexpected error', error, {
      action: 'GET /api/weather',
      duration: Date.now() - start,
    })
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
