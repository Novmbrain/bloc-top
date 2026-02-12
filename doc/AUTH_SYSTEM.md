# Authentication System — Magic Link + Passkey

> 实施日期: 2026-02-12 | 框架: better-auth | PR: #217

## 概述

BlocTop 使用**无密码认证**方案。用户通过 Magic Link 邮件完成注册/恢复，Passkey (WebAuthn) 用于日常生物识别登录。编辑器通过 server-side session + role 检查保护，替代了之前的客户端硬编码密码。

## 架构总览

```
┌─────────────┐     Magic Link      ┌──────────┐     SMTP      ┌────────┐
│  Login Page  │ ──────────────────→ │ better-  │ ───────────→ │ Resend │
│  (Client)    │ ←── session cookie  │ auth API │              └────────┘
│              │                     │          │
│  Passkey btn │ ── WebAuthn ──────→ │ /api/    │     MongoDB
│              │ ←── session cookie  │ auth/    │ ──────────→ user, session,
└─────────────┘                     │ [..all]  │              account, passkey,
                                    └──────────┘              verification
```

## 核心文件

| 文件 | 层级 | 职责 |
|------|------|------|
| `src/lib/auth.ts` | Server | better-auth 实例 (lazy singleton)，含 Magic Link + Passkey 插件 |
| `src/lib/auth-client.ts` | Client | `createAuthClient` + React hooks (`useSession`, `signIn`, `signOut`) |
| `src/lib/email-templates.ts` | Server | Magic Link 邮件 HTML 模板 (纯内联样式) |
| `src/app/api/auth/[...all]/route.ts` | API | Catch-all 路由，代理所有 `/api/auth/*` 请求到 better-auth |
| `src/app/[locale]/login/page.tsx` | Page | 登录页 — 邮箱输入 + Magic Link 发送 + Passkey 按钮 |
| `src/app/[locale]/auth/verify/page.tsx` | Page | Magic Link 验证中间页 (5s 超时 fallback) |
| `src/app/[locale]/auth/passkey-setup/page.tsx` | Page | Passkey 注册引导页 (Magic Link 登录后) |
| `src/app/[locale]/editor/layout.tsx` | Layout | **Server-side auth guard** — 检查 session + admin role |
| `src/hooks/use-passkey-management.ts` | Hook | Passkey CRUD (列表/添加/删除) |
| `src/app/[locale]/profile/page.tsx` | Page | 账号状态展示 + Passkey 管理 + 编辑器入口 |

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

## Lazy Singleton 初始化模式

`auth.ts` **不使用 top-level await**，改为 lazy singleton 模式：

```typescript
let _auth: ReturnType<typeof betterAuth> | null = null
let _promise: Promise<ReturnType<typeof betterAuth>> | null = null

export function getAuth(): Promise<ReturnType<typeof betterAuth>> {
  if (_auth) return Promise.resolve(_auth)
  if (!_promise) {
    _promise = (async () => {
      const client = await clientPromise
      const db = await getDatabase()
      const instance = betterAuth({ database: mongodbAdapter(db, { client }), ... })
      _auth = instance
      return instance
    })()
  }
  return _promise
}
```

**为什么不用 top-level await**：Vercel 构建时 bundler 解析模块会执行 top-level await，如果 `BETTER_AUTH_SECRET` 未配置（`NODE_ENV=production`），better-auth 直接抛异常导致构建失败。Lazy singleton 让 MongoDB 连接和 auth 初始化延迟到第一个实际请求到来时。

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
| `account` | 认证方式关联 |
| `verification` | Magic Link token 存储 |
| `passkey` | WebAuthn credential |

设置管理员角色：
```javascript
db.user.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## 登录流程

### Magic Link 流程

```
1. 用户输入邮箱 → 点击"发送登录链接"
2. Client: authClient.signIn.magicLink({ email, callbackURL: '/' })
3. Server: better-auth 生成 token → 存入 verification collection
4. Server: sendMagicLink() → Resend 发送 HTML 邮件
5. 用户点击邮件链接 → better-auth 验证 token
6. Server: 创建 session → 设置 httpOnly cookie
7. Client: 重定向到 callbackURL ('/')
```

### Passkey 流程

```
1. 已登录用户 → Profile 页 → "添加设备"
2. Client: authClient.passkey.addPasskey()
3. Browser: 系统生物识别弹窗 (指纹/面容)
4. Server: 存储 credential 到 passkey collection

登录时:
1. Login 页 → 点击"Passkey 登录"
2. Client: signIn.passkey()
3. Browser: 系统生物识别验证
4. Server: 验证 assertion → 创建 session
```

## 编辑器权限保护

`editor/layout.tsx` 是 **Server Component**，在服务端检查 session：

```typescript
const auth = await getAuth()
const session = await auth.api.getSession({ headers: await headers() })
if (!session || session.user.role !== 'admin') {
  redirect('/login')
}
```

- 未登录/非 admin → 服务端 302 重定向，浏览器永远不会收到编辑器 HTML
- 所有 editor 子页面 (`/editor/faces`, `/editor/routes`, `/editor/betas`) 自动受 layout 保护
- 现有 editor 页面代码无需任何修改（均为 `'use client'` 组件）

## Session 配置

| 参数 | 值 | 说明 |
|------|-----|------|
| `expiresIn` | 30 天 | Session 最长有效期 |
| `updateAge` | 1 天 | 每天自动刷新一次 |
| `cookieCache.maxAge` | 5 分钟 | Cookie 级缓存减少 DB 查询 |

## Rate Limiting

better-auth 内置 rate limit：每 IP 每 60 秒最多 10 次请求，覆盖所有 `/api/auth/*` 端点。

## i18n

翻译 key 在 `messages/{locale}.json` 的 `Auth` 命名空间下，共 31 个 key：

```typescript
// Client Component
const t = useTranslations('Auth')
t('loginTitle')     // "登录寻岩记"
t('sendMagicLink')  // "发送登录链接"
t('passkeyLogin')   // "Passkey 登录"
```

## Email 发送

- **开发环境**: `onboarding@resend.dev` (Resend 测试域名，仅发送到账户所有者邮箱)
- **生产环境**: `noreply@bouldering.top` (需完成 DNS 域名验证: SPF + DKIM)

## 待办事项

- [ ] 完成 `bouldering.top` 在 Resend 的 DNS 域名验证 (SPF/DKIM/MX)
- [ ] Login 页 Passkey 按钮接入真实 `signIn.passkey()` (当前为占位)
- [ ] 邮件模板多语言支持 (根据用户 locale 切换)
