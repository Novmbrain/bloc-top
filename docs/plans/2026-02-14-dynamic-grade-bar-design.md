# Dynamic Grade Filter Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded V0-V13 grade filter bar with a dynamic bar that only shows grades present in the current route pool, centered vertically on screen.

**Architecture:** Parent component (`route-client.tsx`) computes `availableGrades` from the current route pool (city-filtered or crag-filtered), passes it as a prop to `GradeRangeSelectorVertical`. The component replaces all `V_GRADES` references with this prop and switches to a centered layout with fixed-height chips.

**Tech Stack:** React, Next.js App Router, Tailwind CSS, URL search params for state

---

### Task 1: Update `GradeRangeSelectorVertical` interface and replace `V_GRADES`

**Files:**
- Modify: `src/components/grade-range-selector-vertical.tsx`

**Step 1: Update interface to accept `availableGrades` prop**

Add `availableGrades: string[]` to `GradeRangeSelectorVerticalProps`:

```typescript
interface GradeRangeSelectorVerticalProps {
  availableGrades: string[]  // NEW
  selectedGrades: string[]
  onChange: (grades: string[]) => void
  className?: string
}
```

Destructure in the component:
```typescript
export function GradeRangeSelectorVertical({
  availableGrades,  // NEW
  selectedGrades,
  onChange,
  className,
}: GradeRangeSelectorVerticalProps) {
```

**Step 2: Replace all `V_GRADES` references with `availableGrades`**

There are 6 occurrences of `V_GRADES` in the component body (NOT the import):

1. Line 57: `V_GRADES.length` → `availableGrades.length` (in `getGradeIndexFromPosition`)
2. Line 58: `V_GRADES.length` → `availableGrades.length` (same function)
3. Line 64: `V_GRADES.slice(min, max + 1) as string[]` → `availableGrades.slice(min, max + 1)`
4. Line 100: `V_GRADES[dragStart] as string` → `availableGrades[dragStart]`
5. Line 157: `V_GRADES[index]` → `availableGrades[index]`
6. Line 198: `V_GRADES.map(...)` → `availableGrades.map(...)`

**IMPORTANT**: `getGradeIndexFromPosition` and `getSelectedFromRange` callbacks currently have empty dependency arrays `[]` because they only reference the stable `V_GRADES` constant. After switching to `availableGrades` (a prop), they MUST include `availableGrades` in their dependency arrays. Same for `isGradeSelected`.

Updated callbacks:
```typescript
const getGradeIndexFromPosition = useCallback((clientY: number): number => {
  if (!containerRef.current) return 0
  const rect = containerRef.current.getBoundingClientRect()
  const y = clientY - rect.top
  const index = Math.floor((y / rect.height) * availableGrades.length)
  return Math.max(0, Math.min(availableGrades.length - 1, index))
}, [availableGrades])

const getSelectedFromRange = useCallback((start: number, end: number): string[] => {
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  return availableGrades.slice(min, max + 1)
}, [availableGrades])
```

In `handleDragEnd`:
```typescript
const newSelection = hasMoved
  ? getSelectedFromRange(dragStart, dragEnd)
  : [availableGrades[dragStart]]
```

In `isGradeSelected`:
```typescript
return displayedSelection.includes(availableGrades[index])
```

Remove the `V_GRADES` import if no longer used.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Compilation errors in `route-client.tsx` (missing `availableGrades` prop) — this is expected and will be fixed in Task 3.

**Step 4: Commit**

```bash
git add src/components/grade-range-selector-vertical.tsx
git commit -m "refactor: accept availableGrades prop in GradeRangeSelectorVertical"
```

---

### Task 2: Update layout to center the bar vertically

**Files:**
- Modify: `src/components/grade-range-selector-vertical.tsx`

**Step 1: Change container to `justify-center`**

Line 166, outer div:
```tsx
// BEFORE
<div className={`flex flex-col items-center gap-1.5 ${className ?? ''}`}>

// AFTER
<div className={`flex flex-col items-center justify-center gap-1.5 ${className ?? ''}`}>
```

**Step 2: Change bar from `flex-1` to fixed chip height**

Line 185, bar div — remove `flex-1` and add `minHeight` per chip:
```tsx
// BEFORE
className={`flex flex-col rounded-lg overflow-hidden cursor-pointer select-none touch-none flex-1${showPulse ? ' animate-pulse' : ''}`}

// AFTER
className={`flex flex-col rounded-lg overflow-hidden cursor-pointer select-none touch-none${showPulse ? ' animate-pulse' : ''}`}
```

Line 205, each chip — change from `flex-1` to fixed height:
```tsx
// BEFORE
className="flex-1 flex items-center justify-center transition-all duration-150"

// AFTER
className="flex items-center justify-center transition-all duration-150"
style={{
  minHeight: 28,
  // ... existing styles
}}
```

Merge the `minHeight` into the existing `style` object (line 206-213).

**Step 3: Handle empty `availableGrades`**

If `availableGrades.length === 0`, hide the bar entirely. Before the return statement, add:

```typescript
if (availableGrades.length === 0) {
  return null
}
```

**Step 4: Commit**

```bash
git add src/components/grade-range-selector-vertical.tsx
git commit -m "refactor: center grade bar vertically with fixed chip height"
```

---

### Task 3: Compute `availableGrades` in `route-client.tsx`

**Files:**
- Modify: `src/app/[locale]/route/route-client.tsx`

**Step 1: Add `availableGrades` useMemo**

After `cityFilteredRoutes` (line 67), before `updateSearchParams` (line 70), add:

```typescript
// 计算当前路线池中实际存在的难度等级
const availableGrades = useMemo(() => {
  const pool = selectedCrag
    ? cityFilteredRoutes.filter((r) => r.cragId === selectedCrag)
    : cityFilteredRoutes
  const gradeSet = new Set(pool.map((r) => r.grade))
  // 按难度排序，"？"放最后
  return [...gradeSet].sort((a, b) => {
    if (a === '？') return 1
    if (b === '？') return -1
    return compareGrades(a, b)
  })
}, [cityFilteredRoutes, selectedCrag])
```

**Step 2: Pass `availableGrades` to the component**

Line 275-278:
```tsx
// BEFORE
<GradeRangeSelectorVertical
  selectedGrades={selectedGrades}
  onChange={(grades) => updateSearchParams(FILTER_PARAMS.GRADE, grades)}
  className="h-full"
/>

// AFTER
<GradeRangeSelectorVertical
  availableGrades={availableGrades}
  selectedGrades={selectedGrades}
  onChange={(grades) => updateSearchParams(FILTER_PARAMS.GRADE, grades)}
  className="h-full"
/>
```

**Step 3: Auto-clear invalid grade selections on crag switch**

When `availableGrades` changes (e.g., user switches crag), some currently selected grades may no longer exist. Add a useEffect after the `availableGrades` memo:

```typescript
// 切换岩场时，清除不在新岩场中的已选难度
useEffect(() => {
  if (selectedGrades.length === 0) return
  const validGrades = selectedGrades.filter((g) => availableGrades.includes(g))
  if (validGrades.length !== selectedGrades.length) {
    updateSearchParams(FILTER_PARAMS.GRADE, validGrades.length > 0 ? validGrades : null)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 availableGrades 变化时检查
}, [availableGrades])
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 5: Verify ESLint passes**

Run: `npx eslint src/components/grade-range-selector-vertical.tsx src/app/\[locale\]/route/route-client.tsx 2>&1 | tail -10`
Expected: No new errors (existing warnings OK)

**Step 6: Commit**

```bash
git add src/app/\[locale\]/route/route-client.tsx
git commit -m "feat: compute availableGrades dynamically and pass to grade bar"
```

---

### Task 4: Visual testing and edge case verification

**Step 1: Run dev server and test manually**

Run: `npm run dev`

Test scenarios:
1. Open `/route` — bar shows all grades present across all crags in the city
2. Select a crag with few grades (e.g., only V2-V5) — bar shrinks to 4 chips, centered
3. Select a crag with many grades — bar expands
4. Select a grade, then switch to a crag that doesn't have that grade — selection auto-clears
5. Crag with "？" routes — "？" chip appears at bottom of bar
6. Switch back to "全部" — bar expands to show all city grades

**Step 2: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 3: Final commit with design doc**

```bash
git add docs/plans/2026-02-14-dynamic-grade-bar-design.md
git commit -m "docs: add dynamic grade bar design plan"
```
