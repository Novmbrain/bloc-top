# Crag Hero Image Scroll Collapse Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移动端岩场详情页下滑时，Hero 图片随滚动自然推出视口，图片消失后顶部滑入迷你导航栏（返回按钮 + 岩场名），释放屏幕空间。

**Architecture:** 单滚动容器方案 — 将当前双容器布局（图片固定 + 内容独立滚动）改为单容器布局（图片在文档流中随滚动推出），IntersectionObserver 监听图片可见性触发迷你导航栏显隐。仅移动端（≤640px）生效，桌面端保持原布局。

**Tech Stack:** React hooks (useMediaQuery, IntersectionObserver), useSyncExternalStore, Tailwind CSS, Next.js Image

---

## 需求摘要

| 维度 | 决策 |
|------|------|
| 收起后状态 | 图片完全隐藏（0px），内容占满 |
| 触发方式 | 1:1 滚动联动（图片在文档流中自然滚出） |
| 图片消失后 | 顶部滑入迷你导航栏（返回按钮 + 岩场名） |
| 轮播 | Mobile 移除水平轮播，只显示第一张封面图；Desktop 保留 |
| 生效范围 | 仅 Mobile（≤640px），Desktop 保持现有双容器布局 |

---

### Task 1: Create `useMediaQuery` Hook

**Files:**
- Create: `src/hooks/use-media-query.ts`
- Test: `src/hooks/use-media-query.test.ts`

**Step 1: Write the failing test**

Create `src/hooks/use-media-query.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './use-media-query'

describe('useMediaQuery', () => {
  let listeners: Set<() => void>
  let currentMatches: boolean

  beforeEach(() => {
    listeners = new Set()
    currentMatches = false

    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      get matches() { return currentMatches },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: vi.fn(),
    }))
  })

  it('returns false when query does not match', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('returns true when query matches', () => {
    currentMatches = true
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(true)
  })

  it('updates when media query changes', () => {
    currentMatches = false
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)

    // Simulate viewport resize
    currentMatches = true
    act(() => {
      listeners.forEach(cb => cb())
    })

    expect(result.current).toBe(true)
  })

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(listeners.size).toBe(1)

    unmount()
    expect(listeners.size).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/use-media-query.test.ts`
Expected: FAIL — module `./use-media-query` not found

**Step 3: Write minimal implementation**

Create `src/hooks/use-media-query.ts`:

```typescript
'use client'

import { useSyncExternalStore } from 'react'

/**
 * 响应式媒体查询 hook
 * SSR 安全 — 服务端默认返回 false（桌面端行为）
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)')
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/use-media-query.test.ts`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/hooks/use-media-query.ts src/hooks/use-media-query.test.ts
git commit -m "feat: add useMediaQuery hook with SSR support"
```

---

### Task 2: Refactor `crag-detail-client.tsx` — Mobile Single-Scroll Layout

**Files:**
- Modify: `src/app/[locale]/crag/[id]/crag-detail-client.tsx`

**Context:**
- Current file is 300 lines (including `InfoCard` sub-component)
- Currently uses: `scrollContainerRef`, `currentIndex` state, carousel scroll listener
- Mobile: replace with single-scroll container + IntersectionObserver + mini nav bar
- Desktop: keep existing dual-container layout + carousel unchanged

**Step 1: Add new imports and state**

At top of file, add import for `useMediaQuery`:

```typescript
// Add to existing imports:
import { useMediaQuery } from '@/hooks/use-media-query'
```

Add new state/refs inside the component (after existing state):

```typescript
const isMobile = useMediaQuery('(max-width: 640px)')
const heroRef = useRef<HTMLDivElement>(null)
const [imageVisible, setImageVisible] = useState(true)
```

**Step 2: Add IntersectionObserver effect**

Add after the existing carousel scroll effect:

```typescript
// 监听 Hero 图片可见性（Mobile only）
useEffect(() => {
  if (!isMobile) return
  const hero = heroRef.current
  if (!hero) return

  const observer = new IntersectionObserver(
    ([entry]) => setImageVisible(entry.isIntersecting),
    { threshold: 0 }
  )
  observer.observe(hero)
  return () => observer.disconnect()
}, [isMobile])
```

**Step 3: Refactor the JSX — outer container**

Replace the outer container div (line 70-76):

```tsx
// Before:
<div
  className="flex flex-col h-dvh overflow-hidden"
  style={{ backgroundColor: 'var(--theme-surface)', transition: 'var(--theme-transition)' }}
>

// After:
<div
  className={isMobile
    ? "h-dvh overflow-y-auto"
    : "flex flex-col h-dvh overflow-hidden"
  }
  style={{ backgroundColor: 'var(--theme-surface)', transition: 'var(--theme-transition)' }}
>
```

**Step 4: Refactor the JSX — Hero image section**

Replace the entire hero image section (lines 78-130) with conditional rendering:

```tsx
{/* Hero 图片区域 */}
<div ref={heroRef} className={isMobile ? "relative" : "relative flex-shrink-0"}>
  {/* 返回按钮（图片上方） */}
  <button
    onClick={() => router.back()}
    className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
  >
    <ChevronLeft className="w-6 h-6 text-white" />
  </button>

  {isMobile ? (
    /* Mobile: 单张图片，无轮播 */
    <div className="relative h-48">
      <Image
        src={images[0]}
        alt={crag.name}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        draggable={false}
      />
    </div>
  ) : (
    /* Desktop: 保留轮播 */
    <div
      ref={scrollContainerRef}
      className="relative h-48 overflow-x-auto scrollbar-hide"
      style={{
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex h-full">
        {images.map((src, idx) => (
          <div
            key={idx}
            className="w-full flex-shrink-0 h-48 relative"
            style={{ scrollSnapAlign: 'start' }}
          >
            <Image
              src={src}
              alt={`${crag.name} ${idx + 1}`}
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )}
</div>
```

**Step 5: Refactor the JSX — content section**

Replace the `<main>` tag (line 133):

```tsx
// Before:
<main className="flex-1 overflow-y-auto px-4 pb-24">

// After:
<main className={isMobile ? "px-4 pb-24" : "flex-1 overflow-y-auto px-4 pb-24"}>
```

**Step 6: Add Mini Nav Bar — before the closing `</div>` of the outer container**

Insert the mini nav bar JSX right before the bottom button section (before line 243):

```tsx
{/* 迷你导航栏 — Mobile only, 图片滚出后滑入 */}
{isMobile && (
  <div
    className={`fixed top-0 inset-x-0 z-30 transition-transform duration-300 ${
      imageVisible ? '-translate-y-full' : 'translate-y-0'
    }`}
  >
    <div
      className="h-14 flex items-center gap-3"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        backgroundColor: 'color-mix(in srgb, var(--theme-surface) 80%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--theme-outline-variant)',
      }}
    >
      <button
        onClick={() => router.back()}
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface-variant)' }}
      >
        <ChevronLeft className="w-5 h-5" style={{ color: 'var(--theme-on-surface)' }} />
      </button>
      <span
        className="truncate font-semibold text-base"
        style={{ color: 'var(--theme-on-surface)' }}
      >
        {crag.name}
      </span>
    </div>
  </div>
)}
```

**Step 7: Run lint and type check**

Run: `npx next lint && npx tsc --noEmit`
Expected: No errors

**Step 8: Visual verification**

Run: `npm run dev`
Manual check in browser:
- Mobile viewport (≤640px): image scrolls away, mini nav bar appears
- Desktop viewport (>640px): original layout preserved with carousel

**Step 9: Commit**

```bash
git add src/app/[locale]/crag/[id]/crag-detail-client.tsx
git commit -m "feat(crag): collapsible hero image with mini nav bar on mobile"
```

---

### Task 3: Add Component Test for Mini Nav Bar

**Files:**
- Create: `src/app/[locale]/crag/[id]/crag-detail-client.test.tsx`

**Step 1: Write the test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import CragDetailClient from './crag-detail-client'
import type { Crag, Route } from '@/types'

// Mock useMediaQuery
const mockUseMediaQuery = vi.fn(() => false)
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => mockUseMediaQuery(),
}))

// Mock WeatherCard (external API dependency)
vi.mock('@/components/weather-card', () => ({
  WeatherCard: () => <div data-testid="weather-card" />,
}))

// Mock AMapContainer (external API dependency)
vi.mock('@/components/amap-container', () => ({
  default: () => <div data-testid="amap-container" />,
}))

const mockCrag: Crag = {
  id: 'test-crag',
  name: '测试岩场',
  cityId: 'luoyuan',
  location: '测试地点',
  developmentTime: '2024',
  description: '测试描述',
  approach: '测试前往方式',
}

const mockRoutes: Route[] = [
  { id: 1, name: '线路A', grade: 'V2', cragId: 'test-crag', area: 'A区' },
  { id: 2, name: '线路B', grade: 'V5', cragId: 'test-crag', area: 'A区' },
]

describe('CragDetailClient', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false)
  })

  it('renders crag name', () => {
    render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
    expect(screen.getByText('测试岩场')).toBeInTheDocument()
  })

  describe('Mobile layout', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true)
    })

    it('renders mini nav bar with crag name on mobile', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Mini nav bar contains a second instance of crag name
      const cragNames = screen.getAllByText('测试岩场')
      expect(cragNames.length).toBeGreaterThanOrEqual(2) // title + mini nav
    })

    it('does not render carousel dot indicators on mobile', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Dot indicators have rounded-full + w-2 classes — they should not exist
      const dots = document.querySelectorAll('.w-2.h-2.rounded-full')
      expect(dots.length).toBe(0)
    })
  })

  describe('Desktop layout', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false)
    })

    it('does not render mini nav bar on desktop', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      // Only one instance of crag name (the title)
      const cragNames = screen.getAllByText('测试岩场')
      expect(cragNames.length).toBe(1)
    })

    it('renders carousel dot indicators on desktop', () => {
      render(<CragDetailClient crag={mockCrag} routes={mockRoutes} />)
      const dots = document.querySelectorAll('.w-2.h-2.rounded-full')
      expect(dots.length).toBe(2) // 2 cover images
    })
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run src/app/[locale]/crag/[id]/crag-detail-client.test.tsx`
Expected: All 5 tests PASS

**Step 3: Commit**

```bash
git add src/app/[locale]/crag/[id]/crag-detail-client.test.tsx
git commit -m "test(crag): add tests for mobile/desktop hero layout behavior"
```

---

### Task 4: Final Verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run lint**

Run: `npx next lint`
Expected: No errors

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Update CLAUDE.md if needed**

Add `use-media-query.ts` to hooks list in project structure if appropriate.

**Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "chore: final verification fixes"
```

---

## 不做的事

- 不做 parallax / scale 等花哨动效
- 不做 CSS scroll-driven animations（Safari 兼容性风险）
- 不改桌面端布局
- 不添加 i18n 翻译（迷你导航栏只显示岩场名，无翻译键）
