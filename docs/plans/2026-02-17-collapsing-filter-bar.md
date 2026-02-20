# Collapsing Filter Bar + Search Collapse

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route page filter bar collapses into a single-line glass summary when the user scrolls, and the floating search bar shrinks into a circle button — freeing ~100px of vertical space for route cards.

**Architecture:** IntersectionObserver watches a 1px sentinel at the top of the scrollable `<main>`. When the sentinel exits the scroll container, `isCollapsed` flips to `true`, driving CSS transitions on three elements: (1) expanded filter bar fades/collapses via `max-height`+`opacity`, (2) a new `CollapsedFilterSummary` fades/expands in its place, (3) `FloatingSearchInput` animates `width` from full to 48px. Clicking the collapsed summary scrolls to top, naturally restoring the expanded state.

**Tech Stack:** React (useState, useEffect, useRef, useCallback), IntersectionObserver, CSS transitions (max-height, opacity, width), Tailwind CSS

---

## Background

The Route page (`apps/pwa/src/app/[locale]/route/route-client.tsx`) uses a fixed-shell layout:

```
<div className="flex flex-col h-dvh overflow-hidden">
  <RouteFilterBar />                    ← flex-shrink-0, ~140-180px
  <div className="flex flex-1 min-h-0">
    <GradeBar width=48 />              ← fixed left sidebar
    <main overflow-y-auto>             ← THIS scrolls
      ...route cards...
    </main>
  </div>
</div>
<FloatingSearchInput />                 ← fixed bottom-20
<AppTabbar />                           ← fixed bottom-0
```

**Reference pattern:** `crag-detail-client.tsx:65-76` uses IntersectionObserver (threshold 0, viewport root) to toggle a mini-nav. Our pattern is similar but uses the `<main>` element as IO root (since page uses inner scroll, not document scroll).

**Key constraint:** `desktop-center-padded` class (used by FloatingSearchInput) applies `transform: translateX(-50%)` on desktop (≥768px). The collapse animation must not conflict with this transform.

---

## Task 1: Create `CollapsedFilterSummary` component

**Files:**
- Create: `apps/pwa/src/components/collapsed-filter-summary.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { ArrowUpDown } from 'lucide-react'
import type { SortDirection } from '@/lib/filter-constants'

interface CollapsedFilterSummaryProps {
  selectedCragName: string | null
  selectedFaceName: string | null
  gradeRangeLabel: string | null
  sortDirection: SortDirection
  onToggleSort: () => void
  filteredCount: number
  onExpand: () => void
}

/**
 * 折叠态筛选摘要条
 *
 * 当用户滚动线路列表时，RouteFilterBar 折叠，
 * 此组件以一行 glass-md 摘要替代，显示当前活跃筛选状态。
 * 点击芯片区域 → onExpand 滚回顶部恢复展开态。
 */
export function CollapsedFilterSummary({
  selectedCragName,
  selectedFaceName,
  gradeRangeLabel,
  sortDirection,
  onToggleSort,
  filteredCount,
  onExpand,
}: CollapsedFilterSummaryProps) {
  // 至少有一个活跃筛选才显示 chips
  const hasAnyFilter = selectedCragName || selectedFaceName || gradeRangeLabel

  return (
    <div
      className="flex items-center gap-2 glass-md px-4 h-11"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        // safe-area 加到 h-11 基础上
        height: 'calc(2.75rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* 筛选信息 chips — 点击展开 */}
      <button
        onClick={onExpand}
        className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-hide"
      >
        {hasAnyFilter ? (
          <>
            {selectedCragName && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {selectedCragName}
              </span>
            )}
            {selectedFaceName && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0 truncate max-w-20"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                  color: 'var(--theme-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {selectedFaceName}
              </span>
            )}
            {gradeRangeLabel && (
              <span
                className="px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
                  color: 'var(--theme-primary)',
                  borderRadius: 'var(--theme-radius-full)',
                }}
              >
                {gradeRangeLabel}
              </span>
            )}
          </>
        ) : (
          <span
            className="text-xs"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {filteredCount} 条线路
          </span>
        )}
      </button>

      {/* 排序按钮 — 直接操作，不展开 */}
      <button
        onClick={onToggleSort}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors active:scale-90"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
      </button>

      {/* 线路数量 */}
      <span
        className="flex-shrink-0 text-xs tabular-nums"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        {filteredCount}
      </span>
    </div>
  )
}
```

**Step 2: Type check**

```bash
pnpm turbo typecheck
```

Expected: All packages pass.

**Step 3: Commit**

```bash
git add apps/pwa/src/components/collapsed-filter-summary.tsx
git commit -m "feat: add CollapsedFilterSummary component for route filter bar"
```

---

## Task 2: Add scroll detection + collapse state to route-client.tsx

**Files:**
- Modify: `apps/pwa/src/app/[locale]/route/route-client.tsx`

This task adds:
1. `isCollapsed` state
2. `mainRef` on the scrollable `<main>` element
3. A sentinel `<div>` at the top of `<main>`
4. IntersectionObserver with `root: mainRef.current`
5. `handleExpand` callback that scrolls to top

**Step 1: Add imports and refs**

At the top of `RouteListClient`, after existing state declarations (after line 43), add:

```tsx
// 折叠状态 — 由 IntersectionObserver 驱动
const [isCollapsed, setIsCollapsed] = useState(false)
const mainRef = useRef<HTMLElement>(null)
const sentinelRef = useRef<HTMLDivElement>(null)
```

Add `useRef` to the React import on line 2 (already imported).

**Step 2: Add IntersectionObserver effect**

After the `hasInitialRender` effect (after line 43), add:

```tsx
// 检测滚动 → 折叠/展开 filter bar
useEffect(() => {
  const sentinel = sentinelRef.current
  const scrollRoot = mainRef.current
  if (!sentinel || !scrollRoot) return

  const observer = new IntersectionObserver(
    ([entry]) => setIsCollapsed(!entry.isIntersecting),
    { root: scrollRoot, threshold: 0 }
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}, [])
```

**Step 3: Add handleExpand callback**

After `handleClearAllFilters` (after line 178), add:

```tsx
// 展开 filter bar — 滚回顶部，IO 自动检测 sentinel 恢复展开
const handleExpand = useCallback(() => {
  mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
}, [])
```

**Step 4: Add `ref` to main element and sentinel**

Change line 308 (`<main>`) to add ref:

```tsx
<main
  ref={mainRef}
  className="flex-1 overflow-y-auto px-4 pb-36"
  ...
>
  {/* Sentinel — IO 检测滚动状态 */}
  <div ref={sentinelRef} className="h-px -mb-px" aria-hidden />
  <div className="space-y-2">
    ...existing route cards...
  </div>
```

**Step 5: Type check**

```bash
pnpm turbo typecheck
```

**Step 6: Commit**

```bash
git add apps/pwa/src/app/[locale]/route/route-client.tsx
git commit -m "feat: add scroll-driven collapse state for route filter bar"
```

---

## Task 3: Wire collapse animations into route-client.tsx

**Files:**
- Modify: `apps/pwa/src/app/[locale]/route/route-client.tsx`

This task wraps RouteFilterBar and CollapsedFilterSummary in animated containers.

**Step 1: Import CollapsedFilterSummary**

Add to imports:

```tsx
import { CollapsedFilterSummary } from '@/components/collapsed-filter-summary'
```

**Step 2: Compute collapsed summary props**

After `activeFilterTags` useMemo (around line 229), add:

```tsx
// 折叠态摘要信息
const selectedCragName = useMemo(() => {
  if (!selectedCrag) return null
  return cityFilteredCrags.find(c => c.id === selectedCrag)?.name || null
}, [selectedCrag, cityFilteredCrags])

const gradeRangeLabel = useMemo(() => {
  if (selectedGrades.length === 0) return null
  const sorted = [...selectedGrades].sort((a, b) => compareGrades(a, b))
  return selectedGrades.length <= 2
    ? sorted.join(', ')
    : `${sorted[0]}–${sorted[sorted.length - 1]}`
}, [selectedGrades])
```

**Step 3: Replace filter bar section in JSX**

Replace the current RouteFilterBar block (lines 272-290) with:

```tsx
{/* 折叠态摘要 */}
<div
  className="flex-shrink-0 overflow-hidden"
  style={{
    maxHeight: isCollapsed ? 60 : 0,
    opacity: isCollapsed ? 1 : 0,
    transition: 'max-height 300ms ease, opacity 200ms ease',
  }}
>
  <CollapsedFilterSummary
    selectedCragName={selectedCragName}
    selectedFaceName={selectedFace}
    gradeRangeLabel={gradeRangeLabel}
    sortDirection={sortDirection}
    onToggleSort={toggleSortDirection}
    filteredCount={filteredRoutes.length}
    onExpand={handleExpand}
  />
</div>

{/* 展开态 filter bar */}
<div
  className="overflow-hidden"
  style={{
    maxHeight: isCollapsed ? 0 : 500,
    opacity: isCollapsed ? 0 : 1,
    transition: 'max-height 300ms ease, opacity 200ms ease',
  }}
>
  <RouteFilterBar
    crags={cityFilteredCrags}
    selectedCrag={selectedCrag}
    onCragSelect={handleCragSelect}
    selectedFace={selectedFace}
    onFaceSelect={handleFaceSelect}
    sortDirection={sortDirection}
    onToggleSort={toggleSortDirection}
    filteredCount={filteredRoutes.length}
    activeFilterTags={activeFilterTags}
    allLabel={tCommon('all')}
    totalCountLabel={t('totalCount', { count: filteredRoutes.length })}
    sortAscLabel={t('sortAsc')}
    sortDescLabel={t('sortDesc')}
    sortAscHint={t('sortAscHint')}
    sortDescHint={t('sortDescHint')}
    faceHintLabel={t('faceHint')}
  />
</div>
```

> **Note:** `maxHeight: 500` is a generous upper bound; the actual filter bar is ~140-200px. CSS `max-height` transition needs a fixed value (not `auto`). 500px ensures no clipping even with area chips + face thumbnails + filter tags.

**Step 4: Type check**

```bash
pnpm turbo typecheck
```

**Step 5: Commit**

```bash
git add apps/pwa/src/app/[locale]/route/route-client.tsx
git commit -m "feat: wire collapse animations for route filter bar"
```

---

## Task 4: Modify FloatingSearchInput for collapse animation

**Files:**
- Modify: `apps/pwa/src/components/floating-search-input.tsx`

The search bar animates from full-width capsule to 48px glass circle on collapse. The `desktop-center-padded` class uses `transform: translateX(-50%)` on desktop, which conflicts with width animation. Solution: apply `desktop-center-padded` only in expanded state, and use explicit positioning in collapsed state.

**Step 1: Add `isCollapsed` and `onExpandClick` props**

```tsx
interface FloatingSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isCollapsed?: boolean
  onExpandClick?: () => void
}

export function FloatingSearchInput({
  value,
  onChange,
  placeholder = '搜索线路名、区域或首攀者...',
  isCollapsed = false,
  onExpandClick,
}: FloatingSearchInputProps) {
```

**Step 2: Replace the entire return JSX**

```tsx
  const inputRef = useRef<HTMLInputElement>(null)

  // 收缩态点击 → 展开搜索
  const handleCollapsedClick = () => {
    onExpandClick?.()
  }

  return (
    <div
      className={`fixed bottom-20 z-40 ${isCollapsed ? '' : 'desktop-center-padded'}`}
      style={{
        left: 16,
        // 展开: right=16 撑满; 收缩: right=auto, width=48
        ...(isCollapsed
          ? { width: 48, right: undefined }
          : { right: 16, width: undefined }),
        transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="relative flex items-center glass-md"
        style={{
          height: 48,
          borderRadius: 'var(--theme-radius-full)',
          transition: 'var(--theme-transition)',
          cursor: isCollapsed ? 'pointer' : undefined,
        }}
        onClick={isCollapsed ? handleCollapsedClick : undefined}
      >
        <Search
          className="absolute left-3 w-5 h-5 pointer-events-none"
          style={{
            color: 'var(--theme-on-surface-variant)',
            // 收缩时图标居中: left: (48 - 20) / 2 = 14px ≈ left-3.5
            left: isCollapsed ? 14 : 16,
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* 输入框 + 清除按钮 — 收缩时隐藏 */}
        <div
          style={{
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? 'none' : undefined,
            transition: 'opacity 150ms ease',
          }}
          className="w-full h-full"
        >
          <Input
            ref={inputRef}
            variant="unstyled"
            themed={false}
            value={value}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                inputRef.current?.blur()
              }
            }}
            placeholder={placeholder}
            className="w-full h-full bg-transparent pl-12 pr-10 text-sm outline-none"
            style={{ color: 'var(--theme-on-surface)' }}
          />
          {value && (
            <button
              onClick={() => { onChange(''); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ backgroundColor: 'var(--theme-on-surface-variant)' }}
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--theme-surface)' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
```

> **Design note:** When collapsed, the `width: 48` + `height: 48` + `border-radius: full` creates a perfect circle. The Search icon centers via explicit `left: 14px`. The input and clear button fade out instantly (150ms) so they don't clip during the width animation (300ms).

**Step 3: Type check**

```bash
pnpm turbo typecheck
```

**Step 4: Commit**

```bash
git add apps/pwa/src/components/floating-search-input.tsx
git commit -m "feat: add collapse animation to FloatingSearchInput"
```

---

## Task 5: Pass collapse state to FloatingSearchInput

**Files:**
- Modify: `apps/pwa/src/app/[locale]/route/route-client.tsx`

**Step 1: Update FloatingSearchInput usage**

Find the FloatingSearchInput in the JSX (around line 394) and add props:

```tsx
{/* 悬浮搜索框 */}
<FloatingSearchInput
  value={searchQuery}
  onChange={handleSearchChange}
  placeholder={tSearch('placeholder')}
  isCollapsed={isCollapsed}
  onExpandClick={handleExpand}
/>
```

**Step 2: Type check**

```bash
pnpm turbo typecheck
```

**Step 3: Commit**

```bash
git add apps/pwa/src/app/[locale]/route/route-client.tsx
git commit -m "feat: pass collapse state to FloatingSearchInput in route page"
```

---

## Task 6: Type check + ship

**Step 1:** Run full type check:

```bash
pnpm turbo typecheck
```

Expected: All 4 packages pass.

**Step 2:** Test manually on mobile (or Chrome DevTools mobile emulation):

- [ ] Route page loads with filter bar expanded
- [ ] Scroll down → filter bar collapses into glass-md summary
- [ ] Collapsed summary shows: selected crag, face, grade range
- [ ] Sort button in summary works (toggles sort direction)
- [ ] Click chips area in summary → scrolls to top → filter bar expands
- [ ] Search bar shrinks to 48px circle on scroll
- [ ] Click search circle → scrolls to top → search bar expands
- [ ] Left grade selector stays visible in both states
- [ ] Desktop: layout still works (centered shell)
- [ ] Safe area (iOS notch) handled in both states

**Step 3:** Ship

```bash
# /ship "feat: collapsing filter bar and search animation on route page"
```

---

## Rollback

Each task is one commit. `git revert <hash>` reverts a single component without affecting others. The components are additive (CollapsedFilterSummary is new, FloatingSearchInput changes are backward-compatible via default props).

## Edge Cases to Watch

1. **No filters active**: Collapsed summary shows only the count ("24 条线路")
2. **Long crag/face names**: Chips use `truncate` + `max-w-20` to prevent overflow
3. **Filter change while collapsed**: Filter state updates are driven by URL params, which work independently of collapse state. The collapsed summary reactively reflects the current URL state.
4. **Desktop width**: `desktop-center-padded` is conditionally applied only when search is expanded, avoiding transform conflict with width animation.
5. **Rapid scroll up/down**: IntersectionObserver fires synchronously with React state; CSS transitions handle the visual smoothing without JS coordination.
