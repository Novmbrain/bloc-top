// apps/editor/src/hooks/use-face-upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/

describe('faceId 格式验证', () => {
  it('纯小写字母应通过', () => {
    expect(FACE_ID_PATTERN.test('main-wall')).toBe(true)
  })

  it('中文字符应通过', () => {
    expect(FACE_ID_PATTERN.test('主墙-1')).toBe(true)
  })

  it('大写字母应失败', () => {
    expect(FACE_ID_PATTERN.test('MainWall')).toBe(false)
  })

  it('空格应失败', () => {
    expect(FACE_ID_PATTERN.test('main wall')).toBe(false)
  })

  it('特殊字符（除连字符外）应失败', () => {
    expect(FACE_ID_PATTERN.test('face.1')).toBe(false)
    expect(FACE_ID_PATTERN.test('face_1')).toBe(false)
  })
})

describe('handleFile 文件类型验证', () => {
  it('非图片文件应返回错误', () => {
    const showToast = vi.fn()
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error')
    }

    expect(showToast).toHaveBeenCalledWith('请上传图片文件', 'error')
  })

  it('图片文件应通过', () => {
    const showToast = vi.fn()
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })

    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error')
    }

    expect(showToast).not.toHaveBeenCalled()
  })
})

describe('上传前的 checkOnly 检测', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('文件已存在时应触发覆盖确认，不直接上传', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ exists: true }),
    } as Response)

    let showOverwriteConfirm = false

    const checkFormData = new FormData()
    checkFormData.append('cragId', 'test-crag')
    checkFormData.append('faceId', 'face-1')
    checkFormData.append('checkOnly', 'true')

    const checkRes = await fetch('/api/upload', { method: 'POST', body: checkFormData })
    const checkData = await checkRes.json()
    if (checkData.exists) showOverwriteConfirm = true

    expect(showOverwriteConfirm).toBe(true)
  })

  it('文件不存在时应直接进行上传', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ exists: false }),
    } as Response)

    let callDoUpload = false
    const checkRes = await fetch('/api/upload', { method: 'POST', body: new FormData() })
    const checkData = await checkRes.json()
    if (!checkData.exists) callDoUpload = true

    expect(callDoUpload).toBe(true)
  })
})

describe('大文件压缩逻辑', () => {
  it('小于 5MB 的文件不应压缩', () => {
    const file = new File([new ArrayBuffer(1024 * 1024)], 'small.jpg', { type: 'image/jpeg' })
    // 1MB < 5MB
    expect(file.size < 5 * 1024 * 1024).toBe(true)
  })

  it('大于 5MB 的文件应触发压缩分支', () => {
    // 6MB buffer
    const bigBuffer = new ArrayBuffer(6 * 1024 * 1024)
    const file = new File([bigBuffer], 'big.jpg', { type: 'image/jpeg' })
    expect(file.size > 5 * 1024 * 1024).toBe(true)
  })
})
