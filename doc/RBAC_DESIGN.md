# RBAC & 用户管理系统设计文档

> 状态: **Phase 3 已完成** | 创建: 2026-02-13 | Phase 1: 2026-02-13 | Phase 2: 2026-02-13 | Phase 3: 2026-02-13

## 1. 需求概述

为 BlocTop 添加基于角色的访问控制（RBAC），支持：
- **Admin** 管理所有用户和岩场
- **岩场创建者** 创建岩场并管理自己创建的岩场，可分配管理者
- **岩场管理者** 管理被分配的岩场内容（线路/岩面/Beta）

### 设计决策

| 决策项 | 结论 |
|--------|------|
| `crag_creator` 角色分配方式 | 由 admin 在用户管理页面分配 |
| 岩场管理者分配方式 | 分配后即时生效，无邀请流程 |
| 邮件通知 | 不需要 |
| RBAC 插件选型 | better-auth Admin 插件（非 Organization） |
| 岩场级权限存储 | 自定义 `crag_permissions` MongoDB collection |

---

## 2. 权限模型

### 2.1 两层架构

```
┌──────────────────────────────────────────────────┐
│  Layer 1: 用户级角色 (better-auth Admin 插件)       │
│                                                   │
│  admin         → 全局超级管理员，可管理用户和所有岩场  │
│  crag_creator  → 可创建岩场，由 admin 分配           │
│  user          → 默认角色，仅浏览（无编辑器访问权限）   │
└──────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────┐
│  Layer 2: 岩场级权限 (自定义 crag_permissions)       │
│                                                   │
│  creator  → 岩场全部权限 + 可分配/移除 manager       │
│  manager  → 可编辑线路/岩面/Beta/区域 (不能删除岩场)  │
└──────────────────────────────────────────────────┘
```

### 2.2 角色能力矩阵

| 操作 | admin | crag_creator | crag manager | user |
|------|-------|-------------|--------------|------|
| 浏览所有岩场/线路 | ✅ | ✅ | ✅ | ✅ |
| 进入编辑器 | ✅ | ✅ | ✅ | ❌ |
| 创建新岩场 | ✅ | ✅ | ❌ | ❌ |
| 编辑岩场信息 | ✅ 全部 | ✅ 自己的 | ✅ 被分配的 | ❌ |
| 删除岩场 | ✅ 全部 | ✅ 自己的 | ❌ | ❌ |
| 编辑线路/岩面/Beta | ✅ 全部 | ✅ 自己岩场的 | ✅ 被分配岩场的 | ❌ |
| 管理岩场区域 | ✅ 全部 | ✅ 自己岩场的 | ✅ 被分配岩场的 | ❌ |
| 分配 crag manager | ✅ 全部 | ✅ 自己岩场的 | ❌ | ❌ |
| 管理用户 (角色分配) | ✅ | ❌ | ❌ | ❌ |
| 管理城市/地级市 | ✅ | ❌ | ❌ | ❌ |

### 2.3 权限判定逻辑

```typescript
// 伪代码
function canEditCrag(userId: string, cragId: string, userRole: string): boolean {
  // 1. Admin 拥有所有权限
  if (userRole === 'admin') return true

  // 2. 查询 crag_permissions
  const perm = db.crag_permissions.findOne({ userId, cragId })
  if (perm?.role === 'creator') return true  // 创建者有全部权限
  if (perm?.role === 'manager') return true  // 管理者有编辑权限

  // 3. 无权限
  return false
}

function canDeleteCrag(userId: string, cragId: string, userRole: string): boolean {
  if (userRole === 'admin') return true
  const perm = db.crag_permissions.findOne({ userId, cragId })
  return perm?.role === 'creator'  // 只有创建者和 admin 可删除
}

function canAssignManager(userId: string, cragId: string, userRole: string): boolean {
  if (userRole === 'admin') return true
  const perm = db.crag_permissions.findOne({ userId, cragId })
  return perm?.role === 'creator'  // 只有创建者和 admin 可分配管理者
}

function canCreateCrag(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'crag_creator'
}

function canAccessEditor(userId: string, userRole: string): boolean {
  if (userRole === 'admin' || userRole === 'crag_creator') return true
  // user 角色如果有任何 crag_permissions 记录也可进入编辑器
  return db.crag_permissions.exists({ userId })
}
```

---

## 3. 数据模型

### 3.1 用户角色 (better-auth Admin 插件)

已有的 `user.role` 字段直接兼容，无需迁移。

```typescript
// better-auth Admin 插件自动管理
// user collection 中的 role 字段
type UserRole = 'admin' | 'crag_creator' | 'user'
```

Admin 插件额外添加的字段（自动迁移）：
- `user.banned: boolean`
- `user.banReason: string`
- `user.banExpires: Date`
- `session.impersonatedBy: string`

### 3.2 Access Control 定义

```typescript
// src/lib/permissions.ts
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'

const statement = {
  ...defaultStatements,  // user: [...], session: [...]
  editor: ["access"] as const,
  crag:   ["create", "update", "delete"] as const,
  route:  ["create", "update", "delete"] as const,
  face:   ["upload", "rename", "delete"] as const,
  beta:   ["approve", "delete"] as const,
} as const

export const ac = createAccessControl(statement)

export const roles = {
  user: ac.newRole({}),  // 无权限

  crag_creator: ac.newRole({
    editor: ["access"],
    crag:   ["create", "update"],
    route:  ["create", "update", "delete"],
    face:   ["upload", "rename", "delete"],
    beta:   ["approve", "delete"],
  }),

  admin: ac.newRole({
    ...adminAc.statements,  // 继承默认的 user/session 管理权限
    editor: ["access"],
    crag:   ["create", "update", "delete"],
    route:  ["create", "update", "delete"],
    face:   ["upload", "rename", "delete"],
    beta:   ["approve", "delete"],
  }),
}
```

### 3.3 `crag_permissions` Collection

```typescript
interface CragPermission {
  userId: string       // better-auth user._id (ObjectId as string)
  cragId: string       // Crag.id (e.g. 'yuan-tong-si')
  role: 'creator' | 'manager'
  assignedBy: string   // 分配者的 userId
  createdAt: Date
}

// MongoDB Index
db.crag_permissions.createIndex({ userId: 1, cragId: 1 }, { unique: true })
db.crag_permissions.createIndex({ cragId: 1 })
```

### 3.4 Crag 类型扩展

```typescript
// src/types/index.ts — Crag 接口新增字段
interface Crag {
  // ... 现有字段 ...
  createdBy?: string    // 创建者 userId（新字段）
  createdAt?: Date      // 创建时间（新字段）
  updatedAt?: Date      // 最后更新时间（新字段）
}
```

> 注意：`createdBy` 设为可选以兼容现有数据。迁移脚本会为所有现有岩场设置此字段。

---

## 4. Auth 配置变更

### 4.1 Server 端 (`src/lib/auth.ts`)

```typescript
import { admin } from 'better-auth/plugins'
import { ac, roles } from '@/lib/permissions'

const instance = betterAuth({
  // ... 现有配置 ...

  // 移除 user.additionalFields.role（Admin 插件自带）
  user: {},

  plugins: [
    admin({
      ac,
      roles,
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
    magicLink({ /* ... */ }),
    passkey({ /* ... */ }),
  ],
})
```

### 4.2 Client 端 (`src/lib/auth-client.ts`)

```typescript
import { adminClient } from 'better-auth/client/plugins'
import { ac, roles } from '@/lib/permissions'

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    magicLinkClient(),
    passkeyClient(),
  ],
})
```

---

## 5. API 路由权限矩阵

### 5.1 现有路由改造

| 路由 | 方法 | 当前状态 | 目标权限 |
|------|------|---------|---------|
| `/api/crags` | POST | ✅ admin | admin / crag_creator |
| `/api/crags/[id]` | PATCH | ✅ admin | canEditCrag(userId, cragId) |
| `/api/crags/[id]/areas` | PATCH | ❌ 无检查 | canEditCrag(userId, cragId) |
| `/api/routes` | POST | ❌ 无检查 | canEditCrag(userId, route.cragId) |
| `/api/routes/[id]` | PATCH | ❌ 无检查 | canEditCrag(userId, route.cragId) |
| `/api/routes/[id]` | DELETE | ❌ 无检查 | canEditCrag(userId, route.cragId) |
| `/api/upload` | POST | ❌ 无检查 | canEditCrag(userId, cragId) |
| `/api/faces` | PATCH | ❌ 无检查 | canEditCrag(userId, cragId) |
| `/api/faces` | DELETE | ❌ 无检查 | canEditCrag(userId, cragId) |
| `/api/cities` | POST | ✅ admin | 保持 admin |
| `/api/cities/[id]` | PATCH/DELETE | ✅ admin | 保持 admin |
| `/api/prefectures` | POST | ✅ admin | 保持 admin |
| `/api/prefectures/[id]` | PATCH/DELETE | ✅ admin | 保持 admin |

### 5.2 新增 API 路由

| 路由 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/crag-permissions` | GET | admin / crag creator | 列出岩场的权限记录 |
| `/api/crag-permissions` | POST | admin / crag creator | 分配管理者 |
| `/api/crag-permissions` | DELETE | admin / crag creator | 移除管理者 |

> better-auth Admin 插件自动注册的路由（通过 `/api/auth/[...all]`）：
> `listUsers`, `setRole`, `banUser`, `unbanUser`, `removeUser` 等

### 5.3 权限工具函数

```typescript
// src/lib/permissions.ts — 新增导出

export async function requireAuth(headers: Headers): Promise<Session> {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers })
  if (!session) throw new AuthError('未登录', 401)
  return session
}

export async function canEditCrag(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection('crag_permissions').findOne({ userId, cragId })
  return perm !== null
}

export async function canDeleteCrag(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection('crag_permissions').findOne({ userId, cragId, role: 'creator' })
  return perm !== null
}

export async function canCreateCrag(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'crag_creator'
}

export async function canManagePermissions(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection('crag_permissions').findOne({ userId, cragId, role: 'creator' })
  return perm !== null
}

export async function canAccessEditor(userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin' || userRole === 'crag_creator') return true
  const db = await getDatabase()
  const perm = await db.collection('crag_permissions').findOne({ userId })
  return perm !== null
}

export async function getEditableCragIds(userId: string, userRole: string): Promise<string[] | 'all'> {
  if (userRole === 'admin') return 'all'
  const db = await getDatabase()
  const perms = await db.collection('crag_permissions').find({ userId }).toArray()
  return perms.map(p => p.cragId)
}
```

---

## 6. 编辑器改造

### 6.1 Layout 权限放开

```typescript
// src/app/[locale]/editor/layout.tsx
// 改为：允许 admin + crag_creator + 有 crag_permissions 的用户
const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect('/login')

const userId = session.user.id
const role = session.user.role

if (!(await canAccessEditor(userId, role))) {
  redirect('/')
}
```

### 6.2 编辑器页面过滤

所有编辑器页面需要根据权限过滤岩场列表：

```typescript
// 通用模式：获取用户可编辑的岩场
const editableCragIds = await getEditableCragIds(userId, role)
const crags = editableCragIds === 'all'
  ? await getAllCrags()
  : await getCragsByIds(editableCragIds)
```

| 页面 | 改造内容 |
|------|---------|
| `editor/crags/page.tsx` | 只展示有权限的岩场；admin 和 crag_creator 显示"创建岩场"按钮 |
| `editor/routes/page.tsx` | CragSelector 只显示有权限的岩场 |
| `editor/faces/page.tsx` | 同上 |
| `editor/betas/page.tsx` | 同上 |
| `editor/cities/page.tsx` | 保持 admin-only（在页面内检查） |
| `editor/page.tsx` | 添加"用户管理"入口（admin-only） |

### 6.3 CragSelector 组件适配

```typescript
// src/components/editor/crag-selector.tsx
// 新增 prop：接收过滤后的岩场列表
interface CragSelectorProps {
  crags: Crag[]  // 由父页面传入已过滤的岩场列表
  // ... 现有 props
}
```

---

## 7. Admin 用户管理页面

### 7.1 页面结构

```
editor/users/page.tsx         — Admin-only 用户管理页面
├── UserDataTable             — 用户列表（TanStack Table + shadcn/ui Table）
│   ├── 搜索栏               — 按邮箱/名称搜索
│   ├── 角色筛选              — Filter by role
│   ├── 列: Avatar, 邮箱, 角色(Badge), 注册时间, 操作
│   └── 分页                 — limit/offset 分页
└── RoleDialog               — 角色修改弹窗（Select 组件）
```

### 7.2 依赖组件

需要安装的 shadcn/ui 组件（部分可能已安装）：

```bash
npx shadcn@latest add table badge dialog dropdown-menu select
npm install @tanstack/react-table
```

### 7.3 better-auth Admin API 使用

```typescript
// 列出用户（分页 + 搜索）
const { data } = await authClient.admin.listUsers({
  query: {
    limit: 20,
    offset: 0,
    searchField: 'email',
    searchValue: searchTerm,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  },
})

// 修改角色
await authClient.admin.setRole({
  userId: targetUserId,
  role: 'crag_creator',  // 'admin' | 'crag_creator' | 'user'
})
```

---

## 8. 岩场权限管理 UI

### 8.1 入口

在岩场编辑页面（`editor/crags/[id]/`）内，添加"管理者"面板：
- 显示当前管理者列表（creator + managers）
- 添加管理者（按邮箱搜索用户 → 分配 manager 角色）
- 移除管理者

### 8.2 API 接口

```
GET  /api/crag-permissions?cragId=xxx
     → [{ userId, role, user: { email, name, image }, createdAt }]

POST /api/crag-permissions
     Body: { cragId, userId, role: 'manager' }
     → { success: true }

DELETE /api/crag-permissions
     Body: { cragId, userId }
     → { success: true }
```

---

## 9. 数据迁移

### 9.1 迁移脚本 (`scripts/migrate-crag-ownership.ts`)

```typescript
// 为所有现有岩场设置 createdBy 和时间戳
// 创建 crag_permissions 记录（现有 admin 成为所有岩场的 creator）
async function migrate() {
  const db = await getDatabase()
  const adminUser = await db.collection('user').findOne({ role: 'admin' })

  // 1. 更新所有 crag 文档
  await db.collection('crags').updateMany(
    { createdBy: { $exists: false } },
    { $set: { createdBy: adminUser._id.toString(), createdAt: new Date(), updatedAt: new Date() } }
  )

  // 2. 为 admin 创建 crag_permissions
  const crags = await db.collection('crags').find({}).toArray()
  const permissions = crags.map(c => ({
    userId: adminUser._id.toString(),
    cragId: c.id,
    role: 'creator',
    assignedBy: adminUser._id.toString(),
    createdAt: new Date(),
  }))

  if (permissions.length > 0) {
    await db.collection('crag_permissions').insertMany(permissions)
  }

  // 3. 创建索引
  await db.collection('crag_permissions').createIndex(
    { userId: 1, cragId: 1 },
    { unique: true }
  )
  await db.collection('crag_permissions').createIndex({ cragId: 1 })
}
```

---

## 10. 实施计划

### Phase 1: 数据模型 & Auth 基础设施

| # | 任务 | 文件 |
|---|------|------|
| 1.1 | 创建 `src/lib/permissions.ts` — AC 定义 + 角色 + 权限工具函数 | 新建 |
| 1.2 | 改造 `src/lib/auth.ts` — 引入 Admin 插件，移除 `additionalFields.role` | 修改 |
| 1.3 | 改造 `src/lib/auth-client.ts` — 添加 `adminClient` | 修改 |
| 1.4 | 扩展 `src/types/index.ts` — Crag 新增 `createdBy`/`createdAt`/`updatedAt`，新增 `CragPermission` 类型 | 修改 |
| 1.5 | 扩展 `src/lib/db/index.ts` — crag_permissions CRUD 函数 | 修改 |
| 1.6 | 编写迁移脚本 `scripts/migrate-crag-ownership.ts` | 新建 |
| 1.7 | 执行迁移 + 验证 | - |

**验证**: `npm run build` 通过 + 现有登录/编辑功能不受影响

### Phase 2: API 路由权限保护

| # | 任务 | 文件 |
|---|------|------|
| 2.1 | 保护 `/api/routes` POST | 修改 |
| 2.2 | 保护 `/api/routes/[id]` PATCH/DELETE | 修改 |
| 2.3 | 保护 `/api/upload` POST | 修改 |
| 2.4 | 保护 `/api/faces` PATCH/DELETE | 修改 |
| 2.5 | 保护 `/api/crags/[id]/areas` PATCH | 修改 |
| 2.6 | 改造 `/api/crags` POST — 自动设置 `createdBy` + 创建 `crag_permissions` | 修改 |
| 2.7 | 新建 `/api/crag-permissions` GET/POST/DELETE | 新建 |

**验证**: 未登录 / 无权限用户无法 POST/PATCH/DELETE

### Phase 3: 编辑器权限适配

| # | 任务 | 文件 |
|---|------|------|
| 3.1 | 改造 `editor/layout.tsx` — 放开非 admin 用户 | 修改 |
| 3.2 | 改造 `editor/crags/page.tsx` — 过滤岩场 + 创建按钮权限 | 修改 |
| 3.3 | 改造 `editor/routes/page.tsx` — CragSelector 过滤 | 修改 |
| 3.4 | 改造 `editor/faces/page.tsx` — 同上 | 修改 |
| 3.5 | 改造 `editor/betas/page.tsx` — 同上 | 修改 |
| 3.6 | `editor/cities/page.tsx` — 添加页面级 admin 检查 | 修改 |
| 3.7 | 适配 `CragSelector` 组件接收过滤列表 | 修改 |

**验证**: crag_creator 只看到自己的岩场，manager 只看到被分配的

### Phase 4: Admin 用户管理页面

| # | 任务 | 文件 |
|---|------|------|
| 4.1 | 安装 `@tanstack/react-table` + shadcn 组件 | - |
| 4.2 | 新建 `editor/users/page.tsx` — 用户列表 + 角色管理 | 新建 |
| 4.3 | 更新 `editor/page.tsx` — 添加用户管理入口 | 修改 |

**验证**: Admin 能列出用户 + 修改角色

### Phase 5: 岩场权限管理 UI

| # | 任务 | 文件 |
|---|------|------|
| 5.1 | 岩场管理者面板 — 列表 + 添加 + 移除 | 新建/修改 |
| 5.2 | 用户搜索组件 — 按邮箱搜索 (listUsers API) | 新建 |

**验证**: 创建者能添加/移除管理者 + 管理者能看到被分配的岩场

### Phase 6: 验证 & 文档

| # | 任务 |
|---|------|
| 6.1 | 权限工具函数单元测试 (`permissions.test.ts`) |
| 6.2 | 更新 `CLAUDE.md` — 权限模型和新增文件 |
| 6.3 | 更新 `doc/AUTH_SYSTEM.md` — 完整权限架构 |
| 6.4 | 端到端手动测试所有角色组合 |

---

## 11. 技术注意事项

### 11.1 ObjectId 陷阱

绕过 better-auth adapter 直接操作 `user` collection 时，`_id` 必须用 `new ObjectId(userId)`:

```typescript
import { ObjectId } from 'mongodb'

// ✅ 正确
await db.collection('user').findOne({ _id: new ObjectId(userId) })

// ❌ 错误 — string 不匹配 ObjectId
await db.collection('user').findOne({ _id: userId })
```

### 11.2 Session Cookie Cache

better-auth 有 5 分钟 session cookie 缓存。角色变更后需要强制刷新：

```typescript
(useSession() as any).refetch({ query: { disableCookieCache: true } })
```

### 11.3 Admin 插件的 `adminRoles`

`adminRoles: ['admin']` 决定了哪些角色能调用 `listUsers`/`setRole` 等管理 API。`crag_creator` 不在此列，因此无法调用这些 API（这是正确的）。

### 11.4 crag_permissions 与 Crag.createdBy 的关系

- `Crag.createdBy` 是冗余字段，用于快速查询"谁创建了这个岩场"
- `crag_permissions` 是权限的 source of truth
- 创建岩场时两者同时设置
- 保持一致性：修改 crag_permissions 的 creator 时需同步 Crag.createdBy

### 11.5 向后兼容

- `user.role` 字段名不变，现有 admin 用户无需迁移
- Admin 插件会自动为现有 `user` 文档补充 `banned`/`banReason` 等字段（nullable）
- `crag_permissions` 是全新 collection，不影响现有数据
- 编辑器 layout 改造后，现有 admin 仍可正常访问
