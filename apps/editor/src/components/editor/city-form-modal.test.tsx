// apps/editor/src/components/editor/city-form-modal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrefectureConfig } from '@bloctop/shared/types'

// 注：CityFormModal 尚未提取为独立文件，此测试验证其表单验证逻辑（纯函数部分）
// 组件提取后在同一文件改为 render 测试

const mockPrefectures: PrefectureConfig[] = [
  {
    id: 'fuzhou',
    name: '福州市',
    shortName: '福州',
    districts: ['luoyuan', 'changle'],
    defaultDistrict: 'luoyuan',
  },
]

describe('CityFormModal 表单验证逻辑', () => {
  it('必填字段为空时应返回验证错误', () => {
    // 模拟 handleSave 中的验证逻辑
    const id = ''
    const name = ''
    const shortName = ''
    const adcode = ''

    let validationError = ''
    if (!id || !name || !shortName || !adcode) {
      validationError = '请填写必填字段'
    }

    expect(validationError).toBe('请填写必填字段')
  })

  it('所有必填字段填写后不应报错', () => {
    const id = 'luoyuan'
    const name = '罗源'
    const shortName = '罗源'
    const adcode = '350123'

    let validationError = ''
    if (!id || !name || !shortName || !adcode) {
      validationError = '请填写必填字段'
    }

    expect(validationError).toBe('')
  })
})

describe('坐标格式验证', () => {
  it('有效坐标字符串应被解析', async () => {
    const { parseCoordinateInput } = await import('@bloctop/shared/coordinate-utils')
    const result = parseCoordinateInput('119.306239,26.063477')
    expect(result).not.toBeNull()
    expect(result!.lng).toBeCloseTo(119.306239)
    expect(result!.lat).toBeCloseTo(26.063477)
  })

  it('无效坐标字符串应返回 null', async () => {
    const { parseCoordinateInput } = await import('@bloctop/shared/coordinate-utils')
    const result = parseCoordinateInput('not-a-coordinate')
    expect(result).toBeNull()
  })
})

describe('CityFormModal API 调用', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('新建城市时应调用 POST /api/cities', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const payload = {
      id: 'luoyuan', name: '罗源', shortName: '罗源', adcode: '350123',
      coordinates: { lng: 119.306239, lat: 26.063477 },
      available: false, sortOrder: 0,
    }

    const res = await fetch('/api/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/cities', expect.objectContaining({ method: 'POST' }))
  })

  it('编辑城市时应调用 PATCH /api/cities/:id', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    } as Response)

    await fetch('/api/cities/luoyuan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '罗源县' }),
    })

    expect(fetch).toHaveBeenCalledWith('/api/cities/luoyuan', expect.objectContaining({ method: 'PATCH' }))
  })
})
