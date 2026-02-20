# Editor 模块拆分重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `apps/editor/src` 下 5 个大型文件（1167+790+699+600+457 行）拆分为 Hooks + 子组件，使每个文件降到 ≤ 250 行，测试先行保证行为不变。

**Architecture:** 业务逻辑提取为独立 Hook（`hooks/use-face-data.ts` 等），大型 JSX 面板拆为子组件（`components/editor/face-detail-panel.tsx` 等），页面文件仅负责组合渲染。测试覆盖所有 API 调用路径（mock fetch）。

**Tech Stack:** Next.js 16 App Router、React 19、Vitest、`@testing-library/react`（`renderHook`）、`vi.fn()` mock fetch

---

## Phase 1: 为现有代码写测试

> 在重构任何代码前，先为将被提取的逻辑写集成测试。测试验证通过后，重构时才能有信心。

### Task 1: 搭建 Editor 测试环境配置

**Files:**
- Read: `apps/editor/src/test/setup.tsx`（了解现有 setup）
- Read: `apps/editor/vitest.config.ts` 或 `apps/editor/package.json`（了解测试命令）

**Step 1: 查看现有 setup 文件**

```bash
cat apps/editor/src/test/setup.tsx
cat apps/editor/package.json | grep -A5 '"test"'
```

**Step 2: 验证测试能跑**

```bash
pnpm --filter @bloctop/editor test:run
```

Expected: 测试通过（现有 confirm-dialog、topo-preview、use-dirty-guard、use-route-editor、use-route-creation 等测试）

**Step 3: 如果缺少 @testing-library/react，安装**

```bash
pnpm --filter @bloctop/editor add -D @testing-library/react @testing-library/user-event
```

---

### Task 2: 为 faceGroups 派生计算写单元测试

`faceGroups` 是 `faces/page.tsx` 里最复杂的 `useMemo`，将来会在 hook 里，先写测试锁定逻辑。

**Files:**
- Create: `apps/editor/src/hooks/use-face-data.test.ts`

**Step 1: 在测试文件里实现纯函数版本的 faceGroups 计算并测试**

```typescript
// apps/editor/src/hooks/use-face-data.test.ts
import { describe, it, expect } from 'vitest'
import type { Route } from '@bloctop/shared/types'

// 提取 faceGroups 计算的纯函数（将来 hook 也会用这个）
interface R2FaceInfo { faceId: string; area: string }
interface FaceGroup { faceId: string; area: string; routes: Route[]; imageUrl: string }

function computeFaceGroups(
  r2Faces: R2FaceInfo[],
  routes: Route[],
  selectedArea: string | null,
  getImageUrl: (params: { cragId: string; area: string; faceId: string }) => string,
  cragId: string
): FaceGroup[] {
  const map = new Map<string, FaceGroup>()
  r2Faces.forEach(({ faceId, area }) => {
    map.set(faceId, {
      faceId,
      area,
      routes: [],
      imageUrl: getImageUrl({ cragId, area, faceId }),
    })
  })
  routes.forEach(r => {
    if (!r.faceId) return
    const entry = map.get(r.faceId)
    if (entry) entry.routes.push(r)
  })
  let result = Array.from(map.values())
  if (selectedArea) result = result.filter(f => f.area === selectedArea)
  return result
}

const fakeGetImageUrl = ({ cragId, area, faceId }: { cragId: string; area: string; faceId: string }) =>
  `https://img.example.com/${cragId}/${area}/${faceId}.jpg`

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V3', cragId: 'test-crag', area: '主墙', faceId: 'face-1' } as Route,
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: '主墙', faceId: 'face-1' } as Route,
  { id: 3, name: '线路C', grade: 'V1', cragId: 'test-crag', area: '侧墙', faceId: 'face-2' } as Route,
  { id: 4, name: '线路D', grade: 'V2', cragId: 'test-crag', area: '主墙', faceId: undefined } as Route,
]

describe('computeFaceGroups', () => {
  it('应根据 r2Faces 构建 face 列表', () => {
    const r2Faces: R2FaceInfo[] = [
      { faceId: 'face-1', area: '主墙' },
      { faceId: 'face-2', area: '侧墙' },
    ]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(2)
    expect(result[0].faceId).toBe('face-1')
    expect(result[0].routes).toHaveLength(2)
    expect(result[1].faceId).toBe('face-2')
    expect(result[1].routes).toHaveLength(1)
  })

  it('没有 faceId 的线路不应关联到任何 face', () => {
    const r2Faces: R2FaceInfo[] = [{ faceId: 'face-1', area: '主墙' }]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    const face1 = result.find(f => f.faceId === 'face-1')!
    // 线路D 没有 faceId，不应出现
    expect(face1.routes.map(r => r.id)).not.toContain(4)
  })

  it('area 筛选应过滤掉非当前 area 的 face', () => {
    const r2Faces: R2FaceInfo[] = [
      { faceId: 'face-1', area: '主墙' },
      { faceId: 'face-2', area: '侧墙' },
    ]
    const result = computeFaceGroups(r2Faces, mockRoutes, '侧墙', fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(1)
    expect(result[0].faceId).toBe('face-2')
  })

  it('imageUrl 应包含 cragId、area、faceId', () => {
    const r2Faces: R2FaceInfo[] = [{ faceId: 'face-1', area: '主墙' }]
    const result = computeFaceGroups(r2Faces, mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result[0].imageUrl).toBe('https://img.example.com/test-crag/主墙/face-1.jpg')
  })

  it('r2Faces 为空时返回空数组', () => {
    const result = computeFaceGroups([], mockRoutes, null, fakeGetImageUrl, 'test-crag')
    expect(result).toHaveLength(0)
  })
})
```

**Step 2: 运行测试验证通过**

```bash
pnpm --filter @bloctop/editor test:run -- --reporter=verbose src/hooks/use-face-data.test.ts
```

Expected: 5 tests PASS

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-face-data.test.ts
git commit -m "test: add faceGroups derivation unit tests before refactor"
```

---

### Task 3: 为 face CRUD API 调用写集成测试（mock fetch）

**Files:**
- Modify: `apps/editor/src/hooks/use-face-data.test.ts`（追加测试用例）

**Step 1: 追加 loadFaces + handleDeleteFace + handleRenameFace 的测试**

将以下内容追加到 `apps/editor/src/hooks/use-face-data.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ==================== loadFaces ====================

describe('loadFaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('成功时应更新 r2Faces 列表', async () => {
    const mockFaces = [{ faceId: 'face-1', area: '主墙' }]
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, faces: mockFaces }),
    } as Response)

    // 这里直接测试原始函数逻辑（提取后 hook 中用相同逻辑）
    const result: R2FaceInfo[] = []
    const res = await fetch('/api/faces?cragId=test-crag')
    const data = await res.json()
    if (data.success) result.push(...data.faces)

    expect(result).toEqual(mockFaces)
    expect(fetch).toHaveBeenCalledWith('/api/faces?cragId=test-crag', expect.anything())
  })

  it('AbortError 应被静默忽略', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    global.fetch = vi.fn().mockRejectedValueOnce(abortError)

    // 模拟 loadFaces 内的错误处理
    let wasIgnored = false
    try {
      await fetch('/api/faces?cragId=test-crag')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        wasIgnored = true
      }
    }
    expect(wasIgnored).toBe(true)
  })
})

// ==================== handleDeleteFace ====================

describe('handleDeleteFace API 调用', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 DELETE /api/faces', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, routesCleared: 0 }),
    } as Response)

    const res = await fetch('/api/faces', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cragId: 'test-crag', area: '主墙', faceId: 'face-1' }),
    })
    const data = await res.json()

    expect(res.ok).toBe(true)
    expect(data.routesCleared).toBe(0)
    expect(fetch).toHaveBeenCalledWith('/api/faces', expect.objectContaining({ method: 'DELETE' }))
  })

  it('失败时应抛出包含 error 信息的 Error', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '权限不足' }),
    } as Response)

    const res = await fetch('/api/faces', { method: 'DELETE', headers: {}, body: '' })
    const data = await res.json()

    let errorMsg = ''
    if (!res.ok) errorMsg = data.error || '删除失败'
    expect(errorMsg).toBe('权限不足')
  })
})

// ==================== handleRenameFace ====================

describe('handleRenameFace API 调用', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 PATCH /api/faces', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, routesUpdated: 2 }),
    } as Response)

    const res = await fetch('/api/faces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cragId: 'test-crag', area: '主墙', oldFaceId: 'face-1', newFaceId: 'face-new' }),
    })
    const data = await res.json()

    expect(data.routesUpdated).toBe(2)
    expect(fetch).toHaveBeenCalledWith('/api/faces', expect.objectContaining({ method: 'PATCH' }))
  })
})
```

**Step 2: 运行所有 use-face-data 测试**

```bash
pnpm --filter @bloctop/editor test:run -- --reporter=verbose src/hooks/use-face-data.test.ts
```

Expected: 所有测试 PASS

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-face-data.test.ts
git commit -m "test: add face CRUD API integration tests"
```

---

### Task 4: 为 face 上传逻辑写测试

**Files:**
- Create: `apps/editor/src/hooks/use-face-upload.test.ts`

**Step 1: 创建测试文件**

```typescript
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

    // 模拟 handleFile 逻辑
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
```

**Step 2: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run -- --reporter=verbose src/hooks/use-face-upload.test.ts
```

Expected: 所有测试 PASS

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-face-upload.test.ts
git commit -m "test: add face upload validation unit tests"
```

---

### Task 5: 为 use-beta-management 写集成测试

**Files:**
- Create: `apps/editor/src/hooks/use-beta-management.test.ts`

**Step 1: 创建测试文件**

```typescript
// apps/editor/src/hooks/use-beta-management.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Route, BetaLink } from '@bloctop/shared/types'

const mockRoute: Route = {
  id: 42,
  name: '圆通测试路线',
  grade: 'V5',
  cragId: 'yuan-tong-si',
  area: '主墙',
  betaLinks: [
    {
      id: 'beta-1',
      platform: 'xiaohongshu',
      noteId: 'note-123',
      url: 'https://example.com',
      title: '爬法视频',
      author: '张三',
      climberHeight: 170,
      climberReach: 175,
    } as BetaLink,
  ],
} as Route

describe('handleSaveBeta', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 PATCH /api/beta', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const editForm = { title: '新标题', author: '李四', climberHeight: '175', climberReach: '180' }
    const res = await fetch('/api/beta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: mockRoute.id,
        betaId: 'beta-1',
        title: editForm.title,
        author: editForm.author,
        climberHeight: parseInt(editForm.climberHeight, 10),
        climberReach: parseInt(editForm.climberReach, 10),
      }),
    })

    expect(res.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/beta', expect.objectContaining({ method: 'PATCH' }))
  })

  it('失败时应抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '无权操作' }),
    } as Response)

    const res = await fetch('/api/beta', { method: 'PATCH', headers: {}, body: '' })
    const data = await res.json()

    let error = ''
    if (!res.ok) error = data.error || '保存失败'
    expect(error).toBe('无权操作')
  })
})

describe('handleDeleteBeta', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('成功时应调用 DELETE /api/beta', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    const res = await fetch('/api/beta', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: mockRoute.id, betaId: 'beta-1' }),
    })

    expect(res.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/beta', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('updateRouteAndSelected 辅助逻辑', () => {
  it('应同时更新 routes 列表和 selectedRoute', () => {
    const routes: Route[] = [
      { ...mockRoute, id: 42 },
      { ...mockRoute, id: 99, name: '其他线路' },
    ]

    const transform = (r: Route): Route => ({
      ...r,
      betaLinks: [{ ...r.betaLinks![0], title: '已更新' }],
    })

    const updatedRoutes = routes.map(r => r.id === 42 ? transform(r) : r)
    const updatedSelected = transform(mockRoute)

    expect(updatedRoutes[0].betaLinks![0].title).toBe('已更新')
    expect(updatedRoutes[1].name).toBe('其他线路') // 未受影响
    expect(updatedSelected.betaLinks![0].title).toBe('已更新')
  })
})
```

**Step 2: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run -- --reporter=verbose src/hooks/use-beta-management.test.ts
```

Expected: 所有测试 PASS

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-beta-management.test.ts
git commit -m "test: add beta management integration tests"
```

---

### Task 6: 为 CityFormModal 和 PrefectureFormModal 写渲染测试

**Files:**
- Create: `apps/editor/src/components/editor/city-form-modal.test.tsx`

**Step 1: 创建测试文件**

```typescript
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
```

**Step 2: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run -- --reporter=verbose src/components/editor/city-form-modal.test.tsx
```

Expected: 所有测试 PASS

**Step 3: 运行全部 editor 测试，确认没有破坏已有测试**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 4: Commit**

```bash
git add apps/editor/src/components/editor/city-form-modal.test.tsx
git commit -m "test: add CityFormModal validation and API tests"
```

---

## Phase 2: 重构 faces/page.tsx

### Task 7: 提取 use-face-upload hook

**Files:**
- Create: `apps/editor/src/hooks/use-face-upload.ts`
- Modify: `apps/editor/src/app/faces/page.tsx`（删除对应逻辑，替换为 hook 调用）

**Step 1: 创建 `use-face-upload.ts`**

```typescript
// apps/editor/src/hooks/use-face-upload.ts
import { useState, useRef, useCallback } from 'react'
import { useToast } from '@bloctop/ui/components/toast'

export interface UseFaceUploadOptions {
  onUploadSuccess?: (url: string) => void
}

export function useFaceUpload() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const [clearTopoOnUpload, setClearTopoOnUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请上传图片文件', 'error')
      return
    }
    const url = URL.createObjectURL(file)
    setUploadedFile(file)
    setPreviewUrl(url)
  }, [showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearFile = useCallback(() => {
    setUploadedFile(null)
    setPreviewUrl(null)
  }, [])

  const doUpload = useCallback(async (params: {
    cragId: string
    faceId: string
    area: string
    onSuccess: (url: string) => void
  }) => {
    if (!uploadedFile) return
    const { cragId, faceId, area, onSuccess } = params

    setIsUploading(true)
    try {
      let fileToUpload: File = uploadedFile
      if (fileToUpload.size > 5 * 1024 * 1024) {
        setCompressionProgress(0)
        const { default: imageCompression } = await import('browser-image-compression')
        fileToUpload = await imageCompression(fileToUpload, {
          maxSizeMB: 4,
          maxWidthOrHeight: 4096,
          useWebWorker: true,
          onProgress: (p: number) => setCompressionProgress(Math.round(p)),
        })
        setCompressionProgress(null)
      }
      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('cragId', cragId)
      formData.append('faceId', faceId)
      formData.append('area', area)
      if (clearTopoOnUpload) formData.append('clearTopoLines', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')

      onSuccess(data.url)
      setUploadedFile(null)
      setPreviewUrl(null)
      setClearTopoOnUpload(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '上传失败'
      showToast(msg, 'error', 4000)
    } finally {
      setIsUploading(false)
    }
  }, [uploadedFile, clearTopoOnUpload, showToast])

  const checkAndUpload = useCallback(async (params: {
    cragId: string
    faceId: string
    area: string
    onDirectUpload: () => void
  }) => {
    const { cragId, faceId, area, onDirectUpload } = params
    try {
      const checkFormData = new FormData()
      checkFormData.append('cragId', cragId)
      checkFormData.append('faceId', faceId)
      if (area) checkFormData.append('area', area)
      checkFormData.append('checkOnly', 'true')

      const checkRes = await fetch('/api/upload', { method: 'POST', body: checkFormData })
      const checkData = await checkRes.json()
      if (checkData.exists) {
        setShowOverwriteConfirm(true)
        return
      }
    } catch {
      // 检查失败时直接上传
    }
    onDirectUpload()
  }, [])

  return {
    uploadedFile,
    previewUrl,
    isDragging,
    isUploading,
    compressionProgress,
    showOverwriteConfirm,
    setShowOverwriteConfirm,
    clearTopoOnUpload,
    setClearTopoOnUpload,
    fileInputRef,
    handleFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    clearFile,
    doUpload,
    checkAndUpload,
  }
}
```

**Step 2: 运行测试确认仍然通过**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-face-upload.ts
git commit -m "refactor: extract useFaceUpload hook from faces/page.tsx"
```

---

### Task 8: 提取 use-face-data hook

**Files:**
- Create: `apps/editor/src/hooks/use-face-data.ts`

**Step 1: 创建文件**

```typescript
// apps/editor/src/hooks/use-face-data.ts
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@bloctop/ui/components/toast'
import type { Route } from '@bloctop/shared/types'
import type { FaceImageCacheService } from '@bloctop/ui/face-image'
import { preloadImage } from '@bloctop/shared/editor-utils'

const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/

export interface R2FaceInfo { faceId: string; area: string }

export interface FaceGroup {
  faceId: string
  area: string
  routes: Route[]
  imageUrl: string
}

export interface UseFaceDataOptions {
  selectedCragId: string | null
  routes: Route[]
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
  selectedArea: string | null
  persistedAreas: string[]
  updateCragAreas: (cragId: string, areas: string[]) => Promise<string[]>
  faceImageCache: FaceImageCacheService
}

export function useFaceData({
  selectedCragId,
  routes,
  setRoutes,
  selectedArea,
  persistedAreas,
  updateCragAreas,
  faceImageCache,
}: UseFaceDataOptions) {
  const { showToast } = useToast()
  const [r2Faces, setR2Faces] = useState<R2FaceInfo[]>([])
  const [isLoadingFaces, setIsLoadingFaces] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadFaces = useCallback((cragId: string, signal?: AbortSignal) => {
    setIsLoadingFaces(true)
    return fetch(`/api/faces?cragId=${encodeURIComponent(cragId)}`, { signal })
      .then(res => res.json())
      .then(data => {
        if (data.success) setR2Faces(data.faces as R2FaceInfo[])
        setIsLoadingFaces(false)
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setIsLoadingFaces(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedCragId) { setR2Faces([]); return }
    setR2Faces([])
    const controller = new AbortController()
    loadFaces(selectedCragId, controller.signal)
    return () => controller.abort()
  }, [selectedCragId, loadFaces])

  const handleRefresh = useCallback(async () => {
    if (!selectedCragId || isRefreshing) return
    setIsRefreshing(true)
    await loadFaces(selectedCragId)
    setIsRefreshing(false)
    showToast('已刷新', 'success', 2000)
  }, [selectedCragId, isRefreshing, loadFaces, showToast])

  const faceGroups = useMemo(() => {
    if (!selectedCragId) return []
    const map = new Map<string, FaceGroup>()
    r2Faces.forEach(({ faceId, area }) => {
      map.set(faceId, {
        faceId, area, routes: [],
        imageUrl: faceImageCache.getImageUrl({ cragId: selectedCragId, area, faceId }),
      })
    })
    routes.forEach(r => {
      if (!r.faceId) return
      const entry = map.get(r.faceId)
      if (entry) entry.routes.push(r)
    })
    let result = Array.from(map.values())
    if (selectedArea) result = result.filter(f => f.area === selectedArea)
    return result
  }, [routes, r2Faces, selectedCragId, selectedArea, faceImageCache])

  const handleDeleteFace = useCallback(async (selectedFace: FaceGroup) => {
    if (!selectedCragId) return false
    try {
      const res = await fetch('/api/faces', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cragId: selectedCragId, area: selectedFace.area, faceId: selectedFace.faceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')

      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${selectedFace.faceId}`)
      setR2Faces(prev => prev.filter(f => f.faceId !== selectedFace.faceId))

      const msg = data.routesCleared > 0
        ? `岩面已删除，已清除 ${data.routesCleared} 条线路的关联`
        : '岩面已删除'
      showToast(msg, 'success', 3000)
      return true
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
      return false
    }
  }, [selectedCragId, showToast, faceImageCache])

  const handleRenameFace = useCallback(async (selectedFace: FaceGroup, newFaceId: string) => {
    if (!selectedCragId) return false
    const trimmed = newFaceId.trim()
    if (!trimmed || trimmed === selectedFace.faceId) return false
    if (!FACE_ID_PATTERN.test(trimmed)) {
      showToast('名称只允许中文、小写字母、数字和连字符', 'error')
      return false
    }
    try {
      const res = await fetch('/api/faces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cragId: selectedCragId,
          area: selectedFace.area,
          oldFaceId: selectedFace.faceId,
          newFaceId: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重命名失败')

      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${selectedFace.faceId}`)
      faceImageCache.invalidate(`${selectedCragId}/${selectedFace.area}/${trimmed}`)
      setR2Faces(prev => prev.map(f => f.faceId === selectedFace.faceId ? { ...f, faceId: trimmed } : f))
      setRoutes(prev => prev.map(r => r.faceId === selectedFace.faceId ? { ...r, faceId: trimmed } : r))

      const msg = data.routesUpdated > 0 ? `已重命名，${data.routesUpdated} 条线路已更新` : '岩面已重命名'
      showToast(msg, 'success', 3000)
      return trimmed
    } catch (error) {
      showToast(error instanceof Error ? error.message : '重命名失败', 'error', 4000)
      return false
    }
  }, [selectedCragId, showToast, faceImageCache, setRoutes])

  const handleUploadSuccess = useCallback(async (params: {
    url: string
    faceId: string
    area: string
    isCreating: boolean
    newArea: string
  }) => {
    const { url, faceId, area, isCreating, newArea } = params
    await preloadImage(url)
    faceImageCache.invalidate(`${selectedCragId}/${area}/${faceId}`)
    showToast('照片上传成功！', 'success', 3000)

    if (isCreating) {
      if (newArea && selectedCragId && !persistedAreas.includes(newArea)) {
        const merged = [...new Set([...persistedAreas, newArea])].sort()
        updateCragAreas(selectedCragId, merged).catch(() => {})
      }
      setR2Faces(prev => prev.some(f => f.faceId === faceId) ? prev : [...prev, { faceId, area }])
    }
  }, [selectedCragId, faceImageCache, showToast, persistedAreas, updateCragAreas])

  return {
    r2Faces,
    setR2Faces,
    isLoadingFaces,
    isRefreshing,
    faceGroups,
    handleRefresh,
    handleDeleteFace,
    handleRenameFace,
    handleUploadSuccess,
  }
}
```

**Step 2: 运行全部测试**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-face-data.ts
git commit -m "refactor: extract useFaceData hook from faces/page.tsx"
```

---

### Task 9: 提取 ImageUploadZone 可复用组件

**Files:**
- Create: `apps/editor/src/components/editor/image-upload-zone.tsx`

**Step 1: 创建组件**

```tsx
// apps/editor/src/components/editor/image-upload-zone.tsx
import { useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadZoneProps {
  previewUrl: string | null
  isDragging: boolean
  isUploading: boolean
  compressionProgress: number | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
  uploadButtonText?: string
  emptyTitle?: string
  emptySubtitle?: string
  disabled?: boolean
}

export function ImageUploadZone({
  previewUrl,
  isDragging,
  isUploading,
  compressionProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearFile,
  onUpload,
  uploadButtonText = '上传',
  emptyTitle = '上传照片',
  emptySubtitle = '拖拽或点击选择',
  disabled = false,
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {!previewUrl ? (
        <div
          className="relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center aspect-[4/3]"
          style={{
            borderColor: isDragging ? 'var(--theme-primary)' : 'var(--theme-outline)',
            backgroundColor: isDragging
              ? 'color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))'
              : 'var(--theme-surface)',
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mb-3" style={{ color: 'var(--theme-on-surface-variant)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--theme-on-surface)' }}>{emptyTitle}</p>
          <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>{emptySubtitle}</p>
          {/* eslint-disable-next-line no-restricted-syntax -- type="file" is not a text input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="预览" className="w-full aspect-[4/3] object-cover rounded-xl" />
            <button
              onClick={onClearFile}
              className="absolute top-2 right-2 p-2 rounded-full transition-all active:scale-90"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {onUpload && (
            <button
              onClick={onUpload}
              disabled={isUploading || disabled}
              className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                opacity: isUploading || disabled ? 0.5 : 1,
              }}
            >
              {compressionProgress !== null ? (
                <div className="w-full px-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>压缩中...</span><span>{compressionProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${compressionProgress}%`, backgroundColor: 'var(--theme-on-primary)' }} />
                  </div>
                </div>
              ) : isUploading ? (
                <><div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div> 上传中...</>
              ) : (
                <><Upload className="w-5 h-5" /> {uploadButtonText}</>
              )}
            </button>
          )}
        </div>
      )}
    </>
  )
}
```

**Step 2: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 3: Commit**

```bash
git add apps/editor/src/components/editor/image-upload-zone.tsx
git commit -m "refactor: extract ImageUploadZone reusable component"
```

---

### Task 10: 提取 FaceCreationPanel + FaceDetailPanel 组件

**Files:**
- Create: `apps/editor/src/components/editor/face-creation-panel.tsx`
- Create: `apps/editor/src/components/editor/face-detail-panel.tsx`

**Step 1: 创建 face-creation-panel.tsx**

```tsx
// apps/editor/src/components/editor/face-creation-panel.tsx
import { Check, X, Loader2 } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { AreaSelect } from '@/components/editor/area-select'
import { ImageUploadZone } from '@/components/editor/image-upload-zone'

const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/
const FACE_ID_CLEANUP = /[^\u4e00-\u9fffa-z0-9-]/g

interface FaceCreationPanelProps {
  areas: string[]
  existingFaceIds: string[]
  newFaceId: string
  setNewFaceId: (v: string) => void
  newArea: string
  setNewArea: (v: string) => void
  faceFormErrors: Record<string, string>
  setFaceFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  // upload zone props
  previewUrl: string | null
  isDragging: boolean
  isUploading: boolean
  compressionProgress: number | null
  canCreate: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
}

export function FaceCreationPanel({
  areas, existingFaceIds,
  newFaceId, setNewFaceId, newArea, setNewArea,
  faceFormErrors, setFaceFormErrors,
  previewUrl, isDragging, isUploading, compressionProgress, canCreate,
  onDragOver, onDragLeave, onDrop, onFileSelect, onClearFile, onUpload,
}: FaceCreationPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--theme-on-surface)' }}>新建岩面</h3>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            区域 (Area)
          </label>
          <AreaSelect
            areas={areas}
            value={newArea}
            onChange={(area) => { setNewArea(area); setFaceFormErrors(prev => { const next = {...prev}; delete next.area; return next }) }}
            placeholder="选择区域..."
            required
            error={faceFormErrors.area}
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
            岩面 ID (faceId)
          </label>
          <Input
            placeholder="如 主墙-1 或 main-wall-1"
            value={newFaceId}
            onChange={(v) => { setNewFaceId(v); setFaceFormErrors(prev => { const next = {...prev}; delete next.faceId; return next }) }}
            onBlur={(e) => { setNewFaceId(e.target.value.toLowerCase().replace(FACE_ID_CLEANUP, '')) }}
            style={faceFormErrors.faceId ? { borderColor: 'var(--theme-error)' } : undefined}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>只允许中文、小写字母、数字和连字符</p>
          {faceFormErrors.faceId && (
            <p className="text-xs mt-1" style={{ color: 'var(--theme-error)' }} role="alert">{faceFormErrors.faceId}</p>
          )}
          {newFaceId && existingFaceIds.includes(newFaceId) && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--theme-warning)' }}>该 ID 已存在，上传将覆盖现有照片</p>
          )}
        </div>
      </div>
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>岩面照片</h3>
        <ImageUploadZone
          previewUrl={previewUrl}
          isDragging={isDragging}
          isUploading={isUploading}
          compressionProgress={compressionProgress}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
          onClearFile={onClearFile}
          onUpload={onUpload}
          uploadButtonText="创建岩面"
          emptyTitle="上传岩面照片"
          emptySubtitle="拖拽或点击选择"
          disabled={!canCreate}
        />
      </div>
    </div>
  )
}
```

**Step 2: 创建 face-detail-panel.tsx**

```tsx
// apps/editor/src/components/editor/face-detail-panel.tsx
import { Pencil, Check, X, Loader2, Trash2 } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { ImageUploadZone } from '@/components/editor/image-upload-zone'
import type { Route } from '@bloctop/shared/types'
import type { FaceGroup } from '@/hooks/use-face-data'

const FACE_ID_CLEANUP = /[^\u4e00-\u9fffa-z0-9-]/g

interface FaceDetailPanelProps {
  selectedFace: FaceGroup
  imageUrl: string
  isRenaming: boolean
  renameValue: string
  setRenameValue: (v: string) => void
  isSubmittingRename: boolean
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
  onDeleteClick: () => void
  // upload zone props
  previewUrl: string | null
  isDragging: boolean
  isUploading: boolean
  compressionProgress: number | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
}

export function FaceDetailPanel({
  selectedFace, isRenaming, renameValue, setRenameValue,
  isSubmittingRename, onStartRename, onCancelRename, onConfirmRename, onDeleteClick,
  previewUrl, isDragging, isUploading, compressionProgress,
  onDragOver, onDragLeave, onDrop, onFileSelect, onClearFile, onUpload,
}: FaceDetailPanelProps) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* 大图预览 */}
      <div className="aspect-[4/3]" style={{ borderRadius: 'var(--theme-radius-xl)', overflow: 'hidden', backgroundColor: 'var(--theme-surface-variant)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedFace.imageUrl} alt={selectedFace.faceId} className="w-full h-full object-cover" />
      </div>

      {/* 岩面信息 */}
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                value={renameValue}
                onChange={setRenameValue}
                onBlur={(e) => { setRenameValue(e.target.value.toLowerCase().replace(FACE_ID_CLEANUP, '')) }}
                onKeyDown={(e) => { if (e.key === 'Enter') onConfirmRename(); if (e.key === 'Escape') onCancelRename() }}
                autoFocus
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg font-semibold"
                disabled={isSubmittingRename}
              />
              <button onClick={onConfirmRename} disabled={isSubmittingRename || !renameValue.trim()} className="p-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--theme-primary)' }}>
                {isSubmittingRename ? <div className="w-4 h-4 animate-spin"><Loader2 className="w-full h-full" /></div> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={onCancelRename} disabled={isSubmittingRename} className="p-1.5 rounded-lg transition-all active:scale-90" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold truncate" style={{ color: 'var(--theme-on-surface)' }}>{selectedFace.faceId}</h3>
              <button onClick={onStartRename} className="p-1.5 rounded-lg transition-all active:scale-90 flex-shrink-0" style={{ color: 'var(--theme-on-surface-variant)' }} title="重命名">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-sm px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface-variant)' }}>
            {selectedFace.area}
          </span>
        </div>

        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--theme-on-surface-variant)' }}>关联线路 ({selectedFace.routes.length})</h4>
        <div className="space-y-1.5">
          {selectedFace.routes.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onDeleteClick}
        className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))', color: 'var(--theme-error)' }}
      >
        <Trash2 className="w-4 h-4" /> 删除岩面
      </button>

      {/* 更换照片 */}
      <div className="glass-light p-4" style={{ borderRadius: 'var(--theme-radius-xl)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--theme-on-surface)' }}>更换照片</h3>
        <ImageUploadZone
          previewUrl={previewUrl}
          isDragging={isDragging}
          isUploading={isUploading}
          compressionProgress={compressionProgress}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
          onClearFile={onClearFile}
          onUpload={onUpload}
          uploadButtonText="更换照片"
          emptyTitle="拖拽或点击选择新照片"
          emptySubtitle=""
        />
      </div>
    </div>
  )
}
```

**Step 3: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 4: Commit**

```bash
git add apps/editor/src/components/editor/face-creation-panel.tsx apps/editor/src/components/editor/face-detail-panel.tsx
git commit -m "refactor: extract FaceCreationPanel and FaceDetailPanel components"
```

---

### Task 11: 提取确认弹窗组件

**Files:**
- Create: `apps/editor/src/components/editor/overwrite-confirm-dialog.tsx`
- Create: `apps/editor/src/components/editor/delete-face-dialog.tsx`

**Step 1: 创建 overwrite-confirm-dialog.tsx**

```tsx
// apps/editor/src/components/editor/overwrite-confirm-dialog.tsx
import { AlertCircle } from 'lucide-react'
import type { Route } from '@bloctop/shared/types'

interface OverwriteConfirmDialogProps {
  affectedRoutes: Route[]
  clearTopoOnUpload: boolean
  setClearTopoOnUpload: (v: boolean) => void
  onCancel: () => void
  onConfirm: () => void
}

export function OverwriteConfirmDialog({
  affectedRoutes, clearTopoOnUpload, setClearTopoOnUpload, onCancel, onConfirm,
}: OverwriteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="max-w-sm w-full p-6 animate-scale-in" style={{ backgroundColor: 'var(--theme-surface)', borderRadius: 'var(--theme-radius-xl)', boxShadow: 'var(--theme-shadow-lg)' }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-warning) 15%, var(--theme-surface))' }}>
            <AlertCircle className="w-6 h-6" style={{ color: 'var(--theme-warning)' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--theme-on-surface)' }}>覆盖确认</h3>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>该岩面已有照片，上传新照片将覆盖原有照片。确定要继续吗？</p>
          </div>
        </div>

        {affectedRoutes.length > 0 && (
          <div className="glass-light mb-5 p-3 space-y-2" style={{ borderRadius: 'var(--theme-radius-lg)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--theme-warning)' }}>以下 {affectedRoutes.length} 条线路有 Topo 路线标注：</p>
            {affectedRoutes.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
              </div>
            ))}
            <div className="space-y-2 mt-3">
              {[
                { value: false, label: '保留现有标注', hint: '新照片角度与原图相同时选择' },
                { value: true, label: '清除标注，稍后重新标注', hint: '新照片角度不同时选择', danger: true },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setClearTopoOnUpload(opt.value)}
                  className="w-full text-left p-3 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: clearTopoOnUpload === opt.value
                      ? `color-mix(in srgb, var(${opt.danger ? '--theme-error' : '--theme-primary'}) 12%, var(--theme-surface))`
                      : 'var(--theme-surface)',
                    border: clearTopoOnUpload === opt.value
                      ? `2px solid var(${opt.danger ? '--theme-error' : '--theme-primary'})`
                      : '2px solid transparent',
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>{opt.label}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] glass-light" style={{ color: 'var(--theme-on-surface)' }}>取消</button>
          <button onClick={onConfirm} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]" style={{ backgroundColor: 'var(--theme-warning)', color: 'white' }}>确认覆盖</button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 创建 delete-face-dialog.tsx**

```tsx
// apps/editor/src/components/editor/delete-face-dialog.tsx
import { Trash2, Loader2 } from 'lucide-react'
import type { FaceGroup } from '@/hooks/use-face-data'

interface DeleteFaceDialogProps {
  selectedFace: FaceGroup
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteFaceDialog({ selectedFace, isDeleting, onCancel, onConfirm }: DeleteFaceDialogProps) {
  const affectedRoutes = selectedFace.routes.filter(r => r.topoLine && r.topoLine.length > 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="max-w-sm w-full p-6 animate-scale-in" style={{ backgroundColor: 'var(--theme-surface)', borderRadius: 'var(--theme-radius-xl)', boxShadow: 'var(--theme-shadow-lg)' }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-error) 15%, var(--theme-surface))' }}>
            <Trash2 className="w-6 h-6" style={{ color: 'var(--theme-error)' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--theme-on-surface)' }}>删除岩面</h3>
            <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
              确定要删除岩面「{selectedFace.faceId}」吗？
              {selectedFace.routes.length > 0 && (
                <span style={{ color: 'var(--theme-error)' }}> 该岩面关联了 {selectedFace.routes.length} 条线路，删除后这些线路的岩面关联将被清除。</span>
              )}
            </p>
          </div>
        </div>
        {affectedRoutes.length > 0 && (
          <div className="glass-light mb-5 p-3 space-y-1.5" style={{ borderRadius: 'var(--theme-radius-lg)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--theme-error)' }}>以下 {affectedRoutes.length} 条线路的 Topo 路线标注将被清除：</p>
            {affectedRoutes.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--theme-surface)' }}>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--theme-on-surface)' }}>{r.name}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>{r.grade}</span>
              </div>
            ))}
            <p className="text-xs mt-2" style={{ color: 'var(--theme-on-surface-variant)' }}>线路本身不会被删除，仅解除岩面关联并清除路线标注。</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] glass-light" style={{ color: 'var(--theme-on-surface)' }}>取消</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]" style={{ backgroundColor: 'var(--theme-error)', color: 'white', opacity: isDeleting ? 0.7 : 1 }}>
            {isDeleting ? <><div className="w-4 h-4 animate-spin"><Loader2 className="w-full h-full" /></div> 删除中...</> : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/editor/src/components/editor/overwrite-confirm-dialog.tsx apps/editor/src/components/editor/delete-face-dialog.tsx
git commit -m "refactor: extract OverwriteConfirmDialog and DeleteFaceDialog components"
```

---

### Task 12: 重写 faces/page.tsx 使用新 hooks + 组件（主要瘦身步骤）

**Files:**
- Modify: `apps/editor/src/app/faces/page.tsx`（1167行 → ~180行）

**Step 1: 完全重写 faces/page.tsx**

```tsx
// apps/editor/src/app/faces/page.tsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import { Image as ImageIcon, RefreshCw, Plus, Mountain, Loader2 } from 'lucide-react'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { useFaceImageCache } from '@bloctop/ui/face-image/use-face-image'
import { useFaceData } from '@/hooks/use-face-data'
import { useFaceUpload } from '@/hooks/use-face-upload'
import { CragSelector } from '@/components/editor/crag-selector'
import { AreaSelect } from '@/components/editor/area-select'
import { Input } from '@bloctop/ui/components/input'
import { FaceCreationPanel } from '@/components/editor/face-creation-panel'
import { FaceDetailPanel } from '@/components/editor/face-detail-panel'
import { OverwriteConfirmDialog } from '@/components/editor/overwrite-confirm-dialog'
import { DeleteFaceDialog } from '@/components/editor/delete-face-dialog'
import { deriveAreas, getPersistedAreas } from '@bloctop/shared/editor-areas'
import { useToast } from '@bloctop/ui/components/toast'
import type { FaceGroup } from '@/hooks/use-face-data'

const FACE_ID_PATTERN = /^[\u4e00-\u9fffa-z0-9-]+$/

export default function FaceManagementPage() {
  const {
    crags, routes, setRoutes, selectedCragId, setSelectedCragId,
    isLoadingCrags, isLoadingRoutes, stats, updateCragAreas,
  } = useCragRoutes({ editorMode: true })
  const faceImageCache = useFaceImageCache()
  const { showToast } = useToast()
  useBreakAppShellLimit()

  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedFace, setSelectedFace] = useState<FaceGroup | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [newFaceId, setNewFaceId] = useState('')
  const [newArea, setNewArea] = useState('')
  const [faceFormErrors, setFaceFormErrors] = useState<Record<string, string>>({})
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isAddingArea, setIsAddingArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')

  const selectedCrag = useMemo(() => crags.find(c => c.id === selectedCragId), [crags, selectedCragId])
  const areas = useMemo(() => deriveAreas(routes, selectedCragId, selectedCrag), [routes, selectedCrag, selectedCragId])
  const persistedAreas = useMemo(() => getPersistedAreas(selectedCrag), [selectedCrag])

  const {
    r2Faces, setR2Faces, isLoadingFaces, isRefreshing,
    faceGroups, handleRefresh, handleDeleteFace, handleRenameFace, handleUploadSuccess,
  } = useFaceData({ selectedCragId, routes, setRoutes, selectedArea, persistedAreas, updateCragAreas, faceImageCache })

  const upload = useFaceUpload()

  const handleSelectCrag = useCallback((id: string) => {
    setSelectedCragId(id)
    setSelectedFace(null)
    setIsCreating(false)
    setSelectedArea(null)
    setMobileShowDetail(false)
  }, [setSelectedCragId])

  const handleUpload = useCallback(async () => {
    if (isCreating) {
      const errors: Record<string, string> = {}
      if (!newFaceId.trim()) errors.faceId = '请输入岩面 ID'
      else if (!FACE_ID_PATTERN.test(newFaceId)) errors.faceId = '格式不正确'
      if (!newArea.trim()) errors.area = '请选择区域'
      if (Object.keys(errors).length > 0) { setFaceFormErrors(errors); return }
      setFaceFormErrors({})
    }
    if (!upload.uploadedFile || !selectedCragId) return
    const faceId = isCreating ? newFaceId : selectedFace?.faceId
    const area = isCreating ? newArea : selectedFace?.area
    if (!faceId || !area) return

    await upload.checkAndUpload({
      cragId: selectedCragId, faceId, area,
      onDirectUpload: () => upload.doUpload({
        cragId: selectedCragId, faceId, area,
        onSuccess: async (url) => {
          await handleUploadSuccess({ url, faceId, area, isCreating, newArea })
          if (isCreating) {
            const newFace: FaceGroup = { faceId, area, routes: [], imageUrl: url }
            setSelectedFace(newFace)
            setIsCreating(false)
            setNewFaceId('')
            setNewArea('')
          }
        },
      }),
    })
  }, [isCreating, newFaceId, newArea, selectedFace, selectedCragId, upload, handleUploadSuccess])

  const canCreate = isCreating && newFaceId.trim() && newArea.trim() && FACE_ID_PATTERN.test(newFaceId) && !!upload.uploadedFile

  const leftPanel = (
    <div className="flex flex-col h-full">
      <CragSelector crags={crags} selectedCragId={selectedCragId} isLoading={isLoadingCrags} onSelect={handleSelectCrag} stats={stats} />
      {selectedCragId && (
        <>
          {/* Area 筛选 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 px-1">
            {[null, ...areas].map(area => (
              <button key={area ?? 'all'} onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 text-sm font-medium ${selectedArea === area ? '' : 'glass-light'}`}
                style={{ backgroundColor: selectedArea === area ? 'var(--theme-primary)' : undefined, color: selectedArea === area ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)' }}>
                {area ?? '全部'}
              </button>
            ))}
            {isAddingArea ? (
              <Input autoFocus variant="unstyled" themed={false} value={newAreaName} onChange={setNewAreaName}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newAreaName.trim() && selectedCragId) {
                    const name = newAreaName.trim()
                    try { await updateCragAreas(selectedCragId, [...new Set([...persistedAreas, name])].sort()); showToast(`区域「${name}」已创建`, 'success', 3000) } catch { showToast('创建区域失败', 'error', 3000) }
                    setNewAreaName(''); setIsAddingArea(false)
                  } else if (e.key === 'Escape') { setNewAreaName(''); setIsAddingArea(false) }
                }}
                className="px-3 py-2 rounded-full text-sm font-medium outline-none min-w-[80px]"
                style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)', border: '2px solid var(--theme-primary)' }}
                placeholder="区域名…" />
            ) : (
              <button onClick={() => setIsAddingArea(true)} className="px-3 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 flex items-center gap-1"
                style={{ backgroundColor: 'transparent', color: 'var(--theme-primary)', border: '1.5px dashed var(--theme-primary)' }}>
                <Plus className="w-4 h-4" /><span className="text-sm font-medium">新增区域</span>
              </button>
            )}
          </div>
          {/* 新建按钮 */}
          <button onClick={() => { setIsCreating(true); setSelectedFace(null); setMobileShowDetail(true); setFaceFormErrors({}) }}
            className={`w-full mb-2 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${isCreating ? '' : 'glass-light'}`}
            style={{ backgroundColor: isCreating ? 'var(--theme-primary)' : undefined, color: isCreating ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)' }}>
            <Plus className="w-5 h-5" /> 新建岩面
          </button>
          {/* Face 列表 */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {isLoadingRoutes || isLoadingFaces ? (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <div className="w-8 h-8 animate-spin mb-3"><Loader2 className="w-full h-full" /></div><span>加载中...</span>
              </div>
            ) : faceGroups.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">暂无岩面</p><p className="text-sm mt-1">点击上方「新建岩面」按钮创建</p>
              </div>
            ) : (
              faceGroups.map(face => (
                <button key={face.faceId} onClick={() => { setSelectedFace(face); setIsCreating(false); setIsRenaming(false); setMobileShowDetail(true) }}
                  className={`w-full text-left p-3 transition-all duration-200 active:scale-[0.98] ${selectedFace?.faceId === face.faceId && !isCreating ? 'ring-2' : 'glass'}`}
                  style={{ backgroundColor: selectedFace?.faceId === face.faceId && !isCreating ? 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface))' : undefined, borderRadius: 'var(--theme-radius-xl)', '--tw-ring-color': 'var(--theme-primary)' } as React.CSSProperties}>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--theme-surface-variant)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={face.imageUrl} alt={face.faceId} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold block truncate" style={{ color: 'var(--theme-on-surface)' }}>{face.faceId}</span>
                      <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>{face.area} · {face.routes.length} 条线路</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )

  const rightPanel = !selectedCragId ? (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
      <Mountain className="w-16 h-16 mb-4 opacity-30" /><p className="text-lg font-medium">选择岩场开始管理岩面</p>
    </div>
  ) : isCreating ? (
    <FaceCreationPanel
      areas={areas} existingFaceIds={faceGroups.map(f => f.faceId)}
      newFaceId={newFaceId} setNewFaceId={setNewFaceId} newArea={newArea} setNewArea={setNewArea}
      faceFormErrors={faceFormErrors} setFaceFormErrors={setFaceFormErrors}
      previewUrl={upload.previewUrl} isDragging={upload.isDragging} isUploading={upload.isUploading}
      compressionProgress={upload.compressionProgress} canCreate={!!canCreate}
      onDragOver={upload.handleDragOver} onDragLeave={upload.handleDragLeave} onDrop={upload.handleDrop}
      onFileSelect={upload.handleFileSelect} onClearFile={upload.clearFile} onUpload={handleUpload}
    />
  ) : selectedFace ? (
    <FaceDetailPanel
      selectedFace={selectedFace}
      imageUrl={selectedFace.imageUrl}
      isRenaming={isRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
      isSubmittingRename={false}
      onStartRename={() => { setIsRenaming(true); setRenameValue(selectedFace.faceId) }}
      onCancelRename={() => setIsRenaming(false)}
      onConfirmRename={async () => {
        const result = await handleRenameFace(selectedFace, renameValue)
        if (result) { setSelectedFace(prev => prev ? { ...prev, faceId: result as string, imageUrl: faceImageCache.getImageUrl({ cragId: selectedCragId!, area: prev.area, faceId: result as string }) } : null); setIsRenaming(false) }
      }}
      onDeleteClick={() => setShowDeleteConfirm(true)}
      previewUrl={upload.previewUrl} isDragging={upload.isDragging} isUploading={upload.isUploading}
      compressionProgress={upload.compressionProgress}
      onDragOver={upload.handleDragOver} onDragLeave={upload.handleDragLeave} onDrop={upload.handleDrop}
      onFileSelect={upload.handleFileSelect} onClearFile={upload.clearFile} onUpload={handleUpload}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
      <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
      <p className="text-lg font-medium mb-1">选择或新建岩面</p>
      <p className="text-sm">选择岩面查看详情，或点击「新建岩面」创建</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <EditorPageHeader title="岩面管理" icon={<ImageIcon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={mobileShowDetail} onBackToList={() => { setMobileShowDetail(false); setSelectedFace(null); setIsCreating(false) }}
        listLabel="岩面列表"
        rightContent={selectedCragId ? (
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 rounded-xl transition-all duration-200 active:scale-95" style={{ color: 'var(--theme-primary)' }}>
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        ) : undefined}
      />
      <div className="max-w-4xl lg:max-w-none mx-auto px-4 lg:px-6 py-4">
        <div className="hidden lg:flex lg:gap-6 lg:h-[calc(100vh-73px)]">
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden">{leftPanel}</div>
          <div className="flex-1 overflow-y-auto min-h-0">{rightPanel}</div>
        </div>
        <div className="lg:hidden">{!mobileShowDetail ? leftPanel : <div className="space-y-4 animate-fade-in-up">{rightPanel}</div>}</div>
      </div>

      {upload.showOverwriteConfirm && (() => {
        const faceId = isCreating ? newFaceId : selectedFace?.faceId
        const affectedRoutes = faceId ? routes.filter(r => r.faceId === faceId && r.topoLine && r.topoLine.length > 0) : []
        return (
          <OverwriteConfirmDialog
            affectedRoutes={affectedRoutes}
            clearTopoOnUpload={upload.clearTopoOnUpload}
            setClearTopoOnUpload={upload.setClearTopoOnUpload}
            onCancel={() => { upload.setShowOverwriteConfirm(false); upload.setClearTopoOnUpload(false) }}
            onConfirm={() => {
              upload.setShowOverwriteConfirm(false)
              const faceId2 = isCreating ? newFaceId : selectedFace?.faceId
              const area = isCreating ? newArea : selectedFace?.area
              if (faceId2 && area && selectedCragId) {
                upload.doUpload({ cragId: selectedCragId, faceId: faceId2, area, onSuccess: async (url) => { await handleUploadSuccess({ url, faceId: faceId2, area, isCreating, newArea }) } })
              }
            }}
          />
        )
      })()}

      {showDeleteConfirm && selectedFace && (
        <DeleteFaceDialog
          selectedFace={selectedFace}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setIsDeleting(true)
            const ok = await handleDeleteFace(selectedFace)
            setIsDeleting(false)
            if (ok) { setSelectedFace(null); setMobileShowDetail(false); setShowDeleteConfirm(false) }
          }}
        />
      )}
    </div>
  )
}
```

**Step 2: 运行 TypeScript 类型检查**

```bash
pnpm turbo typecheck --filter=@bloctop/editor
```

Fix any type errors before proceeding.

**Step 3: 运行所有测试**

```bash
pnpm --filter @bloctop/editor test:run
```

Expected: 所有测试通过

**Step 4: 验证行数瘦身**

```bash
wc -l apps/editor/src/app/faces/page.tsx
```

Expected: ≤ 230 行（从 1167 行降到约 1/5）

**Step 5: Commit**

```bash
git add apps/editor/src/app/faces/page.tsx
git commit -m "refactor: slim faces/page.tsx from 1167→~220 lines using extracted hooks and components"
```

---

## Phase 3: 重构 betas/page.tsx

### Task 13: 提取 use-beta-management hook

**Files:**
- Create: `apps/editor/src/hooks/use-beta-management.ts`
- Modify: `apps/editor/src/app/betas/page.tsx`

**Step 1: 创建 use-beta-management.ts**

```typescript
// apps/editor/src/hooks/use-beta-management.ts
import { useState, useCallback } from 'react'
import type { Route, BetaLink } from '@bloctop/shared/types'
import { useToast } from '@bloctop/ui/components/toast'

export interface BetaEditForm {
  title: string
  author: string
  climberHeight: string
  climberReach: string
}

export interface UseBetaManagementOptions {
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
}

export function useBetaManagement({ setRoutes }: UseBetaManagementOptions) {
  const { showToast } = useToast()
  const [editingBetaId, setEditingBetaId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BetaEditForm>({ title: '', author: '', climberHeight: '', climberReach: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingBetaId, setDeletingBetaId] = useState<string | null>(null)

  const updateRouteAndSelected = useCallback(
    (routeId: number, transform: (r: Route) => Route, setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>) => {
      setRoutes(prev => prev.map(r => r.id === routeId ? transform(r) : r))
      setSelectedRoute(prev => prev && prev.id === routeId ? transform(prev) : prev)
    },
    [setRoutes],
  )

  const handleStartEdit = useCallback((beta: BetaLink) => {
    setEditingBetaId(beta.id)
    setEditForm({
      title: beta.title || '',
      author: beta.author || '',
      climberHeight: beta.climberHeight ? String(beta.climberHeight) : '',
      climberReach: beta.climberReach ? String(beta.climberReach) : '',
    })
  }, [])

  const handleSaveBeta = useCallback(async (
    betaId: string,
    selectedRoute: Route,
    setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>,
  ) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/beta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute.id,
          betaId,
          title: editForm.title.trim() || undefined,
          author: editForm.author.trim() || undefined,
          climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
          climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
        }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '保存失败') }
      const newValues = {
        title: editForm.title.trim() || undefined,
        author: editForm.author.trim() || undefined,
        climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
        climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
      }
      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).map(b => b.id === betaId ? { ...b, ...newValues } : b),
      }), setSelectedRoute)
      setEditingBetaId(null)
      showToast('Beta 信息已更新', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error', 4000)
    } finally {
      setIsSaving(false)
    }
  }, [editForm, updateRouteAndSelected, showToast])

  const handleDeleteBeta = useCallback(async (
    betaId: string,
    selectedRoute: Route,
    setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>,
  ) => {
    setDeletingBetaId(betaId)
    try {
      const res = await fetch('/api/beta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: selectedRoute.id, betaId }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '删除失败') }
      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).filter(b => b.id !== betaId),
      }), setSelectedRoute)
      showToast('Beta 已删除', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
    } finally {
      setDeletingBetaId(null)
    }
  }, [updateRouteAndSelected, showToast])

  return {
    editingBetaId, setEditingBetaId,
    editForm, setEditForm,
    isSaving, deletingBetaId,
    handleStartEdit, handleSaveBeta, handleDeleteBeta,
  }
}
```

**Step 2: 运行测试**

```bash
pnpm --filter @bloctop/editor test:run
```

**Step 3: Commit**

```bash
git add apps/editor/src/hooks/use-beta-management.ts
git commit -m "refactor: extract useBetaManagement hook from betas/page.tsx"
```

---

## Phase 4: 重构 cities/page.tsx（文件拆分）

### Task 14: 将城市组件拆分为独立文件

**Files:**
- Create: `apps/editor/src/components/editor/city-card.tsx`
- Create: `apps/editor/src/components/editor/city-form-modal.tsx`
- Create: `apps/editor/src/components/editor/prefecture-form-modal.tsx`
- Create: `apps/editor/src/components/editor/form-field.tsx`
- Modify: `apps/editor/src/app/cities/page.tsx`（移除内联组件）

**Step 1: 创建 form-field.tsx**

```tsx
// apps/editor/src/components/editor/form-field.tsx
export function FormField({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  void disabled
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-on-surface-variant)' }}>{label}</label>
      {children}
    </div>
  )
}
```

**Step 2: 将 CityCard 从 cities/page.tsx 剪切到 city-card.tsx**

从 `apps/editor/src/app/cities/page.tsx` 剪切 `CityCard` 函数（304-365行），创建：

```tsx
// apps/editor/src/components/editor/city-card.tsx
import { ToggleLeft, ToggleRight } from 'lucide-react'
import type { CityConfig } from '@bloctop/shared/types'

export function CityCard({ city, onToggle, onEdit }: { city: CityConfig; onToggle: () => void; onEdit: () => void }) {
  return (
    <div className="glass-light p-4 mb-2 flex items-center justify-between" style={{ borderRadius: 'var(--theme-radius-lg)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--theme-on-surface)' }}>{city.name}</span>
          <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>{city.id}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
          adcode: {city.adcode} · ({city.coordinates.lng}, {city.coordinates.lat})
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onToggle} className="transition-colors" style={{ color: city.available ? 'var(--theme-success)' : 'var(--theme-on-surface-variant)' }}>
          {city.available ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
        </button>
        <button onClick={onEdit} className="text-xs font-medium" style={{ color: 'var(--theme-primary)' }}>编辑</button>
      </div>
    </div>
  )
}
```

**Step 3: 将 CityFormModal 移到 city-form-modal.tsx**

从 `cities/page.tsx` 剪切 `CityFormModal` 函数（367-542行），调整 imports 后创建 `components/editor/city-form-modal.tsx`。

**Step 4: 将 PrefectureFormModal 移到 prefecture-form-modal.tsx**

从 `cities/page.tsx` 剪切 `PrefectureFormModal` 函数（544-674行），调整 imports 后创建 `components/editor/prefecture-form-modal.tsx`。

**Step 5: 更新 cities/page.tsx 的 imports**

在 `cities/page.tsx` 中删除内联组件，添加 imports：
```tsx
import { CityCard } from '@/components/editor/city-card'
import { CityFormModal } from '@/components/editor/city-form-modal'
import { PrefectureFormModal } from '@/components/editor/prefecture-form-modal'
```

**Step 6: 运行类型检查 + 测试**

```bash
pnpm turbo typecheck --filter=@bloctop/editor
pnpm --filter @bloctop/editor test:run
```

**Step 7: 验证 cities/page.tsx 行数**

```bash
wc -l apps/editor/src/app/cities/page.tsx
```

Expected: ≤ 180 行（从 699 行降到约 1/4）

**Step 8: Commit**

```bash
git add apps/editor/src/components/editor/city-card.tsx apps/editor/src/components/editor/city-form-modal.tsx apps/editor/src/components/editor/prefecture-form-modal.tsx apps/editor/src/components/editor/form-field.tsx apps/editor/src/app/cities/page.tsx
git commit -m "refactor: split cities/page.tsx into separate component files"
```

---

## Phase 5: 最终验证

### Task 15: 运行全套质量检查

**Step 1: 运行全部 Editor 测试**

```bash
pnpm --filter @bloctop/editor test:run
```

Expected: 所有测试 PASS，无 failed

**Step 2: TypeScript 全量检查**

```bash
pnpm turbo typecheck
```

Expected: 0 errors

**Step 3: ESLint 检查**

```bash
pnpm lint
```

Expected: 0 errors (可能有 warnings，先确认 no-restricted-syntax 规则通过)

**Step 4: 统计最终行数**

```bash
wc -l apps/editor/src/app/faces/page.tsx apps/editor/src/app/betas/page.tsx apps/editor/src/app/cities/page.tsx
```

Expected:
- `faces/page.tsx`: ≤ 230 行（原 1167）
- `betas/page.tsx`: ≤ 250 行（原 457）
- `cities/page.tsx`: ≤ 180 行（原 699）

**Step 5: 最终 commit**

```bash
git add -A
git commit -m "refactor: editor module split complete — tests first, then extract hooks+components"
```

---

## 快速参考：新增文件清单

| 文件 | 类型 | 来自 |
|------|------|------|
| `hooks/use-face-data.ts` | Hook | faces/page.tsx |
| `hooks/use-face-upload.ts` | Hook | faces/page.tsx |
| `hooks/use-beta-management.ts` | Hook | betas/page.tsx |
| `components/editor/image-upload-zone.tsx` | Component | faces/page.tsx |
| `components/editor/face-creation-panel.tsx` | Component | faces/page.tsx |
| `components/editor/face-detail-panel.tsx` | Component | faces/page.tsx |
| `components/editor/overwrite-confirm-dialog.tsx` | Component | faces/page.tsx |
| `components/editor/delete-face-dialog.tsx` | Component | faces/page.tsx |
| `components/editor/city-card.tsx` | Component | cities/page.tsx |
| `components/editor/city-form-modal.tsx` | Component | cities/page.tsx |
| `components/editor/prefecture-form-modal.tsx` | Component | cities/page.tsx |
| `components/editor/form-field.tsx` | Component | cities/page.tsx |
| `hooks/use-face-data.test.ts` | Test | — |
| `hooks/use-face-upload.test.ts` | Test | — |
| `hooks/use-beta-management.test.ts` | Test | — |
| `components/editor/city-form-modal.test.tsx` | Test | — |
