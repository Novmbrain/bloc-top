# Route Filter UX & Performance Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix perceived slowness when filtering routes by face/wall — add loading feedback, optimistic UI, and caching.

**Architecture:** Five targeted fixes across 3 files. A1-A3 fix user perception (loading states + optimistic selection). B1-B2 reduce actual latency (API response caching + image preloading). No new dependencies — uses existing patterns and a simple in-memory `Map` cache.

**Tech Stack:** React 19 (useTransition, useOptimistic), Next.js App Router (URL-driven state), Tailwind CSS

---

## Task 1: A1 — Fix skeleton display when switching crags

**Files:**
- Modify: `packages/ui/src/face-image/face-thumbnail-strip.tsx:184`

**Problem:** Skeleton only shows when `loading && allFaceGroups.length === 0`. When switching between crags, old faces are still in memory so `allFaceGroups.length > 0` — skeleton never appears.

**Step 1: Fix the skeleton condition**

In `face-thumbnail-strip.tsx`, change line 184 from:

```tsx
if (loading && allFaceGroups.length === 0) {
```

to:

```tsx
if (loading) {
```

This ensures skeleton shows **every time** a new crag's face list is being fetched, not just on first load.

**Step 2: Verify locally**

Run: `pnpm --filter @bloctop/pwa dev`

1. Open `/route` page
2. Select a crag → see face thumbnails load
3. Switch to another crag → should see skeleton strip briefly
4. Switch back → should see skeleton again (no cached response yet)

**Step 3: Commit**

```bash
git add packages/ui/src/face-image/face-thumbnail-strip.tsx
git commit -m "fix: show skeleton when switching crags in face thumbnail strip"
```

---

## Task 2: A2 — Add isPending feedback for filter transitions

**Files:**
- Modify: `apps/pwa/src/app/[locale]/route/route-client.tsx:32, 273-290`
- Modify: `apps/pwa/src/components/route-filter-bar.tsx:14-51, 52-139`

**Problem:** `useTransition`'s `isPending` is discarded (`const [, startTransition]`). No visual feedback while URL filter updates are in flight.

**Step 1: Capture isPending in route-client.tsx**

Change line 32 from:

```tsx
const [, startTransition] = useTransition()
```

to:

```tsx
const [isPending, startTransition] = useTransition()
```

**Step 2: Pass isPending to RouteFilterBar**

In route-client.tsx, add `isPending` prop to the `<RouteFilterBar>` call (around line 273):

```tsx
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
  isPending={isPending}
  allLabel={tCommon('all')}
  totalCountLabel={t('totalCount', { count: filteredRoutes.length })}
  sortAscLabel={t('sortAsc')}
  sortDescLabel={t('sortDesc')}
  sortAscHint={t('sortAscHint')}
  sortDescHint={t('sortDescHint')}
  faceHintLabel={t('faceHint')}
/>
```

**Step 3: Add isPending to RouteFilterBar interface and apply visual feedback**

In `route-filter-bar.tsx`, add `isPending` to the interface (around line 14):

```tsx
interface RouteFilterBarProps {
  crags: Crag[]
  selectedCrag: string
  onCragSelect: (cragId: string) => void
  selectedFace: string | null
  onFaceSelect: (faceId: string | null) => void
  sortDirection: SortDirection
  onToggleSort: () => void
  filteredCount: number
  activeFilterTags: FilterTag[]
  isPending?: boolean
  // i18n
  allLabel: string
  totalCountLabel: string
  sortAscLabel: string
  sortDescLabel: string
  sortAscHint: string
  sortDescHint: string
  faceHintLabel: string
}
```

Add `isPending = false` to the destructuring (around line 34):

```tsx
export function RouteFilterBar({
  crags,
  selectedCrag,
  onCragSelect,
  selectedFace,
  onFaceSelect,
  sortDirection,
  onToggleSort,
  filteredCount,
  activeFilterTags,
  isPending = false,
  allLabel,
  // ...rest
}: RouteFilterBarProps) {
```

**Step 4: Apply opacity transition to the route list during pending state**

In `route-client.tsx`, wrap the route list `<main>` element (around line 308) with a pending style:

```tsx
<main
  className="flex-1 overflow-y-auto px-4 pb-36"
  style={{
    opacity: isPending ? 0.6 : 1,
    transition: 'opacity 150ms ease',
    pointerEvents: isPending ? 'none' : undefined,
  }}
>
```

This gives users a clear visual cue that filtering is in progress — the list dims slightly and becomes non-interactive until the URL transition completes.

**Step 5: Type check**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 6: Verify locally**

1. Open `/route` page, select a crag
2. Click a face thumbnail → route list should briefly dim (opacity 0.6) then snap to filtered results
3. Click a grade filter → same dimming behavior

**Step 7: Commit**

```bash
git add apps/pwa/src/app/[locale]/route/route-client.tsx apps/pwa/src/components/route-filter-bar.tsx
git commit -m "feat: add visual pending feedback for route filter transitions"
```

---

## Task 3: A3 — Add optimistic face selection

**Files:**
- Modify: `packages/ui/src/face-image/face-thumbnail-strip.tsx:62-67, 174-178, 257`

**Problem:** Face selection state is driven entirely by URL params (`selectedFace` prop). After clicking a thumbnail, the border highlight only appears after the URL transition completes (~100-300ms). Users feel the click didn't register.

**Step 1: Add optimistic state**

In `face-thumbnail-strip.tsx`, inside the `FaceThumbnailStrip` component (after line 68, the `cache` line), add:

```tsx
// Optimistic: 点击后立即显示选中边框，不等 URL transition 完成
const [optimisticFace, setOptimisticFace] = useState<string | null>(null)
```

**Step 2: Update handleFaceClick to set optimistic state**

Change the `handleFaceClick` callback (lines 174-178) from:

```tsx
const handleFaceClick = useCallback(
  (key: string) => {
    onFaceSelect(selectedFace === key ? null : key)
  },
  [onFaceSelect, selectedFace]
)
```

to:

```tsx
const handleFaceClick = useCallback(
  (key: string) => {
    const newValue = selectedFace === key ? null : key
    setOptimisticFace(newValue)
    onFaceSelect(newValue)
  },
  [onFaceSelect, selectedFace]
)
```

Also update `handleAllClick` (lines 170-172) from:

```tsx
const handleAllClick = useCallback(() => {
  onFaceSelect(null)
}, [onFaceSelect])
```

to:

```tsx
const handleAllClick = useCallback(() => {
  setOptimisticFace(null)
  onFaceSelect(null)
}, [onFaceSelect])
```

**Step 3: Clear optimistic state when URL catches up**

Add an effect after the optimistic state declaration:

```tsx
// URL 状态追上后清除 optimistic 状态
useEffect(() => {
  setOptimisticFace(null)
}, [selectedFace])
```

**Step 4: Use optimistic state for visual rendering**

Add a derived display value after the effect:

```tsx
const displayFace = optimisticFace !== null ? optimisticFace : selectedFace
```

Then replace all instances of `selectedFace` used for **visual rendering** (border color, text weight) with `displayFace`. Specifically:

In the "全部" button (around line 238):
```tsx
// Change: !selectedFace → !displayFace (4 occurrences in this button)
```

In the face thumbnails loop (around line 257):
```tsx
// Change: const isSelected = selectedFace === group.key
const isSelected = displayFace === group.key
```

**Important:** Do NOT change the `selectedFace === key` check in `handleFaceClick` — that must use the real URL state to determine toggle behavior.

**Step 5: Type check**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 6: Verify locally**

1. Open `/route`, select a crag with faces
2. Click a face thumbnail → border should appear **instantly** (no delay)
3. Click the same face again → border should disappear instantly (toggle off)
4. Click "全部" → all borders cleared instantly

**Step 7: Commit**

```bash
git add packages/ui/src/face-image/face-thumbnail-strip.tsx
git commit -m "feat: optimistic face selection for instant click feedback"
```

---

## Task 4: B1 — Cache /api/faces responses in memory

**Files:**
- Modify: `packages/ui/src/face-image/face-thumbnail-strip.tsx:98-123`

**Problem:** Every crag switch triggers a new `fetch('/api/faces?cragId=xxx')`, even for previously visited crags. The API does auth check + R2 ListObjectsV2 on every call (~500-2000ms). Since `packages/ui` doesn't have SWR as a dependency, we use a simple module-level `Map` cache.

**Step 1: Add module-level cache**

At the top of `face-thumbnail-strip.tsx`, after the imports (around line 8), add:

```tsx
/** 模块级缓存: cragId → faces 列表。同一 session 内切回已访问岩场时命中缓存，跳过 API 请求。 */
const facesCache = new Map<string, { faceId: string; area: string }[]>()
```

**Step 2: Update the fetch effect to use cache**

Replace the fetch effect (lines 106-123) with:

```tsx
useEffect(() => {
  if (!selectedCrag) return

  // 命中缓存 → 立即返回，跳过 API 请求
  const cached = facesCache.get(selectedCrag)
  if (cached) {
    setFacesState({ cragId: selectedCrag, faces: cached, loading: false })
    return
  }

  let cancelled = false

  fetch(`/api/faces?cragId=${encodeURIComponent(selectedCrag)}`)
    .then((res) => res.json())
    .then((data) => {
      if (!cancelled && data.success) {
        facesCache.set(selectedCrag, data.faces)
        setFacesState({ cragId: selectedCrag, faces: data.faces, loading: false })
      }
    })
    .catch(() => {
      if (!cancelled) setFacesState({ cragId: selectedCrag, faces: [], loading: false })
    })

  return () => { cancelled = true }
}, [selectedCrag])
```

**Step 3: Invalidate cache on face image cache events**

The existing `subscribeByPrefix` (lines 73-78) fires when the editor uploads/deletes faces. Update it to also clear the API cache:

Change lines 73-78 from:

```tsx
useEffect(() => {
  if (!selectedCrag) return
  return cache.subscribeByPrefix(`${selectedCrag}/`, () => {
    setCacheVersion(v => v + 1)
  })
}, [selectedCrag, cache])
```

to:

```tsx
useEffect(() => {
  if (!selectedCrag) return
  return cache.subscribeByPrefix(`${selectedCrag}/`, () => {
    facesCache.delete(selectedCrag)
    setCacheVersion(v => v + 1)
  })
}, [selectedCrag, cache])
```

**Step 4: Verify locally**

1. Open `/route`, select crag A → faces load (network tab shows fetch)
2. Switch to crag B → faces load (network tab shows fetch)
3. Switch back to crag A → faces appear **instantly** (no network request)
4. In editor, upload a new face for crag A → switch back in PWA → should see new face (cache invalidated)

**Step 5: Commit**

```bash
git add packages/ui/src/face-image/face-thumbnail-strip.tsx
git commit -m "perf: cache /api/faces responses in memory to avoid repeated API calls"
```

---

## Task 5: B2 — Preload face thumbnail images

**Files:**
- Modify: `packages/ui/src/face-image/face-thumbnail-strip.tsx` (inside fetch effect from Task 4)

**Problem:** Even after API data returns, each `<img>` thumbnail starts downloading independently. On mobile, 8 images loading in parallel means cascading skeleton → loaded transitions. Preloading images during the API callback ensures they're already in browser HTTP cache when React renders `<img src={url}>`.

**Step 1: Add preload logic after API success**

In the fetch effect (modified in Task 4), add preloading after `facesCache.set(...)`:

```tsx
.then((data) => {
  if (!cancelled && data.success) {
    facesCache.set(selectedCrag, data.faces)
    setFacesState({ cragId: selectedCrag, faces: data.faces, loading: false })

    // 预加载前 8 张缩略图到浏览器 HTTP 缓存
    data.faces.slice(0, 8).forEach((f: { faceId: string; area: string }) => {
      const url = cache.getImageUrl({ cragId: selectedCrag, area: f.area, faceId: f.faceId })
      const img = new window.Image()
      img.src = url
    })
  }
})
```

**Also** preload when hitting the cache path (so cached API data still triggers image preload on crag switch):

```tsx
const cached = facesCache.get(selectedCrag)
if (cached) {
  setFacesState({ cragId: selectedCrag, faces: cached, loading: false })
  // 预加载缩略图（浏览器 HTTP 缓存会自动去重已加载的图片）
  cached.slice(0, 8).forEach((f) => {
    const url = cache.getImageUrl({ cragId: selectedCrag, area: f.area, faceId: f.faceId })
    const img = new window.Image()
    img.src = url
  })
  return
}
```

**Step 2: Type check**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 3: Verify locally**

1. Open `/route`, select a crag
2. Open DevTools Network tab, filter by "img"
3. Observe: thumbnail images start loading immediately after API response, not after React render
4. Face thumbnails should appear almost simultaneously instead of one-by-one

**Step 4: Commit**

```bash
git add packages/ui/src/face-image/face-thumbnail-strip.tsx
git commit -m "perf: preload face thumbnail images during API callback"
```

---

## Task 6: Final verification & ship

**Step 1: Full type check**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 2: End-to-end manual test**

Test the complete flow:

1. Open `/route` → select crag → **skeleton appears** while faces load (A1)
2. Faces load → click a thumbnail → **border highlights instantly** (A3)
3. Route list **dims briefly** then updates (A2)
4. Switch to another crag → skeleton → faces load
5. Switch back to first crag → faces appear **instantly from cache** (B1)
6. Thumbnails appear **all at once** instead of cascading (B2)

**Step 3: Ship**

Run `/ship "fix: improve route filter UX — loading states, optimistic selection, face caching"`
