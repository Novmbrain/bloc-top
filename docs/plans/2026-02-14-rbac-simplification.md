# RBAC 简化实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 3 用户角色 × 2 岩场角色 简化为 2 × 1，删除 `crag_creator` 和 `creator` 角色。

**Architecture:** 只保留 `admin` + `user` 两个用户角色，岩场级只保留 `manager`。创建岩场和管理权限收归 admin 独有。

**Tech Stack:** TypeScript, Next.js App Router, MongoDB, Vitest

---

### Task 1: 类型定义 + 权限函数

**Files:**
- Modify: `src/types/index.ts:145-152`
- Modify: `src/lib/permissions.ts` (全文)

**Step 1: 更新类型定义**

```typescript
// src/types/index.ts:145
export type UserRole = 'admin' | 'user'

// src/types/index.ts:152
export type CragPermissionRole = 'manager'
```

更新注释，删除 creator 相关说明。

**Step 2: 更新权限函数**

```typescript
// src/lib/permissions.ts

// 删除 roles.crag_creator 定义（第 22-28 行整块）

// canCreateCrag — 仅 admin
export function canCreateCrag(userRole: UserRole): boolean {
  return userRole === 'admin'
}

// canAccessEditor — 去掉 crag_creator 分支
export async function canAccessEditor(userId: string, userRole: UserRole): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection<CragPermission>('crag_permissions').findOne({ userId })
  return perm !== null
}

// canManagePermissions — 仅 admin（删除 DB 查询）
export async function canManagePermissions(userId: string, cragId: string, userRole: UserRole): Promise<boolean> {
  return userRole === 'admin'
}

// canDeleteCrag — 仅 admin（删除 DB 查询）
export async function canDeleteCrag(userId: string, cragId: string, userRole: UserRole): Promise<boolean> {
  return userRole === 'admin'
}
```

**Step 3: 运行类型检查**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: 编译错误指向其他文件中的 `'crag_creator'` 引用（这些在后续 Task 中修复）

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/permissions.ts
git commit -m "refactor(rbac): simplify types and permission functions — remove crag_creator and creator roles"
```

---

### Task 2: 更新权限测试

**Files:**
- Modify: `src/lib/permissions.test.ts` (全文)

**Step 1: 更新测试用例**

关键变更：
- 删除 `roles.crag_creator` 相关断言
- `canCreateCrag('crag_creator')` → 删除，改为测试 `canCreateCrag('user')` 返回 false
- `canEditCrag` 测试中 `'crag_creator'` 角色 → 改为 `'user'`
- `canDeleteCrag` 测试：删除 "allow creator to delete"，改为 "deny non-admin from deleting"（不再查 DB）
- `canManagePermissions` 测试：删除 "allow creator"，改为 "deny non-admin"（不再查 DB）
- `canAccessEditor` 测试：删除 "allow crag_creator without DB query"
- `getEditableCragIds` 测试中 `'crag_creator'` → `'user'`

**Step 2: 运行测试**

Run: `npm run test:run -- src/lib/permissions.test.ts`
Expected: 全部通过

**Step 3: Commit**

```bash
git add src/lib/permissions.test.ts
git commit -m "test(rbac): update permission tests for simplified role model"
```

---

### Task 3: API 路由更新

**Files:**
- Modify: `src/app/api/crags/route.ts:45-57` — 更新注释和错误信息
- Modify: `src/app/api/crag-permissions/route.ts` — 删除 `VALID_ROLES` 中的 `'creator'`，删除 creator 特殊逻辑
- Modify: `src/app/api/editor/crags/route.ts` — 已无 crag_creator 引用（无需改）
- Modify: `src/app/api/editor/search-users/route.ts:18` — 更新注释

**Step 1: 更新 crags/route.ts**

```typescript
// 第 45 行注释
// 创建新岩场 (需要 admin 权限)

// 第 55-57 行错误信息
{ success: false, error: '需要管理员权限' }
```

**Step 2: 更新 crag-permissions/route.ts**

```typescript
// 第 12 行 — 只有 manager
const VALID_ROLES: CragPermissionRole[] = ['manager']

// 第 106-112 行 — 删除 creator 特殊分配逻辑（整块 if 删除）

// 第 173-180 行 — 删除 creator 保护逻辑（整块 if 删除）
// 因为不再有 creator 角色，所有权限都可以被 admin 删除
```

更新注释：`creator/admin` → `admin`

**Step 3: 更新 search-users/route.ts 注释**

```typescript
// 第 18 行
// Requires editor access (admin or user with crag permissions).
```

**Step 4: 运行类型检查**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 无错误或仅剩 UI 文件错误

**Step 5: Commit**

```bash
git add src/app/api/crags/route.ts src/app/api/crag-permissions/route.ts src/app/api/editor/search-users/route.ts
git commit -m "refactor(rbac): update API routes for simplified roles"
```

---

### Task 4: API 测试更新

**Files:**
- Modify: `src/app/api/editor/crags/route.test.ts` — `crag_creator` → `user`
- Modify: `src/app/api/crags/[id]/areas/route.test.ts` — `crag_creator` → `user`

**Step 1: 批量替换 crag_creator**

在两个测试文件中，将 `role: 'crag_creator'` 替换为 `role: 'user'`。

**Step 2: 运行测试**

Run: `npm run test:run -- src/app/api/editor/crags/route.test.ts src/app/api/crags`
Expected: 全部通过

**Step 3: Commit**

```bash
git add src/app/api/editor/crags/route.test.ts "src/app/api/crags/[id]/areas/route.test.ts"
git commit -m "test(rbac): update API tests for simplified roles"
```

---

### Task 5: UI 页面更新

**Files:**
- Modify: `src/app/[locale]/editor/crags/page.tsx` — badge 标签简化
- Modify: `src/app/[locale]/editor/users/page.tsx` — 角色选择 2 项
- Modify: `src/components/editor/crag-permissions-panel.tsx` — 去掉 creator/manager 区分

**Step 1: 更新岩场列表 badge**

```typescript
// src/app/[locale]/editor/crags/page.tsx
// ROLE_CONFIG 简化为两种
const ROLE_CONFIG = {
  admin: { label: '系统管理', icon: Settings, color: 'var(--theme-error)' },
  manager: { label: '管理员', icon: Shield, color: 'var(--theme-primary)' },
} as const
```

- 类型 `CragWithPermission` 中 `permissionRole` 改为 `'manager' | 'admin'`
- 删除 `CragPermissionRole` import，删除 `Crown` icon import

**Step 2: 更新用户管理页**

```typescript
// src/app/[locale]/editor/users/page.tsx
// ROLE_CONFIG 改为 2 项
const ROLE_CONFIG: Record<UserRole, { label: string; variant: ... }> = {
  admin: { label: '系统管理员', variant: 'default' },
  user: { label: '普通用户', variant: 'outline' },
}

// RoleChangeDrawer 中 roles 数组
const roles: UserRole[] = ['admin', 'user']

// 角色描述更新
{role === 'admin' && '全部权限：创建岩场、管理用户、分配岩场管理员'}
{role === 'user' && '浏览为主，被分配为岩场管理员后可编辑对应岩场'}
```

**Step 3: 更新权限面板**

在 `crag-permissions-panel.tsx` 中：
- `isCreator` 判断 → 删除（不再有 creator 角色）
- 所有人统一显示为"管理员"
- 移除 creator 不可删除的保护（admin 可删除任何人）

**Step 4: 运行 lint + 类型检查**

Run: `npm run lint && npx tsc --noEmit`
Expected: 全部通过

**Step 5: Commit**

```bash
git add "src/app/[locale]/editor/crags/page.tsx" "src/app/[locale]/editor/users/page.tsx" src/components/editor/crag-permissions-panel.tsx
git commit -m "refactor(rbac): simplify UI for two-role model"
```

---

### Task 6: 数据库迁移脚本

**Files:**
- Modify: `scripts/seed.ts` — 添加迁移函数

**Step 1: 添加迁移函数**

在 seed.ts 中添加 `migrateRbacSimplification()`:

```typescript
async function migrateRbacSimplification() {
  const db = await getDatabase()

  // 1. crag_permissions: creator → manager
  const permResult = await db.collection('crag_permissions').updateMany(
    { role: 'creator' },
    { $set: { role: 'manager' } }
  )
  console.log(`crag_permissions: ${permResult.modifiedCount} creator → manager`)

  // 2. user: crag_creator → user
  const userResult = await db.collection('user').updateMany(
    { role: 'crag_creator' },
    { $set: { role: 'user' } }
  )
  console.log(`user: ${userResult.modifiedCount} crag_creator → user`)
}
```

**Step 2: Commit**

```bash
git add scripts/seed.ts
git commit -m "chore(rbac): add migration for role simplification"
```

---

### Task 7: 文档更新

**Files:**
- Modify: `CLAUDE.md` — RBAC 章节
- Modify: `doc/RBAC_DESIGN.md` — 角色定义
- Modify: `doc/AUTH_SYSTEM.md` — RBAC 部分

**Step 1: 更新所有文档中的角色描述**

- `UserRole`: `'admin' | 'user'`（删除 `crag_creator`）
- `CragPermissionRole`: `'manager'`（删除 `creator`）
- 权限函数说明同步更新
- 所有"创建者"→"管理员"，"crag_creator"→删除

**Step 2: Commit**

```bash
git add CLAUDE.md doc/RBAC_DESIGN.md doc/AUTH_SYSTEM.md
git commit -m "docs: update RBAC documentation for simplified role model"
```

---

### Task 8: 最终验证

**Step 1: 运行全部测试**

Run: `npm run test:run`
Expected: 全部通过

**Step 2: 运行类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 全部通过

**Step 3: Grep 确认无残留**

Run: `grep -rn "crag_creator\|'creator'" src/ --include="*.ts" --include="*.tsx"`
Expected: 无匹配（除了可能的注释或迁移代码）

**Step 4: 本地构建测试**

Run: `npm run build`
Expected: 构建成功
