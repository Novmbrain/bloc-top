# Route Legend Panel 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用线路图例面板替代眼睛切换按钮，为同岩面多线路提供直觉化的图例导航与完全联动切换。

**Architecture:** 新建 `RouteLegendPanel` 纯展示组件，放在 topo 图与详情区之间。所有状态保持在 `RouteDetailDrawer` 内部（`showAllOverlay` 替代 `showOtherRoutes`），通过已有的 `onRouteChange` 回调链实现完全联动。智能默认逻辑：≤3 条线路默认全部显示，>3 条仅显示焦点线路。

**Tech Stack:** React 18 + TypeScript + next-intl + Tailwind CSS + CSS variables + Vitest + Testing Library

**Design doc:** `doc/design/ROUTE_LEGEND_PANEL.md`

---

## Task 1: Create RouteLegendPanel component

**Files:**
- Create: `src/components/route-legend-panel.tsx`
- Test: `src/components/route-legend-panel.test.tsx`

### Step 1: Write the failing tests

```tsx
// src/components/route-legend-panel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { RouteLegendPanel } from './route-legend-panel'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'

const topoLine = [{ x: 0, y: 0 }, { x: 1, y: 1 }]

const twoRoutes: MultiTopoRoute[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', topoLine },
  { id: 2, name: '飞燕走壁', grade: 'V5', topoLine },
]

const fourRoutes: MultiTopoRoute[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', topoLine },
  { id: 2, name: '飞燕走壁', grade: 'V5', topoLine },
  { id: 3, name: '小石头', grade: 'V2', topoLine },
  { id: 4, name: '大力士', grade: 'V7', topoLine },
]

describe('RouteLegendPanel', () => {
  const defaultProps = {
    routes: twoRoutes,
    selectedRouteId: 1,
    onRouteSelect: vi.fn(),
    showAllOverlay: false,
    onToggleShowAll: vi.fn(),
  }

  describe('渲染', () => {
    it('应渲染所有线路名称', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.getByText('猴子捞月')).toBeInTheDocument()
      expect(screen.getByText('飞燕走壁')).toBeInTheDocument()
    })

    it('应渲染所有线路的难度等级', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.getByText('V3')).toBeInTheDocument()
      expect(screen.getByText('V5')).toBeInTheDocument()
    })

    it('≤3 条线路时不应显示 showAll toggle', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.queryByText('showAllRoutes')).not.toBeInTheDocument()
      expect(screen.queryByText('showCurrentOnly')).not.toBeInTheDocument()
    })
  })

  describe('>3 条线路时的 toggle', () => {
    it('showAllOverlay=false 时应显示 showAllRoutes 按钮', () => {
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          showAllOverlay={false}
        />
      )
      expect(screen.getByText('showAllRoutes')).toBeInTheDocument()
    })

    it('showAllOverlay=true 时应显示 showCurrentOnly 按钮', () => {
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          showAllOverlay={true}
        />
      )
      expect(screen.getByText('showCurrentOnly')).toBeInTheDocument()
    })

    it('点击 toggle 按钮应调用 onToggleShowAll', () => {
      const onToggleShowAll = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          onToggleShowAll={onToggleShowAll}
        />
      )
      fireEvent.click(screen.getByText('showAllRoutes'))
      expect(onToggleShowAll).toHaveBeenCalledOnce()
    })
  })

  describe('交互', () => {
    it('点击非焦点线路应调用 onRouteSelect', () => {
      const onRouteSelect = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          onRouteSelect={onRouteSelect}
        />
      )
      fireEvent.click(screen.getByText('飞燕走壁'))
      expect(onRouteSelect).toHaveBeenCalledWith(2)
    })

    it('点击焦点线路不应调用 onRouteSelect', () => {
      const onRouteSelect = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          onRouteSelect={onRouteSelect}
        />
      )
      fireEvent.click(screen.getByText('猴子捞月'))
      expect(onRouteSelect).not.toHaveBeenCalled()
    })
  })
})
```

### Step 2: Run tests to verify they fail

Run: `npx vitest run src/components/route-legend-panel.test.tsx`
Expected: FAIL — module `./route-legend-panel` not found

### Step 3: Implement RouteLegendPanel

```tsx
// src/components/route-legend-panel.tsx
'use client'

import { useTranslations } from 'next-intl'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'
import { getGradeColor } from '@/lib/tokens'

/** 智能默认阈值：超过此数量的线路默认不叠加显示 */
const SMART_DEFAULT_THRESHOLD = 3

interface RouteLegendPanelProps {
  /** 同岩面所有有效线路 */
  routes: MultiTopoRoute[]
  /** 当前焦点线路 ID */
  selectedRouteId: number
  /** 线路切换回调 */
  onRouteSelect: (routeId: number) => void
  /** 是否显示所有叠加线路（用于 >3 条时的 toggle） */
  showAllOverlay: boolean
  /** 切换显示所有叠加线路 */
  onToggleShowAll: () => void
}

export function RouteLegendPanel({
  routes,
  selectedRouteId,
  onRouteSelect,
  showAllOverlay,
  onToggleShowAll,
}: RouteLegendPanelProps) {
  const t = useTranslations('RouteDetail')
  const showToggle = routes.length > SMART_DEFAULT_THRESHOLD

  return (
    <div
      className="mb-3 overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-surface-variant)',
        borderRadius: 'var(--theme-radius-lg)',
      }}
    >
      <div className="max-h-[200px] overflow-y-auto">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId
          const color = getGradeColor(route.grade)

          return (
            <button
              key={route.id}
              className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--theme-primary) 8%, transparent)'
                  : undefined,
              }}
              onClick={() => {
                if (!isSelected) onRouteSelect(route.id)
              }}
            >
              {/* 颜色圆点 */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isSelected ? color : 'transparent',
                  border: isSelected ? 'none' : `2px solid ${color}`,
                  opacity: isSelected ? 1 : 0.6,
                }}
              />

              {/* 难度 badge */}
              <span
                className="text-xs shrink-0"
                style={{
                  color,
                  fontWeight: isSelected ? 700 : 500,
                  opacity: isSelected ? 1 : 0.6,
                }}
              >
                {route.grade}
              </span>

              {/* 线路名 */}
              <span
                className="text-sm truncate"
                style={{
                  color: isSelected
                    ? 'var(--theme-on-surface)'
                    : 'var(--theme-on-surface-variant)',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {route.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Toggle: 显示全部 / 仅看当前 (>3 条时) */}
      {showToggle && (
        <button
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors duration-200"
          style={{
            borderTop: '1px solid var(--theme-outline-variant)',
            color: 'var(--theme-primary)',
          }}
          onClick={onToggleShowAll}
        >
          {showAllOverlay ? t('showCurrentOnly') : t('showAllRoutes')}
        </button>
      )}
    </div>
  )
}
```

### Step 4: Run tests to verify they pass

Run: `npx vitest run src/components/route-legend-panel.test.tsx`
Expected: ALL PASS (8 tests)

### Step 5: Commit

```bash
git add src/components/route-legend-panel.tsx src/components/route-legend-panel.test.tsx
git commit -m "feat: add RouteLegendPanel component with tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update i18n translations

**Files:**
- Modify: `messages/zh.json:97-98`
- Modify: `messages/en.json:97-98`
- Modify: `messages/fr.json:97-98`

### Step 1: Update Chinese translations

In `messages/zh.json`, inside the `"RouteDetail"` namespace:
- Replace `"showOtherRoutes"` and `"hideOtherRoutes"` with new keys

```json
"showAllRoutes": "显示全部",
"showCurrentOnly": "仅看当前",
"sameFaceRoutes": "同面线路"
```

### Step 2: Update English translations

In `messages/en.json`, inside the `"RouteDetail"` namespace:
- Same replacement

```json
"showAllRoutes": "Show all",
"showCurrentOnly": "Current only",
"sameFaceRoutes": "Routes on this face"
```

### Step 3: Update French translations

In `messages/fr.json`, inside the `"RouteDetail"` namespace:

```json
"showAllRoutes": "Tout afficher",
"showCurrentOnly": "Actuelle uniquement",
"sameFaceRoutes": "Voies sur cette face"
```

### Step 4: Commit

```bash
git add messages/zh.json messages/en.json messages/fr.json
git commit -m "i18n: add legend panel translations, remove old eye button keys

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Integrate RouteLegendPanel into RouteDetailDrawer

**Files:**
- Modify: `src/components/route-detail-drawer.tsx`

This is the main integration task. Changes are:

1. Remove `Eye`, `EyeOff` from lucide-react import
2. Replace `showOtherRoutes` state → `showAllOverlay` + smart default logic
3. Remove eye button from drawer topo area (lines 237-256)
4. Remove eye button from fullscreen viewer topSlot (lines 469-483)
5. Insert `<RouteLegendPanel>` between topo image and route info
6. Adjust `useMultiLineMode` logic

### Step 1: Update imports

In `src/components/route-detail-drawer.tsx`:

Remove `Eye, EyeOff` from the lucide-react import (line 7):
```tsx
// Before:
import { MapPin, User, Wrench, Video, ImageIcon, ZoomIn, Eye, EyeOff } from 'lucide-react'

// After:
import { MapPin, User, Wrench, Video, ImageIcon, ZoomIn } from 'lucide-react'
```

Add import for RouteLegendPanel:
```tsx
import { RouteLegendPanel } from '@/components/route-legend-panel'
```

### Step 2: Replace state logic

Replace `showOtherRoutes` state and `useMultiLineMode` logic:

```tsx
// Before (line 66):
const [showOtherRoutes, setShowOtherRoutes] = useState(true)

// After:
const [showAllOverlay, setShowAllOverlay] = useState(false)

// Before (line 104):
const useMultiLineMode = hasMultiLines && showOtherRoutes

// After:
const shouldShowAllByDefault = validSiblingRoutes.length <= 3
const effectiveShowAll = shouldShowAllByDefault || showAllOverlay
const useMultiLineMode = hasMultiLines && effectiveShowAll
```

### Step 3: Remove eye button from drawer topo area

Delete the entire eye button block (lines 237-256):
```tsx
// DELETE this entire block:
{!imageLoading && hasMultiLines && (
  <button
    className="absolute top-3 right-3 ..."
    ...
  >
    {showOtherRoutes ? <Eye .../> : <EyeOff .../>}
    ...
  </button>
)}
```

### Step 4: Remove eye button from fullscreen viewer topSlot

In the `ImageViewer` topSlot prop (around line 469-483), remove the eye button:
```tsx
// Before:
topSlot={
  <div className="absolute top-12 left-4 right-4 z-10 flex items-start justify-between">
    <ContextualHint ... />
    {hasMultiLines && (
      <button ...>
        {showOtherRoutes ? <Eye .../> : <EyeOff .../>}
        ...
      </button>
    )}
  </div>
}

// After:
topSlot={
  <div className="absolute top-12 left-4 right-4 z-10 flex items-start justify-between">
    <ContextualHint ... />
  </div>
}
```

### Step 5: Insert RouteLegendPanel between topo image and route info

After the topo image `</div>` (end of the image area, around line 270) and before the route info `<div className="mb-4">` (line 273):

```tsx
{/* 同面线路图例面板 */}
{hasMultiLines && (
  <RouteLegendPanel
    routes={validSiblingRoutes}
    selectedRouteId={route.id}
    onRouteSelect={handleRouteSelect}
    showAllOverlay={showAllOverlay}
    onToggleShowAll={() => setShowAllOverlay(prev => !prev)}
  />
)}
```

### Step 6: Run type check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 7: Run ESLint

Run: `npx eslint src/components/route-detail-drawer.tsx`
Expected: No errors

### Step 8: Commit

```bash
git add src/components/route-detail-drawer.tsx
git commit -m "refactor: replace eye toggle with RouteLegendPanel in drawer

- Remove Eye/EyeOff button from drawer and fullscreen viewer
- Add RouteLegendPanel between topo image and route details
- Replace showOtherRoutes with showAllOverlay + smart defaults
- Routes ≤3: default show all overlay; >3: show only focus

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update existing tests

**Files:**
- Modify: `src/components/route-detail-drawer.test.tsx`

### Step 1: Add RouteLegendPanel mock

Add a mock for the new component alongside existing mocks (after line 16):

```tsx
vi.mock('@/components/route-legend-panel', () => ({
  RouteLegendPanel: ({ routes, selectedRouteId, onRouteSelect }: {
    routes: { id: number; name: string }[]
    selectedRouteId: number
    onRouteSelect: (id: number) => void
  }) => (
    <div data-testid="route-legend-panel">
      {routes.map(r => (
        <button key={r.id} onClick={() => onRouteSelect(r.id)}>
          {r.name}
        </button>
      ))}
    </div>
  ),
}))
```

### Step 2: Update the MultiTopoLineOverlay test

The existing test "有多条同岩面兄弟线路时应渲染 MultiTopoLineOverlay" (line 295) should continue to work because with 2 sibling routes (≤3), `effectiveShowAll` defaults to `true`, so `useMultiLineMode` remains `true`. Verify this test still passes.

### Step 3: Add test for legend panel rendering

Add a new test in the "Topo 线路叠加" describe block:

```tsx
it('有多条同岩面线路时应渲染 RouteLegendPanel', async () => {
  const siblingRoutes: Route[] = [
    mockRouteWithTopo,
    { ...mockRouteWithTopo, id: 11, name: '银河', grade: 'V6' },
  ]

  render(
    <RouteDetailDrawer
      {...defaultProps}
      route={mockRouteWithTopo}
      siblingRoutes={siblingRoutes}
    />
  )

  expect(screen.getByTestId('route-legend-panel')).toBeInTheDocument()
})

it('单线路时不应渲染 RouteLegendPanel', () => {
  render(
    <RouteDetailDrawer
      {...defaultProps}
      route={mockRouteWithTopo}
    />
  )

  expect(screen.queryByTestId('route-legend-panel')).not.toBeInTheDocument()
})
```

### Step 4: Run all tests

Run: `npx vitest run src/components/route-detail-drawer.test.tsx src/components/route-legend-panel.test.tsx`
Expected: ALL PASS

### Step 5: Commit

```bash
git add src/components/route-detail-drawer.test.tsx
git commit -m "test: update drawer tests for legend panel integration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Full verification

### Step 1: Run complete test suite

Run: `npx vitest run`
Expected: ALL PASS

### Step 2: Run ESLint on all changed files

Run: `npx eslint src/components/route-legend-panel.tsx src/components/route-detail-drawer.tsx`
Expected: No errors

### Step 3: Run TypeScript check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 4: Verify no unused imports

Check that `Eye` and `EyeOff` are not imported anywhere in `route-detail-drawer.tsx`.

Check that old translation keys `showOtherRoutes` / `hideOtherRoutes` are not referenced in the modified files (they remain in editor which is out of scope).

### Step 5: Final commit (if any fixes needed)

Only if previous steps revealed issues that needed fixing.
