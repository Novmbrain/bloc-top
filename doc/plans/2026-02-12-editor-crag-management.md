# Editor 岩场管理功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add crag creation and editing capability to the editor interface, with auto-pinyin slug generation and cover image management.

**Architecture:** New `/editor/crags` page hierarchy (list + edit sub-page), backed by `createCrag`/`updateCrag` DB functions and corresponding API routes. Cover images use existing R2 upload infrastructure. Pinyin slug generation via `pinyin-pro` on the client side.

**Tech Stack:** Next.js App Router, MongoDB (native driver), Cloudflare R2, `pinyin-pro`, existing shadcn/ui components.

---

### Task 1: Install pinyin-pro dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install pinyin-pro`

**Step 2: Verify installation**

Run: `node -e "const { pinyin } = require('pinyin-pro'); console.log(pinyin('源通寺', { toneType: 'none', separator: '-' }))"`
Expected: `yuan-tong-si`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pinyin-pro for crag slug generation"
```

---

### Task 2: Add createCrag and updateCrag to DB layer

**Files:**
- Modify: `src/lib/db/index.ts`

**Step 1: Add createCrag function**

Add after the `getCragById` export (around line 137), before the Route section:

```typescript
/**
 * 创建新岩场
 * 使用 crag.id 作为 MongoDB _id
 */
export async function createCrag(
  crag: Omit<Crag, 'coverImages' | 'approachPaths' | 'areas' | 'credits'>
): Promise<Crag> {
  const start = Date.now()

  try {
    const db = await getDatabase()

    // 检查 ID 唯一性
    const existing = await db.collection('crags').findOne({ _id: toMongoId(crag.id) })
    if (existing) {
      throw new Error(`岩场 ID "${crag.id}" 已存在`)
    }

    const doc = {
      _id: toMongoId(crag.id),
      ...Object.fromEntries(Object.entries(crag).filter(([k]) => k !== 'id')),
      areas: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection('crags').insertOne(doc)

    log.info(`Created crag: ${crag.id}`, {
      action: 'createCrag',
      duration: Date.now() - start,
      metadata: { cragId: crag.id, name: crag.name },
    })

    return { ...crag, areas: [] } as Crag
  } catch (error) {
    log.error('Failed to create crag', error, {
      action: 'createCrag',
      duration: Date.now() - start,
      metadata: { cragId: crag.id },
    })
    throw error
  }
}
```

**Step 2: Add updateCrag function**

Add directly after `createCrag`:

```typescript
/**
 * 更新岩场信息
 * 支持部分更新，不允许修改 id
 */
export async function updateCrag(
  id: string,
  updates: Partial<Omit<Crag, 'id'>>
): Promise<Crag | null> {
  const start = Date.now()

  try {
    const db = await getDatabase()

    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    const result = await db.collection('crags').findOneAndUpdate(
      { _id: toMongoId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      log.info(`Crag not found for update: ${id}`, {
        action: 'updateCrag',
        duration: Date.now() - start,
      })
      return null
    }

    log.info(`Updated crag: ${id}`, {
      action: 'updateCrag',
      duration: Date.now() - start,
      metadata: { cragId: id, fields: Object.keys(updates) },
    })

    return toCrag(result)
  } catch (error) {
    log.error(`Failed to update crag: ${id}`, error, {
      action: 'updateCrag',
      duration: Date.now() - start,
      metadata: { cragId: id },
    })
    throw error
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to db/index.ts

**Step 4: Commit**

```bash
git add src/lib/db/index.ts
git commit -m "feat(db): add createCrag and updateCrag functions"
```

---

### Task 3: Add POST handler to /api/crags and create /api/crags/[id] route

**Files:**
- Modify: `src/app/api/crags/route.ts` (add POST)
- Create: `src/app/api/crags/[id]/route.ts` (GET + PATCH)

**Step 1: Add POST to existing crags route**

Add to `src/app/api/crags/route.ts` after the GET handler:

```typescript
import { createCrag, getAllCrags, getCragsByCityId } from '@/lib/db'
import { getAuth } from '@/lib/auth'

// Slug format validation: lowercase letters, numbers, hyphens (not start/end with -)
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * POST /api/crags
 * 创建新岩场 (需要 admin 权限)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, cityId, location, description, approach, coordinates } = body

    // Validate required fields
    if (!id || !name || !cityId || !location || !description || !approach) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!SLUG_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID 格式无效，仅支持小写字母、数字和连字符' },
        { status: 400 }
      )
    }

    const crag = await createCrag({
      id,
      name,
      cityId,
      location,
      description,
      approach,
      developmentTime: '',
      ...(coordinates ? { coordinates } : {}),
    })

    log.info('Crag created', {
      action: 'POST /api/crags',
      metadata: { cragId: id, name },
    })

    return NextResponse.json({ success: true, crag }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建岩场失败'
    const status = message.includes('已存在') ? 409 : 500
    log.error('Failed to create crag', error, { action: 'POST /api/crags' })
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
```

**Step 2: Create /api/crags/[id]/route.ts**

Create `src/app/api/crags/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCragById, updateCrag } from '@/lib/db'
import { getAuth } from '@/lib/auth'
import { createModuleLogger } from '@/lib/logger'

const log = createModuleLogger('API:Crag')

/**
 * GET /api/crags/[id]
 * 获取单个岩场
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const crag = await getCragById(id)
    if (!crag) {
      return NextResponse.json(
        { success: false, error: '岩场不存在' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, crag })
  } catch (error) {
    log.error('Failed to get crag', error, {
      action: 'GET /api/crags/[id]',
      metadata: { cragId: id },
    })
    return NextResponse.json(
      { success: false, error: '获取岩场失败' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/crags/[id]
 * 更新岩场信息 (需要 admin 权限)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Auth check
    const auth = await getAuth()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const body = await request.json()
    // Only allow updating specific fields (not id)
    const allowedFields = ['name', 'cityId', 'location', 'description', 'approach', 'coordinates', 'coverImages']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可更新的字段' },
        { status: 400 }
      )
    }

    const crag = await updateCrag(id, updates)
    if (!crag) {
      return NextResponse.json(
        { success: false, error: '岩场不存在' },
        { status: 404 }
      )
    }

    log.info('Crag updated', {
      action: 'PATCH /api/crags/[id]',
      metadata: { cragId: id, fields: Object.keys(updates) },
    })

    return NextResponse.json({ success: true, crag })
  } catch (error) {
    log.error('Failed to update crag', error, {
      action: 'PATCH /api/crags/[id]',
      metadata: { cragId: id },
    })
    return NextResponse.json(
      { success: false, error: '更新岩场失败' },
      { status: 500 }
    )
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/crags/route.ts src/app/api/crags/\[id\]/route.ts
git commit -m "feat(api): add POST /api/crags and GET/PATCH /api/crags/[id]"
```

---

### Task 4: Add editor hub card for crag management

**Files:**
- Modify: `src/app/[locale]/editor/page.tsx`

**Step 1: Add the Mountain import and new card entry**

In the imports, add `Mountain` to the lucide imports (it's already imported but check).
Add a new card to the `cards` array:

```typescript
{
  href: '/editor/crags' as const,
  icon: Mountain,
  title: '岩场管理',
  description: '添加和编辑岩场基本信息',
  detail: '新建岩场 → 填写信息 → 保存',
},
```

Place it as the first card in the array (crags are the top-level entity).

**Step 2: Verify it renders**

Run: `npm run dev` and navigate to `/editor`. Verify 4 cards appear.

**Step 3: Commit**

```bash
git add src/app/\[locale\]/editor/page.tsx
git commit -m "feat(editor): add crag management card to editor hub"
```

---

### Task 5: Create crag list page (/editor/crags)

**Files:**
- Create: `src/app/[locale]/editor/crags/page.tsx`

**Step 1: Create the crag list page**

This is a client component that:
- Uses `useCragRoutes()` hook to load crags (reuse existing hook)
- Shows crags as cards with name + city info
- Has a "新建岩场" button that links to `/editor/crags/new`
- Uses `EditorPageHeader` for consistent header
- Uses `CragSelector` patterns but as a full list (not dropdown)

Key patterns to follow from existing editor pages:
- `EditorPageHeader` with `title="岩场管理"` and `icon={<Mountain />}`
- `useBreakAppShellLimit()` for desktop width
- `AppTabbar` at bottom for mobile
- Card style matching existing `editor/page.tsx` card style
- Fetch route counts per crag to display on cards

The page fetches all crags via `/api/crags`, groups by city, and shows cards. Each card links to `/editor/crags/{id}` for editing.

**Step 2: Verify it renders**

Run dev server, navigate to `/editor/crags`. Verify crag list shows.

**Step 3: Commit**

```bash
git add src/app/\[locale\]/editor/crags/page.tsx
git commit -m "feat(editor): add crag list page"
```

---

### Task 6: Create crag edit page (/editor/crags/[id])

**Files:**
- Create: `src/app/[locale]/editor/crags/[id]/page.tsx`

**Step 1: Create the edit/create page**

This is a client component with two modes:
- **Create mode** (`id === 'new'`): Empty form, slug auto-generated from name via pinyin-pro
- **Edit mode** (`id !== 'new'`): Fetch existing crag from `/api/crags/{id}`, populate form

Form sections:
1. **基本信息**: name (Input), slug preview (readonly, editable toggle in create mode), city (select dropdown from CITIES)
2. **位置**: location (Input), longitude/latitude (number inputs)
3. **详情**: description (Textarea), approach (Textarea)
4. **封面图**: Grid of existing cover images + upload button (Task 7)

Slug generation logic:
```typescript
import { pinyin } from 'pinyin-pro'

function generateSlug(name: string): string {
  return pinyin(name, { toneType: 'none', separator: '-' })
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
```

Save button: POST (create) or PATCH (edit) to `/api/crags` or `/api/crags/{id}`.
On success, redirect to `/editor/crags` list page.

Use `useToast` for success/error feedback, consistent with routes editor.

Important: Use `<Input>` and `<Textarea>` from shadcn/ui (NOT raw `<input>`/`<textarea>`). Exception: number inputs for coordinates can use `<input type="number">` with eslint-disable comment.

**Step 2: Test create flow**

Navigate to `/editor/crags/new`, fill form, verify slug auto-generates, submit.

**Step 3: Test edit flow**

Click an existing crag from list, verify data loads, modify a field, save.

**Step 4: Commit**

```bash
git add src/app/\[locale\]/editor/crags/\[id\]/page.tsx
git commit -m "feat(editor): add crag create/edit page with pinyin slug generation"
```

---

### Task 7: Add cover image management to edit page

**Files:**
- Modify: `src/app/[locale]/editor/crags/[id]/page.tsx`

**Step 1: Add cover image section to the form**

Below the detail section, add a cover image management area:
- Display existing cover images as a thumbnail grid (using `getCragCoverUrl(cragId, index)`)
- "上传封面图" button triggers a hidden `<input type="file">` (file input is exempt from IME rule)
- Upload uses existing `/api/upload` endpoint with FormData: `{ file, cragId, routeName: 'CragSurface/{index}' }`
  - Actually, cover images use a different R2 path: `CragSurface/{cragId}/{index}.jpg`
  - Need to adjust upload to support cover image path, OR use a dedicated simple upload
- After upload, update `crag.coverImages` array via PATCH
- Delete button on each thumbnail removes from R2 and updates coverImages

For cover images, the R2 key pattern is `CragSurface/{cragId}/{index}.jpg` (from `getCragCoverUrl`).

The upload endpoint already supports custom paths via `cragId` + `routeName` params. We can construct the correct key by setting:
- `cragId`: `CragSurface/{cragId}` (since the key becomes `{cragId}/{routeName}.jpg`)
- `routeName`: `{index}`

Or simpler: just use the raw upload pattern. Check the upload API — it constructs key as `{safeCragId}/{routeName}.jpg`. So set `cragId` to `CragSurface/{cragId}` and `routeName` to `{index}`.

Actually the safest approach: modify the upload to accept a `coverIndex` parameter, or just compute the full key. For now, use the existing mechanism creatively:
- `cragId` = `CragSurface`
- `routeName` = `{actualCragId}/{index}`

This produces key: `CragSurface/{actualCragId}/{index}.jpg` ✓

For deletion, use the existing faces API pattern (DeleteObjectCommand).

**Step 2: Test upload and display**

Upload a cover image, verify it appears in the grid with correct URL.

**Step 3: Commit**

```bash
git add src/app/\[locale\]/editor/crags/\[id\]/page.tsx
git commit -m "feat(editor): add cover image upload and management"
```

---

### Task 8: Update Crag type to make developmentTime optional

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Make developmentTime optional**

The design says we don't need developmentTime for new crags, but existing crags have it. Change:

```typescript
developmentTime?: string   // was: developmentTime: string
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (or fix any issues in files that assume it's required)

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): make Crag.developmentTime optional"
```

---

### Task 9: Verify all data channels work end-to-end

**Files:** None (manual testing)

**Step 1: Create a test crag via the editor**

Navigate to `/editor/crags/new`, create a crag with:
- Name: "测试岩场"
- City: luoyuan
- Location: "测试地址"
- Description: "测试描述"
- Approach: "测试前往方式"

**Step 2: Verify homepage shows the new crag**

Navigate to `/` (with luoyuan city selected). The new crag should appear in the list.

**Step 3: Verify crag detail page works**

Navigate to `/crag/{slug}`. The page should render via ISR fallback (dynamicParams=true).

**Step 4: Verify editor pages see the crag**

Navigate to `/editor/routes`. The new crag should appear in the CragSelector dropdown.

**Step 5: Verify API returns the crag**

Run: `curl http://localhost:3000/api/crags | jq '.crags[] | select(.name == "测试岩场")'`

**Step 6: Edit the crag**

Navigate to `/editor/crags/{slug}`, modify description, save. Verify changes persist.

**Step 7: Clean up test data (optional)**

Delete the test crag directly from MongoDB if needed.

---

### Task 10: Run quality checks and final commit

**Step 1: Run ESLint**

Run: `npm run lint`
Expected: No new errors

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run tests**

Run: `npm run test:run`
Expected: All existing tests pass

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address lint and type issues from crag management feature"
```

---

## Summary of all files changed

| Action | File |
|--------|------|
| Install | `pinyin-pro` (npm package) |
| Modify | `src/types/index.ts` — make developmentTime optional |
| Modify | `src/lib/db/index.ts` — add createCrag, updateCrag |
| Modify | `src/app/api/crags/route.ts` — add POST handler |
| Create | `src/app/api/crags/[id]/route.ts` — GET + PATCH |
| Modify | `src/app/[locale]/editor/page.tsx` — add 4th card |
| Create | `src/app/[locale]/editor/crags/page.tsx` — list page |
| Create | `src/app/[locale]/editor/crags/[id]/page.tsx` — edit page |
