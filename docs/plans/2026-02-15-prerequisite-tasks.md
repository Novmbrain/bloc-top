# Editor Split 迁移前置任务 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete 4 prerequisite tasks before the monorepo migration: secure the revalidation endpoint, add auto-revalidation to write APIs, add ISR to the homepage, and validate passkey multi-origin support.

**Architecture:** The revalidation endpoint gets Bearer token auth via a shared `REVALIDATE_SECRET` env var. Write APIs call `revalidatePath()` after successful mutations to keep ISR pages fresh. The homepage gets `revalidate = 86400` (1 day) as a safety net. Passkey config switches to an origin array for future editor subdomain compatibility.

**Tech Stack:** Next.js App Router ISR, `revalidatePath` / `revalidateTag`, better-auth passkey plugin, Vitest

---

## Task 1: Secure `/api/revalidate` with Bearer Token (P0)

**Files:**
- Modify: `src/app/api/revalidate/route.ts`
- Create: `src/app/api/revalidate/route.test.ts`

**Context:** This endpoint is currently completely unprotected. Anyone can trigger ISR rebuilds, creating a DoS risk. After the editor split, this becomes the webhook receiver for cross-app cache invalidation.

**Step 1: Write the failing tests**

```typescript
// src/app/api/revalidate/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock revalidatePath before importing route
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}))

const MOCK_SECRET = 'test-revalidate-secret-123'

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('REVALIDATE_SECRET', MOCK_SECRET)
  })

  it('returns 401 without Authorization header', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong Bearer token', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/test' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wrong-token',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct Bearer token and path', async () => {
    const { POST } = await import('./route')
    const { revalidatePath } = await import('next/cache')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path: '/zh/crag/yuan-tong-si' }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/zh/crag/yuan-tong-si')
  })

  it('supports paths array for batch revalidation', async () => {
    const { POST } = await import('./route')
    const { revalidatePath } = await import('next/cache')
    const paths = ['/zh/crag/test', '/en/crag/test', '/fr/crag/test']
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ paths }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    paths.forEach(p => expect(revalidatePath).toHaveBeenCalledWith(p))
  })

  it('supports tags for tag-based revalidation', async () => {
    const { revalidateTag } = await import('next/cache')
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ tags: ['crag-yuan-tong-si'] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith('crag-yuan-tong-si')
  })

  it('returns 400 when no path/paths/tags/routeId provided', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost:3000/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_SECRET}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/revalidate/route.test.ts`
Expected: FAIL — current route has no auth check, no `paths` array support, no `revalidateTag`

**Step 3: Implement the secured revalidation endpoint**

Replace `src/app/api/revalidate/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Revalidate')

/**
 * POST /api/revalidate
 * On-Demand ISR revalidation endpoint
 *
 * Requires Bearer token auth (REVALIDATE_SECRET env var).
 * After editor split, this becomes the webhook receiver.
 *
 * Body options (all optional, at least one required):
 * - { path: string }           — single path
 * - { paths: string[] }        — batch paths (for webhook: localized paths)
 * - { tags: string[] }         — tag-based revalidation
 * - { routeId: number }        — revalidate all locale versions of a route
 */
export async function POST(request: NextRequest) {
  // Bearer token auth
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const revalidated: string[] = []
    const revalidatedTags: string[] = []

    // paths array (webhook format)
    if (Array.isArray(body.paths)) {
      for (const p of body.paths) {
        if (typeof p === 'string') {
          revalidatePath(p)
          revalidated.push(p)
        }
      }
    }

    // single path (legacy format)
    if (typeof body.path === 'string') {
      revalidatePath(body.path)
      revalidated.push(body.path)
    }

    // routeId — revalidate all locale versions
    if (typeof body.routeId === 'number') {
      const paths = [
        `/zh/route/${body.routeId}`,
        `/en/route/${body.routeId}`,
        `/fr/route/${body.routeId}`,
      ]
      paths.forEach(p => {
        revalidatePath(p)
        revalidated.push(p)
      })
    }

    // tag-based revalidation
    if (Array.isArray(body.tags)) {
      for (const tag of body.tags) {
        if (typeof tag === 'string') {
          revalidateTag(tag)
          revalidatedTags.push(tag)
        }
      }
    }

    if (revalidated.length === 0 && revalidatedTags.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供 path, paths, routeId, 或 tags 参数' },
        { status: 400 }
      )
    }

    log.info('Revalidated', {
      action: 'POST /api/revalidate',
      metadata: { paths: revalidated, tags: revalidatedTags },
    })

    return NextResponse.json({
      success: true,
      revalidated,
      revalidatedTags,
    })
  } catch (error) {
    log.error('Failed to revalidate', error, {
      action: 'POST /api/revalidate',
    })
    return NextResponse.json(
      { success: false, error: '重新验证失败' },
      { status: 500 }
    )
  }
}
```

**Step 4: Update the `revalidateTag` mock in the test**

Add to the `vi.mock('next/cache')` block:

```typescript
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/api/revalidate/route.test.ts`
Expected: ALL PASS (6 tests)

**Step 6: Add `REVALIDATE_SECRET` to `.env.local`**

Add to your local `.env.local`:
```
REVALIDATE_SECRET=your-random-secret-here
```

And add to `.env.example` (if not already present):
```
REVALIDATE_SECRET=         # Revalidation webhook 认证密钥
```

**Step 7: Commit**

```bash
git add src/app/api/revalidate/route.ts src/app/api/revalidate/route.test.ts
git commit -m "feat(api): add Bearer token auth to /api/revalidate endpoint

Secures the ISR revalidation endpoint with REVALIDATE_SECRET env var.
Also adds batch paths and tag-based revalidation for future webhook use."
```

---

## Task 2: Add Auto-Revalidation to Write APIs (P1)

**Files:**
- Create: `src/lib/revalidate-helpers.ts` (shared revalidation helper)
- Modify: `src/app/api/crags/[id]/route.ts` (PATCH)
- Modify: `src/app/api/crags/[id]/areas/route.ts` (PATCH)
- Modify: `src/app/api/routes/route.ts` (POST)
- Modify: `src/app/api/routes/[id]/route.ts` (PATCH, DELETE)
- Modify: `src/app/api/faces/route.ts` (PATCH, DELETE)
- Modify: `src/app/api/crags/route.ts` (POST — admin create crag)
- Modify: `src/app/api/cities/route.ts` (POST)
- Modify: `src/app/api/cities/[id]/route.ts` (PATCH, DELETE)
- Modify: `src/app/api/prefectures/route.ts` (POST)
- Modify: `src/app/api/prefectures/[id]/route.ts` (PATCH, DELETE)
- Create: `src/lib/revalidate-helpers.test.ts`

**Context:** Currently, editing data in the editor has no effect on cached ISR pages. Users must manually call `/api/revalidate` or wait 30 days for ISR to expire. This step adds `revalidatePath()` calls after every successful write operation so ISR pages update within seconds.

**Step 1: Create the revalidation helper with tests**

```typescript
// src/lib/revalidate-helpers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidateCragPages, revalidateHomePage } from './revalidate-helpers'
import { revalidatePath } from 'next/cache'

describe('revalidate-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('revalidateCragPages calls revalidatePath for all locales', () => {
    revalidateCragPages('yuan-tong-si')
    expect(revalidatePath).toHaveBeenCalledTimes(6)
    expect(revalidatePath).toHaveBeenCalledWith('/zh/crag/yuan-tong-si')
    expect(revalidatePath).toHaveBeenCalledWith('/en/crag/yuan-tong-si')
    expect(revalidatePath).toHaveBeenCalledWith('/fr/crag/yuan-tong-si')
    // Also revalidates home pages
    expect(revalidatePath).toHaveBeenCalledWith('/zh')
    expect(revalidatePath).toHaveBeenCalledWith('/en')
    expect(revalidatePath).toHaveBeenCalledWith('/fr')
  })

  it('revalidateHomePage calls revalidatePath for all locale home pages', () => {
    revalidateHomePage()
    expect(revalidatePath).toHaveBeenCalledTimes(3)
    expect(revalidatePath).toHaveBeenCalledWith('/zh')
    expect(revalidatePath).toHaveBeenCalledWith('/en')
    expect(revalidatePath).toHaveBeenCalledWith('/fr')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/revalidate-helpers.test.ts`
Expected: FAIL — module does not exist

**Step 3: Create the revalidation helper**

```typescript
// src/lib/revalidate-helpers.ts
import { revalidatePath } from 'next/cache'

const LOCALES = ['zh', 'en', 'fr'] as const

/**
 * Revalidate all locale versions of a crag detail page + home pages.
 * Call after any crag/route/face mutation.
 */
export function revalidateCragPages(cragId: string) {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/crag/${cragId}`)
    revalidatePath(`/${locale}`)
  }
}

/**
 * Revalidate all locale home pages.
 * Call after city/prefecture mutations that affect the home page listing.
 */
export function revalidateHomePage() {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`)
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/revalidate-helpers.test.ts`
Expected: ALL PASS (2 tests)

**Step 5: Commit helper**

```bash
git add src/lib/revalidate-helpers.ts src/lib/revalidate-helpers.test.ts
git commit -m "feat: add revalidation helper functions for ISR cache invalidation"
```

**Step 6: Add revalidation calls to crag write APIs**

In `src/app/api/crags/[id]/route.ts` — add after successful `updateCrag()`:

```typescript
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// ... inside PATCH handler, after log.info('Crag updated', ...) line:
revalidateCragPages(id)
```

In `src/app/api/crags/[id]/areas/route.ts` — add after successful area update:

```typescript
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// ... after successful update:
revalidateCragPages(id)
```

In `src/app/api/crags/route.ts` — add after successful create:

```typescript
import { revalidateHomePage } from '@/lib/revalidate-helpers'

// ... after successful crag creation:
revalidateHomePage()
```

**Step 7: Add revalidation calls to route write APIs**

In `src/app/api/routes/route.ts` — add after successful `createRoute()`:

```typescript
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// ... after successful creation, use the route's cragId:
revalidateCragPages(body.cragId)
```

In `src/app/api/routes/[id]/route.ts` — add after successful PATCH and DELETE:

```typescript
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// ... in PATCH handler after log.info('Route updated', ...):
revalidateCragPages(existingRoute.cragId)

// ... in DELETE handler after log.info('Route deleted', ...):
revalidateCragPages(existingRoute.cragId)
```

**Step 8: Add revalidation calls to face write APIs**

In `src/app/api/faces/route.ts` — add after successful PATCH and DELETE:

```typescript
import { revalidateCragPages } from '@/lib/revalidate-helpers'

// ... after successful face rename or delete, use the cragId from the request:
revalidateCragPages(cragId)
```

**Step 9: Add revalidation calls to city/prefecture write APIs**

In `src/app/api/cities/route.ts` (POST), `src/app/api/cities/[id]/route.ts` (PATCH, DELETE):

```typescript
import { revalidateHomePage } from '@/lib/revalidate-helpers'

// ... after successful mutation:
revalidateHomePage()
```

In `src/app/api/prefectures/route.ts` (POST), `src/app/api/prefectures/[id]/route.ts` (PATCH, DELETE):

```typescript
import { revalidateHomePage } from '@/lib/revalidate-helpers'

// ... after successful mutation:
revalidateHomePage()
```

**Step 10: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS — revalidatePath is server-side only, tests that mock it should still work. Existing API route tests may need `vi.mock('next/cache')` added if they don't already have it.

**Step 11: Commit all API changes**

```bash
git add src/app/api/crags/ src/app/api/routes/ src/app/api/faces/route.ts \
        src/app/api/cities/ src/app/api/prefectures/
git commit -m "feat(api): add auto-revalidation to all write API endpoints

After successful create/update/delete operations, ISR pages are now
automatically revalidated via revalidatePath(). This eliminates the need
for manual revalidation and prepares for the webhook-based invalidation
in the editor split architecture."
```

---

## Task 3: Add ISR Configuration to Homepage (P1)

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/lib/cache-config.ts` (documentation update)

**Context:** The homepage currently has no `revalidate` export, meaning it's dynamically rendered on every request. The crag detail page and route list page already have `revalidate = 2592000` (30 days). The homepage should have a shorter TTL as a safety net for when webhook/auto-revalidation fails.

**Step 1: Add ISR revalidate export to homepage**

In `src/app/[locale]/page.tsx`, add at the top level (after imports, before the component):

```typescript
// ISR: 安全网 — 即使自动 revalidation 失败，最多 1 天后也会刷新
// 注意: Next.js 要求使用字面量，不能使用变量引用
export const revalidate = 86400 // 1 天 (秒)
```

**Step 2: Update cache-config.ts documentation**

In `src/lib/cache-config.ts`, update the `ISR_REVALIDATE` comment to include homepage:

```typescript
export const ISR_REVALIDATE = {
  /** 首页 ISR 安全网 - 即使 revalidatePath 失败也会在 1 天内刷新 */
  HOME: SECONDS.DAY, // 86400 秒 = 1 天

  /** 列表页面 ISR - 线路列表等 */
  PAGE: SECONDS.MONTH, // 2592000 秒 = 30 天

  /** 详情页面 ISR - 岩场详情、线路详情等 */
  DETAIL: SECONDS.MONTH, // 2592000 秒 = 30 天
} as const
```

Also update the comment block listing which files use ISR:

```
 * 修改此值时，需同步更新以下文件中的字面量：
 * - src/app/[locale]/page.tsx (HOME = 86400)
 * - src/app/[locale]/route/page.tsx (PAGE = 2592000)
 * - src/app/[locale]/crag/[id]/page.tsx (DETAIL = 2592000)
```

**Step 3: Verify build succeeds**

Run: `npx next build` (or just `npm run build`)
Expected: Build succeeds. Homepage should now show ISR behavior in build output.

**Step 4: Commit**

```bash
git add src/app/\[locale\]/page.tsx src/lib/cache-config.ts
git commit -m "feat(isr): add 1-day ISR safety net to homepage

Homepage was previously dynamic-rendered on every request. Now uses
revalidate=86400 (1 day) as a safety net in case auto-revalidation
from write APIs fails. This is shorter than the 30-day TTL on detail
pages because the homepage is more sensitive to data freshness."
```

---

## Task 4: Validate and Configure Passkey Multi-Origin Support (P1)

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/auth.test.ts` (verification test)

**Context:** The editor split will deploy to `editor.bouldering.top`. The passkey `rpID` can stay as `bouldering.top` (WebAuthn allows subdomains to use parent domain rpID). However, the `origin` field must include all origins that will use passkey auth. Research confirms that better-auth's passkey plugin accepts `origin: string | string[]` and passes it to `@simplewebauthn/server` which also supports arrays.

**Step 1: Update passkey origin to array format**

In `src/lib/auth.ts`, change the passkey configuration:

```typescript
passkey({
  rpID: process.env.NODE_ENV === 'production'
    ? 'bouldering.top'
    : 'localhost',
  rpName: '寻岩记 BlocTop',
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://bouldering.top',
        'https://www.bouldering.top',
      ]
    : 'http://localhost:3000',
}),
```

Note: `editor.bouldering.top` is NOT added yet — the editor will have its own better-auth instance with its own passkey config (or may choose to disable passkey login entirely). This change only fixes the current issue where `https://bouldering.top` (without www) would fail passkey verification.

**Step 2: Verify passkey still works locally**

1. Start dev server: `npm run dev`
2. Navigate to login page, attempt passkey registration/login
3. Verify no WebAuthn errors in console

**Step 3: Run existing tests**

Run: `npx vitest run`
Expected: ALL PASS — auth.ts changes don't affect existing tests since the auth module is typically mocked.

**Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "fix(auth): support multiple origins for passkey verification

Changes passkey origin from single string to array format to support
both bouldering.top and www.bouldering.top. The better-auth passkey
plugin (v1.4.18) and @simplewebauthn/server both support string[]
for expectedOrigin. This also validates the approach for the future
editor split where editor.bouldering.top will have its own auth instance."
```

---

## Summary

| Task | Priority | Files Changed | Tests Added |
|------|----------|---------------|-------------|
| 1. Secure `/api/revalidate` | P0 | 1 modified | ~6 |
| 2. Auto-revalidation in write APIs | P1 | ~11 modified, 1 created | ~2 |
| 3. Homepage ISR config | P1 | 2 modified | 0 (build verification) |
| 4. Passkey multi-origin | P1 | 1 modified | 0 (manual verification) |

**Total:** ~15 files changed, ~8 new tests, 4 commits

**Dependencies:** Task 1 should be completed first (P0). Tasks 2-4 are independent of each other and can be done in parallel or any order.
