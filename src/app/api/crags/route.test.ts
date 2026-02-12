/**
 * GET /api/crags API Route 测试
 *
 * 测试覆盖:
 * - 无参数请求返回所有岩场
 * - ?cityId= 参数过滤岩场
 * - 无效 cityId 回退到全部
 * - 数据库错误处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { Crag } from '@/types'

// Mock db module
vi.mock('@/lib/db', () => ({
  getAllCrags: vi.fn(),
  getCragsByCityId: vi.fn(),
  createCrag: vi.fn(),
  getAllCities: vi.fn(),
}))

// Mock auth module (POST handler imports getAuth)
vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Import after mocks
import { GET } from './route'
import { getAllCrags, getCragsByCityId, getAllCities } from '@/lib/db'

const mockGetAllCrags = vi.mocked(getAllCrags)
const mockGetCragsByCityId = vi.mocked(getCragsByCityId)
const mockGetAllCities = vi.mocked(getAllCities)

// Test data
const luoyuanCrag: Crag = {
  id: 'yuan-tong-si',
  name: '圆通寺',
  cityId: 'luoyuan',
  location: '福州市罗源县',
  developmentTime: '2020',
  description: '罗源经典岩场',
  approach: '步行15分钟',
}

const xiamenCrag: Crag = {
  id: 'xiamen-crag-1',
  name: '厦门岩场',
  cityId: 'xiamen',
  location: '厦门市',
  developmentTime: '2024',
  description: '厦门抱石点',
  approach: '步行10分钟',
}

const allCrags = [luoyuanCrag, xiamenCrag]

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/crags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getAllCities 返回测试城市列表，供 isCityValid 验证使用
    mockGetAllCities.mockResolvedValue([
      { id: 'luoyuan', name: '罗源', shortName: '罗源', adcode: '350123', coordinates: { lng: 119.549, lat: 26.489 }, available: true },
      { id: 'xiamen', name: '厦门', shortName: '厦门', adcode: '350200', coordinates: { lng: 118.089, lat: 24.479 }, available: true },
    ])
  })

  it('无参数时返回所有岩场', async () => {
    mockGetAllCrags.mockResolvedValue(allCrags)

    const response = await GET(createRequest('/api/crags'))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.crags).toHaveLength(2)
    expect(mockGetAllCrags).toHaveBeenCalledOnce()
    expect(mockGetCragsByCityId).not.toHaveBeenCalled()
  })

  it('?cityId=luoyuan 时按城市过滤', async () => {
    mockGetCragsByCityId.mockResolvedValue([luoyuanCrag])

    const response = await GET(createRequest('/api/crags?cityId=luoyuan'))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.crags).toHaveLength(1)
    expect(data.crags[0].id).toBe('yuan-tong-si')
    expect(mockGetCragsByCityId).toHaveBeenCalledWith('luoyuan')
    expect(mockGetAllCrags).not.toHaveBeenCalled()
  })

  it('?cityId=xiamen 时返回厦门岩场', async () => {
    mockGetCragsByCityId.mockResolvedValue([xiamenCrag])

    const response = await GET(createRequest('/api/crags?cityId=xiamen'))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.crags).toHaveLength(1)
    expect(data.crags[0].cityId).toBe('xiamen')
    expect(mockGetCragsByCityId).toHaveBeenCalledWith('xiamen')
  })

  it('无效的 cityId 回退到返回全部', async () => {
    mockGetAllCrags.mockResolvedValue(allCrags)

    const response = await GET(createRequest('/api/crags?cityId=invalid'))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.crags).toHaveLength(2)
    // 无效 cityId 不通过 isValidCityId，走 getAllCrags
    expect(mockGetAllCrags).toHaveBeenCalledOnce()
    expect(mockGetCragsByCityId).not.toHaveBeenCalled()
  })

  it('空 cityId 参数回退到返回全部', async () => {
    mockGetAllCrags.mockResolvedValue(allCrags)

    const response = await GET(createRequest('/api/crags?cityId='))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockGetAllCrags).toHaveBeenCalledOnce()
  })

  it('数据库错误返回 500', async () => {
    mockGetAllCrags.mockRejectedValue(new Error('DB connection failed'))

    const response = await GET(createRequest('/api/crags'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('获取岩场列表失败')
  })

  it('按城市查询时数据库错误返回 500', async () => {
    mockGetCragsByCityId.mockRejectedValue(new Error('DB query failed'))

    const response = await GET(createRequest('/api/crags?cityId=luoyuan'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})
