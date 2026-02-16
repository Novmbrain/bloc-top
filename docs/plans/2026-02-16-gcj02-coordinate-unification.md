# GCJ-02 坐标统一化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 统一使用 GCJ-02 火星坐标系存储和显示，移除 WGS-84 转换层，改进编辑器坐标输入为单行粘贴模式。

**Architecture:** 将 `coordinate-utils.ts` 从两个 app 的重复文件合并到 `packages/shared/src/coordinate-utils.ts`，删除所有 WGS-84↔GCJ-02 转换函数，新增 `parseCoordinateInput()` 解析高德拾取器粘贴格式。Editor 和 PWA 改为从 `@bloctop/shared/coordinate-utils` 导入。

**Tech Stack:** TypeScript, Vitest, Next.js App Router, Turborepo monorepo

---

## 背景

当前坐标体系混乱：
- **设计意图**: DB 存 WGS-84，渲染时转 GCJ-02
- **实际情况**: Editor 岩场页**无转换**直接存，城市页**有转换**
- **决策**: 统一存 GCJ-02，因为输入源(高德拾取器)和渲染目标(高德地图)都是 GCJ-02

---

### Task 1: 创建 shared coordinate-utils 模块 (含测试)

**Files:**
- Create: `packages/shared/src/coordinate-utils.ts`
- Create: `packages/shared/src/coordinate-utils.test.ts`
- Modify: `packages/shared/package.json` (添加 exports)

**Step 1: Write the tests**

Create `packages/shared/src/coordinate-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseCoordinateInput,
  validateCoordinates,
  truncateCoordinates,
  formatCoordinate,
} from './coordinate-utils'

describe('coordinate-utils', () => {
  describe('parseCoordinateInput', () => {
    it('should parse comma-separated "lng,lat"', () => {
      const result = parseCoordinateInput('119.306239,26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should parse with space after comma "lng, lat"', () => {
      const result = parseCoordinateInput('119.306239, 26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should parse space-separated "lng lat"', () => {
      const result = parseCoordinateInput('119.306239 26.063477')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should trim whitespace', () => {
      const result = parseCoordinateInput('  119.306239, 26.063477  ')
      expect(result).toEqual({ lng: 119.306239, lat: 26.063477 })
    })

    it('should return null for empty string', () => {
      expect(parseCoordinateInput('')).toBeNull()
      expect(parseCoordinateInput('  ')).toBeNull()
    })

    it('should return null for single number', () => {
      expect(parseCoordinateInput('119.306239')).toBeNull()
    })

    it('should return null for non-numeric input', () => {
      expect(parseCoordinateInput('abc,def')).toBeNull()
    })

    it('should return null for too many values', () => {
      expect(parseCoordinateInput('119.3,26.0,100')).toBeNull()
    })
  })

  describe('validateCoordinates', () => {
    it('should accept valid Chinese coordinates', () => {
      const result = validateCoordinates({ lng: 119.549, lat: 26.489 })
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject NaN values', () => {
      const result = validateCoordinates({ lng: NaN, lat: 26.489 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('有效数字')
    })

    it('should reject out-of-range longitude', () => {
      const result = validateCoordinates({ lng: 200, lat: 26.489 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('经度')
    })

    it('should reject out-of-range latitude', () => {
      const result = validateCoordinates({ lng: 119.549, lat: -100 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('纬度')
    })

    it('should warn for coordinates outside China', () => {
      const result = validateCoordinates({ lng: 2.3522, lat: 48.8566 })
      expect(result.valid).toBe(true)
      expect(result.error).toContain('中国范围')
    })
  })

  describe('truncateCoordinates', () => {
    it('should truncate to 6 decimal places by default', () => {
      const result = truncateCoordinates({ lng: 119.52508494257924, lat: 26.47524770432985 })
      expect(result.lng).toBe(119.525085)
      expect(result.lat).toBe(26.475248)
    })

    it('should truncate to specified precision', () => {
      const result = truncateCoordinates({ lng: 119.52508494, lat: 26.47524770 }, 3)
      expect(result.lng).toBe(119.525)
      expect(result.lat).toBe(26.475)
    })
  })

  describe('formatCoordinate', () => {
    it('should format to 6 decimal places by default', () => {
      expect(formatCoordinate(119.55)).toBe('119.550000')
    })

    it('should format to specified precision', () => {
      expect(formatCoordinate(119.5501, 3)).toBe('119.550')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @bloctop/shared test:run -- coordinate-utils`
Expected: FAIL — module not found

**Step 3: Implement coordinate-utils**

Create `packages/shared/src/coordinate-utils.ts`:

```typescript
/**
 * 坐标工具函数
 *
 * DB 统一存储 GCJ-02 (火星坐标系)。
 * 高德地图 JS API 和高德坐标拾取器均使用 GCJ-02，无需转换。
 */

import type { Coordinates } from './types/index'

// ==================== 常量 ====================

/** 默认精度：6 位小数 ≈ 0.11m */
const DEFAULT_PRECISION = 6

// ==================== 解析 ====================

/**
 * 解析坐标粘贴输入
 *
 * 支持高德坐标拾取器的默认格式及常见变体：
 * - "119.306239,26.063477"  (逗号分隔)
 * - "119.306239, 26.063477" (逗号+空格)
 * - "119.306239 26.063477"  (空格分隔)
 *
 * @returns 解析后的坐标，或 null (格式无效)
 */
export function parseCoordinateInput(input: string): Coordinates | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // 尝试按逗号分隔，再按空格分隔
  const parts = trimmed.includes(',')
    ? trimmed.split(',').map((s) => s.trim())
    : trimmed.split(/\s+/)

  if (parts.length !== 2) return null

  const lng = parseFloat(parts[0])
  const lat = parseFloat(parts[1])

  if (isNaN(lng) || isNaN(lat)) return null

  return { lng, lat }
}

// ==================== 精度控制 ====================

/**
 * 截断坐标精度到指定小数位
 *
 * 6 位小数 ≈ 0.11m，完全满足 POI 定位需求。
 */
export function truncateCoordinates(coords: Coordinates, precision = DEFAULT_PRECISION): Coordinates {
  const factor = Math.pow(10, precision)
  return {
    lng: Math.round(coords.lng * factor) / factor,
    lat: Math.round(coords.lat * factor) / factor,
  }
}

/**
 * 格式化坐标为显示字符串
 *
 * 高德拾取器格式: "lng,lat"
 */
export function formatCoordinateDisplay(coords: Coordinates, precision = DEFAULT_PRECISION): string {
  return `${coords.lng.toFixed(precision)},${coords.lat.toFixed(precision)}`
}

/**
 * 格式化单个坐标值为字符串
 */
export function formatCoordinate(value: number, precision = DEFAULT_PRECISION): string {
  return value.toFixed(precision)
}

// ==================== 验证 ====================

interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 验证坐标合法性
 *
 * 检查：有效数字、合理范围（中国大致范围）
 */
export function validateCoordinates(coords: Coordinates): ValidationResult {
  if (isNaN(coords.lng) || isNaN(coords.lat)) {
    return { valid: false, error: '坐标值必须是有效数字' }
  }

  if (coords.lng < -180 || coords.lng > 180) {
    return { valid: false, error: '经度范围应在 -180 到 180 之间' }
  }

  if (coords.lat < -90 || coords.lat > 90) {
    return { valid: false, error: '纬度范围应在 -90 到 90 之间' }
  }

  // 中国大致范围警告（不阻止，只提示）
  if (coords.lng < 72.004 || coords.lng > 137.8347 || coords.lat < 0.8293 || coords.lat > 55.8271) {
    return { valid: true, error: '坐标不在中国范围内' }
  }

  return { valid: true }
}
```

**Step 4: Add export to shared package.json**

In `packages/shared/package.json`, add to `exports`:
```json
"./coordinate-utils": "./src/coordinate-utils.ts",
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @bloctop/shared test:run -- coordinate-utils`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/shared/src/coordinate-utils.ts packages/shared/src/coordinate-utils.test.ts packages/shared/package.json
git commit -m "feat: add shared coordinate-utils with parseCoordinateInput for GCJ-02"
```

---

### Task 2: 删除旧 coordinate-utils 文件并更新导入

**Files:**
- Delete: `apps/pwa/src/lib/coordinate-utils.ts`
- Delete: `apps/pwa/src/lib/coordinate-utils.test.ts`
- Delete: `apps/editor/src/lib/coordinate-utils.ts`
- Modify: `apps/pwa/src/components/amap-container.tsx:6,44,99`

**Step 1: Update amap-container.tsx — remove conversion**

In `apps/pwa/src/components/amap-container.tsx`:

1. Remove import line 6: `import { wgs84ToGcj02 } from '@/lib/coordinate-utils'`
2. Remove line 44: `const gcj02Center = wgs84ToGcj02(center)` → use `center` directly
3. Replace all `gcj02Center` references with `center` (lines 66, 74, 99-100, 149, 156, 162)
4. Remove the approachPaths conversion (line 99): `const gcj = wgs84ToGcj02(p)` → use `p` directly
5. Remove the "DB 存 WGS-84" comment on line 43

The map center and marker now use `center` (which is already GCJ-02 from DB).
The approachPaths use `p` directly (points are already GCJ-02).

**Step 2: Delete old files**

```bash
rm apps/pwa/src/lib/coordinate-utils.ts
rm apps/pwa/src/lib/coordinate-utils.test.ts
rm apps/editor/src/lib/coordinate-utils.ts
```

**Step 3: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: PASS — no remaining imports of deleted files (cities page import will be fixed in Task 3)

> Note: If cities page causes typecheck failure, proceed to Task 3 immediately.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove WGS-84 conversion, use GCJ-02 coordinates directly"
```

---

### Task 3: 改造 Editor 城市坐标输入

**Files:**
- Modify: `apps/editor/src/app/cities/page.tsx`

**Step 1: Replace coordinate input in CityFormDrawer**

In `apps/editor/src/app/cities/page.tsx`:

1. Replace import (line 19):
   - OLD: `import { gcj02ToWgs84, truncateCoordinates } from '@/lib/coordinate-utils'`
   - NEW: `import { parseCoordinateInput, truncateCoordinates, formatCoordinateDisplay } from '@bloctop/shared/coordinate-utils'`

2. Replace state variables (lines 387-389):
   - OLD: `const [lng, setLng] = useState(...)` + `const [lat, setLat] = useState(...)` + `const [coordSystem, setCoordSystem] = useState(...)`
   - NEW: `const [coordinateInput, setCoordinateInput] = useState(city ? formatCoordinateDisplay(city.coordinates) : '')`

3. Replace save logic (lines 403-408):
   - OLD: parse lng/lat separately, conditionally convert
   - NEW:
   ```typescript
   const coords = parseCoordinateInput(coordinateInput)
   if (!coords) {
     showToast('坐标格式无效，请从高德拾取器粘贴', 'error')
     return
   }
   const truncated = truncateCoordinates(coords)
   ```
   Use `truncated` in payload.

4. Replace form UI (lines 481-531):
   - Remove the 坐标系选择 buttons (WGS-84/GCJ-02 toggle)
   - Remove the two separate lng/lat number inputs
   - Replace with single text input:
   ```tsx
   <FormField label="坐标 (GCJ-02)">
     <Input
       value={coordinateInput}
       onChange={setCoordinateInput}
       placeholder="119.306239,26.063477"
     />
     <p className="text-[11px] mt-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
       从<a href="https://lbs.amap.com/tools/picker" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--theme-primary)' }}>高德坐标拾取器</a>复制坐标粘贴
     </p>
   </FormField>
   ```

5. Update the city list display (line 339):
   - Keep as-is: `({city.coordinates.lng}, {city.coordinates.lat})` — this is read-only display

**Step 2: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/editor/src/app/cities/page.tsx
git commit -m "refactor: simplify city coordinate input to single-line GCJ-02 paste"
```

---

### Task 4: 改造 Editor 岩场坐标输入

**Files:**
- Modify: `apps/editor/src/app/crags/[id]/page.tsx`

**Step 1: Update EditForm type and helpers**

In `apps/editor/src/app/crags/[id]/page.tsx`:

1. Add import:
   ```typescript
   import { parseCoordinateInput, formatCoordinateDisplay } from '@bloctop/shared/coordinate-utils'
   ```

2. Change `EditForm` interface (lines 27-35):
   - OLD: `lng: string` + `lat: string`
   - NEW: `coordinateInput: string`

3. Update `cragToForm` (lines 37-47):
   - OLD: `lng: crag.coordinates?.lng?.toString() ?? ''` + `lat: ...`
   - NEW: `coordinateInput: crag.coordinates ? formatCoordinateDisplay(crag.coordinates) : ''`

4. Update `handleSave` coordinate handling (lines 180-192):
   - OLD: parse lng/lat separately
   - NEW:
   ```typescript
   const newCoords = editForm.coordinateInput.trim()
     ? parseCoordinateInput(editForm.coordinateInput)
     : null
   const origCoords = crag.coordinates ?? null

   if (newCoords !== null) {
     if (origCoords === null || newCoords.lng !== origCoords.lng || newCoords.lat !== origCoords.lat) {
       updates.coordinates = newCoords
     }
   } else if (editForm.coordinateInput.trim() === '' && origCoords !== null) {
     updates.coordinates = null
   }
   ```

**Step 2: Update the coordinate form UI**

Replace the coordinate section (lines 394-434) with:

```tsx
{/* Coordinates */}
<div className="space-y-1">
  <label
    className="text-xs font-medium flex items-center gap-1"
    style={{ color: 'var(--theme-on-surface-variant)' }}
  >
    <Navigation className="w-3 h-3" />
    坐标 (GCJ-02)
  </label>
  <Input
    value={editForm.coordinateInput}
    onChange={(value) => updateField('coordinateInput', value)}
    placeholder="119.306239,26.063477"
  />
  <p
    className="text-[11px]"
    style={{ color: 'var(--theme-on-surface-variant)' }}
  >
    从<a
      href="https://lbs.amap.com/tools/picker"
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
      style={{ color: 'var(--theme-primary)' }}
    >高德坐标拾取器</a>复制坐标粘贴，留空则清除坐标
  </p>
</div>
```

**Step 3: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/editor/src/app/crags/[id]/page.tsx
git commit -m "refactor: simplify crag coordinate input to single-line GCJ-02 paste"
```

---

### Task 5: 全量验证 + 文档更新

**Files:**
- Modify: `CLAUDE.md` (更新坐标相关说明)

**Step 1: Run full test suite**

```bash
pnpm --filter @bloctop/shared test:run
pnpm --filter @bloctop/pwa test:run
pnpm turbo typecheck
```

Expected: ALL PASS

**Step 2: Update CLAUDE.md**

在 CLAUDE.md 中搜索 "WGS-84" 和 "GCJ-02" 相关描述，更新为：
- `coordinate-utils.ts` 现在在 `packages/shared/src/`，不再包含坐标转换函数
- DB 存储坐标系从 WGS-84 改为 GCJ-02
- `amap-container.tsx` 不再做坐标转换

**Step 3: Commit and prepare for PR**

```bash
git add CLAUDE.md
git commit -m "docs: update coordinate system documentation to reflect GCJ-02 unification"
```

---

## Summary of changes

| Area | Before | After |
|------|--------|-------|
| DB 坐标系 | WGS-84 (设计) / 混合 (实际) | GCJ-02 统一 |
| PWA 地图渲染 | `wgs84ToGcj02()` 转换 | 直接使用 |
| Editor 岩场输入 | 两个 number input | 单行粘贴 |
| Editor 城市输入 | 两个 number input + 坐标系选择 | 单行粘贴 |
| coordinate-utils | 两份重复文件 (PWA + Editor) | 一份在 shared |
| 转换函数 | `wgs84ToGcj02` + `gcj02ToWgs84` | 删除 |
| 新增函数 | - | `parseCoordinateInput` + `formatCoordinateDisplay` |
