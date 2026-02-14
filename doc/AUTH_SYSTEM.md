# Authentication System — Magic Link + Password + Passkey

> 实施日期: 2026-02-12 | 框架: better-auth | PR: #217, #218-#220

## 概述

BlocTop 使用**三重认证**方案。用户通过 Magic Link 邮件完成**注册和邮箱验证**（唯一注册入口），验证后可选择设置密码和/或 Passkey 作为日常登录方式。编辑器通过 server-side session + role 检查保护。

**三种登录方式**：
- **Magic Link**: 邮箱链接登录，同时用于注册和找回密码
- **密码登录**: 邮箱+密码，仅在 Magic Link 验证后可设置（可选）
- **Passkey**: 生物识别登录（指纹/面容），最便捷的日常登录方式

**核心原则**：注册只走 Magic Link → 确保邮箱真实性 → 密码/Passkey 作为后续便捷登录方式

## 架构总览

```
┌─────────────────┐  Magic Link    ┌──────────┐     SMTP      ┌────────┐
│  Login Page      │ ────────────→ │ better-  │ ───────────→ │ Resend │
│  (Tab: 邮箱登录) │ ←── cookie    │ auth API │              └────────┘
│                  │               │          │
│  (Tab: 密码登录) │ ── email+pw → │ /api/    │     MongoDB
│                  │ ←── cookie    │ auth/    │ ──────────→ user, session,
│  Passkey btn     │ ── WebAuthn → │ [..all]  │              account, passkey,
│                  │ ←── cookie    └──────────┘              verification
└─────────────────┘
```

## 核心文件

| 文件 | 层级 | 职责 |
|------|------|------|
| `src/lib/auth.ts` | Server | better-auth 实例 (lazy singleton)，含 Magic Link + Password + Passkey |
| `src/lib/auth-client.ts` | Client | `createAuthClient` + React hooks (`useSession`, `signIn`, `signOut`) |
| `src/lib/email-templates.ts` | Server | Magic Link 邮件 HTML 模板 (纯内联样式) |
| `src/app/api/auth/[...all]/route.ts` | API | Catch-all 路由，代理所有 `/api/auth/*` 请求到 better-auth |
| `src/app/[locale]/login/page.tsx` | Page | 登录页 — Tab 切换（邮箱登录 / 密码登录）+ Passkey 按钮 |
| `src/app/[locale]/auth/verify/page.tsx` | Page | Magic Link 验证中间页 (5s 超时 fallback) |
| `src/app/[locale]/auth/security-setup/page.tsx` | Page | **安全设置引导页** — 合并密码设置 + Passkey 设置（Magic Link 登录后） |
| `src/app/api/auth/set-password/route.ts` | API | Server Action 包装 `auth.api.setPassword()`（仅已登录用户） |
| `src/app/[locale]/editor/layout.tsx` | Layout | **Server-side auth guard** — 检查 session + admin role |
| `src/hooks/use-passkey-management.ts` | Hook | Passkey CRUD (列表/添加/删除) |
| `src/app/[locale]/profile/page.tsx` | Page | 账号状态展示 + 密码管理 + Passkey 管理 + 编辑器入口 |

## 依赖

```json
{
  "better-auth": "^1.x",
  "@better-auth/passkey": "^1.x",
  "resend": "^4.x"
}
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `BETTER_AUTH_SECRET` | ✅ | Session 签名密钥 (32+ 字符随机串) |
| `RESEND_API_KEY` | ✅ | Resend API Key (`re_xxxx`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用 URL (生产: `https://bouldering.top`，开发: `http://localhost:3000`) |

## 服务端配置要点

### Lazy Singleton 初始化

`auth.ts` **不使用 top-level await**，改为 lazy singleton 模式（避免 Vercel 构建崩溃）：

```typescript
export function getAuth(): Promise<ReturnType<typeof betterAuth>> {
  if (_auth) return Promise.resolve(_auth)
  if (!_promise) {
    _promise = (async () => {
      const instance = betterAuth({
        database: mongodbAdapter(db, { client }),

        // 邮箱+密码（内置核心功能）
        emailAndPassword: {
          enabled: true,
          minPasswordLength: 8,
        },

        // 账号关联 — 同一邮箱的 Magic Link / Password / Passkey 共享用户记录
        account: {
          accountLinking: {
            enabled: true,
          },
        },

        trustedOrigins: [
          'https://bouldering.top',
          'https://www.bouldering.top',
        ],

        plugins: [
          magicLink({ ... }),
          passkey({ ... }),
        ],
        // ... session, rateLimit
      })
      _auth = instance
      return instance
    })()
  }
  return _promise
}
```

**emailAndPassword 说明**：
- 内置核心功能（非插件），`enabled: true` 即启用
- 客户端不调用 `signUp.email()` — 注册只走 Magic Link，确保邮箱已验证
- `signIn.email()` 仅对已设密码的用户有效
- `auth.api.setPassword()` 是 server-only API，用于 Magic Link 用户后续设密码

**accountLinking 说明**：
- 同一邮箱通过不同方式登录时，`account` collection 会创建多条记录（`credential`、`magic_link`、`passkey`），但都指向同一个 `user` 记录
- 确保用户不会因为换登录方式而产生重复账号

消费方式：
```typescript
// API Route
const auth = await getAuth()
return toNextJsHandler(auth).GET(req)

// Server Component
const auth = await getAuth()
const session = await auth.api.getSession({ headers: await headers() })
```

## MongoDB Collections

better-auth 使用 **单数** collection 命名（不是复数），自动在首次写入时创建：

| Collection | 用途 |
|------------|------|
| `user` | 用户记录 (email, role, emailVerified) |
| `session` | 活跃 session |
| `account` | 认证方式关联（一个用户可有多条：`credential` / `magic_link` / `passkey`） |
| `verification` | Magic Link token 存储 |
| `passkey` | WebAuthn credential |

**account collection 的 providerId 类型**：
- `credential` — 邮箱+密码登录（用户设置密码后创建）
- `magic_link` — Magic Link 登录
- `passkey` — Passkey 登录

> 同一用户可同时拥有三种 account 类型，通过 `accountLinking` 配置确保合并到同一 user。

设置管理员角色：
```javascript
db.user.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## 登录页 UI

登录页使用 **Tab 切换** 呈现两种主要登录方式，Passkey 按钮始终在底部：

```
┌─────────────────────────────────┐
│  ← 返回首页                      │
│                                  │
│  登录寻岩记                       │
│  首次使用？输入邮箱即可注册        │
│                                  │
│  ┌──────────┬──────────┐         │
│  │ 邮箱登录  │ 密码登录  │  ← SegmentedControl
│  └──────────┴──────────┘         │
│                                  │
│  [Tab 1: 邮箱登录]               │
│  ┌─────────────────────┐        │
│  │  邮箱地址             │        │
│  └─────────────────────┘        │
│  [ 📧 发送登录链接 ]             │
│                                  │
│  [Tab 2: 密码登录]               │
│  ┌─────────────────────┐        │
│  │  邮箱地址             │        │
│  └─────────────────────┘        │
│  ┌─────────────────────┐        │
│  │  密码                 │        │
│  └─────────────────────┘        │
│  [ 🔑 登录 ]                    │
│           忘记密码？ → 切到邮箱Tab │
│                                  │
│  ────────── 或 ──────────        │
│  [ 🔐 Passkey 登录 ]            │
└─────────────────────────────────┘
```

## 登录流程

### Magic Link 流程（注册 + 登录 + 找回密码）

```
1. 用户切换到「邮箱登录」Tab → 输入邮箱 → 点击"发送登录链接"
2. Client: authClient.signIn.magicLink({ email, callbackURL: '/auth/security-setup' })
3. Server: better-auth 生成 token → 存入 verification collection
4. Server: sendMagicLink() → Resend 发送 HTML 邮件
5. 用户点击邮件链接 → better-auth 验证 token
6. Server: 创建 session → 设置 httpOnly cookie
7. Client: 重定向到 /auth/security-setup（安全设置引导页）
```

> **注册**: 新邮箱自动创建用户。**找回密码**: 登录后在 Profile 页重设。
> callbackURL 使用 `/auth/security-setup` — 引导页检测用户已有设置则自动跳转首页。

### 密码登录流程

```
1. 用户切换到「密码登录」Tab → 输入邮箱和密码 → 点击"登录"
2. Client: authClient.signIn.email({ email, password })
3. Server: 验证 credential account → 创建 session
4. Client: 重定向到首页
```

> 仅对已设置密码的用户有效。未设密码的用户需使用 Magic Link 或 Passkey。

### Passkey 流程

```
注册 Passkey:
1. 已登录用户 → Profile 页或安全设置引导页 → "添加设备"
2. Client: authClient.passkey.addPasskey()
3. Browser: 系统生物识别弹窗 (指纹/面容)
4. Server: 存储 credential 到 passkey collection

登录时:
1. Login 页 → 点击"Passkey 登录"
2. Client: signIn.passkey()
3. Browser: 系统生物识别验证
4. Server: 验证 assertion → 创建 session
```

### 忘记密码流程

```
1. 密码登录 Tab → 点击"忘记密码？"
2. 自动切换到「邮箱登录」Tab，提示"通过邮件登录后可重设密码"
3. 用户通过 Magic Link 登录
4. 在 Profile 页 → 安全设置 → 重设密码
```

> 不需要专用的"重置密码"邮件模板，复用 Magic Link 即可。

## 安全设置引导页

Magic Link 验证成功后跳转到 `/auth/security-setup`，合并展示两个可选设置：

```
┌─────────────────────────────────┐
│                                  │
│  ✅ 登录成功！                    │
│                                  │
│  设置常用登录方式                 │
│                                  │
│  ┌─────────────────────────┐    │
│  │ 🔑 设置密码              │    │
│  │  下次可直接输入密码登录    │    │
│  │                          │    │
│  │  新密码: [__________]    │    │
│  │  确认:   [__________]    │    │
│  │  [ 设置密码 ]            │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │ 🔐 设置 Passkey          │    │
│  │  指纹/面容一键登录        │    │
│  │  [ 添加 Passkey ]        │    │
│  └─────────────────────────┘    │
│                                  │
│  [ 稍后设置，先去逛逛 → ]        │
└─────────────────────────────────┘
```

**设置密码的 API 调用**：
```typescript
// 客户端调用自定义 API Route
const res = await fetch('/api/auth/set-password', {
  method: 'POST',
  body: JSON.stringify({ newPassword }),
})

// src/app/api/auth/set-password/route.ts (Server)
const auth = await getAuth()
await auth.api.setPassword({
  body: { newPassword },
  headers: await headers(),
})
```

> `setPassword` 是 server-only API — 为已通过 Magic Link 验证但尚未设置密码的用户创建 credential account。

## RBAC 权限系统

> 详细设计文档见 `doc/RBAC_DESIGN.md`

### 两层架构

```
┌─────────────────────────────────────────────────────┐
│ 用户级角色 (user.role)                               │
│ ┌─────────┐  ┌──────────┐                           │
│ │  admin   │  │   user   │                           │
│ │ 全部权限 │  │ 仅浏览   │                           │
│ └─────────┘  └──────────┘                           │
├─────────────────────────────────────────────────────┤
│ 岩场级权限 (crag_permissions collection)             │
│ ┌──────────────┐                                    │
│ │   manager    │                                    │
│ │ 编辑岩场/线路 │                                    │
│ └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

### 用户角色

| 角色 | 说明 | 编辑器 | 创建岩场 | 编辑岩场 |
|------|------|--------|---------|---------|
| `admin` | 超级管理员 | ✅ | ✅ | ✅ 全部 |
| `user` | 普通用户 | 仅被分配岩场 | ❌ | 仅被分配的 (manager) |

通过 better-auth Admin 插件管理: `authClient.admin.setRole({ userId, role })`

### 岩场级权限

| 权限 | 编辑岩场/线路/岩面 | 删除岩场 | 分配管理者 |
|------|-------------------|---------|-----------|
| `manager` | ✅ | ❌ | ❌ |

存储在 `crag_permissions` collection: `{ userId, cragId, role, assignedBy, createdAt }`

### 权限判定函数

位于 `src/lib/permissions.ts`:

| 函数 | 用途 | Admin 行为 |
|------|------|-----------|
| `canAccessEditor(userId, role)` | 编辑器入口 | 直接放行 |
| `canCreateCrag(role)` | 创建岩场 | 直接放行 |
| `canEditCrag(userId, cragId, role)` | 编辑岩场 | 直接放行 |
| `canDeleteCrag(userId, cragId, role)` | 删除岩场 | 直接放行 |
| `canManagePermissions(userId, cragId, role)` | 管理权限 | 直接放行 |
| `getEditableCragIds(userId, role)` | 获取可编辑岩场列表 | 返回 `'all'` |

### 编辑器访问保护

`editor/layout.tsx` 是 **Server Component**，使用 `canAccessEditor` 检查权限：

```typescript
import { canAccessEditor } from '@/lib/permissions'
import type { UserRole } from '@/types'

const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user?.id) redirect('/login')

const role = ((session.user as { role?: string }).role || 'user') as UserRole
if (!(await canAccessEditor(session.user.id, role))) redirect('/login')
```

- 未登录 → 302 到 `/login`
- 无编辑器权限 (user 角色且无 crag_permissions) → 302 到 `/login`
- admin / 有岩场权限的 user (manager) → 放行
- 所有 editor 子页面自动受 layout 保护

### API 路由保护模式

```typescript
import { requireAuth } from '@/lib/require-auth'
import { canEditCrag } from '@/lib/permissions'

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const { userId, role } = authResult

  if (!(await canEditCrag(userId, cragId, role))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  // ... handle request
}
```

### 相关 API

| 方法 | 路径 | 权限 |
|------|------|------|
| `GET/POST/DELETE` | `/api/crag-permissions` | admin-only |
| `GET` | `/api/editor/crags` | 任何有编辑器权限的用户 |
| `GET` | `/api/editor/search-users?q=xxx` | 任何有编辑器权限的用户 |

## Session 配置

| 参数 | 值 | 说明 |
|------|-----|------|
| `expiresIn` | 30 天 | Session 最长有效期 |
| `updateAge` | 1 天 | 每天自动刷新一次 |
| `cookieCache.maxAge` | 5 分钟 | Cookie 级缓存减少 DB 查询 |

## Rate Limiting

better-auth 内置 rate limit：每 IP 每 60 秒最多 10 次请求，覆盖所有 `/api/auth/*` 端点。

## Profile 页密码管理

Profile 页「安全设置」区块根据用户状态显示不同操作：

| 状态 | 显示内容 |
|------|---------|
| 未设密码 | 「设置密码」按钮 → 调用 `/api/auth/set-password` |
| 已设密码 | 「修改密码」按钮 → 调用 `authClient.changePassword({ currentPassword, newPassword })` |

> `changePassword` 是客户端方法，需输入旧密码验证。`setPassword` 是 server-only，只需新密码。

## i18n

翻译 key 在 `messages/{locale}.json` 的 `Auth` 命名空间下：

```typescript
const t = useTranslations('Auth')
// 登录页 Tab
t('tabMagicLink')       // "邮箱登录"
t('tabPassword')        // "密码登录"
t('sendMagicLink')      // "发送登录链接"
t('passwordPlaceholder') // "输入密码"
t('passwordLogin')      // "登录"
t('forgotPassword')     // "忘记密码？"
t('passkeyLogin')       // "Passkey 登录"
// 安全设置引导页
t('securitySetupTitle') // "设置常用登录方式"
t('setPassword')        // "设置密码"
t('setPasswordHint')    // "下次可直接输入密码登录"
t('confirmPassword')    // "确认密码"
t('passwordMismatch')   // "两次密码不一致"
t('passwordTooShort')   // "密码至少 8 位"
t('passwordSetSuccess') // "密码设置成功"
// Profile 密码管理
t('changePassword')     // "修改密码"
t('currentPassword')    // "当前密码"
t('newPassword')        // "新密码"
t('passwordChanged')    // "密码已修改"
```

## Email 发送

- **开发环境**: `onboarding@resend.dev` (Resend 测试域名，仅发送到账户所有者邮箱)
- **生产环境**: `noreply@bouldering.top` (需完成 DNS 域名验证: SPF + DKIM)

## 待办事项

- [x] RBAC 权限系统 — 用户角色 + 岩场级权限 (详见 `doc/RBAC_DESIGN.md`)
- [ ] 完成 `bouldering.top` 在 Resend 的 DNS 域名验证 (SPF/DKIM/MX)
- [ ] 实现密码登录 Tab（`signIn.email` 客户端调用）
- [ ] 实现安全设置引导页（合并密码 + Passkey 设置）
- [ ] 创建 `/api/auth/set-password` API Route
- [ ] Profile 页添加密码管理（设置/修改密码）
- [ ] `auth.ts` 添加 `emailAndPassword` + `accountLinking` 配置
- [ ] Login 页 Passkey 按钮接入真实 `signIn.passkey()` (当前为占位)
- [ ] 新增 i18n 翻译键（密码相关，约 15 个 key）
- [ ] 邮件模板多语言支持 (根据用户 locale 切换)
