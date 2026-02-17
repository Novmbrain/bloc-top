# Magic Link + Passkey 认证架构研究报告

> 研究日期: 2026-02-12
> 研究深度: Deep (3-4 hops)
> 置信度: **高** (技术方案成熟，多个框架原生支持)

---

## Executive Summary

Magic Link + Passkey 组合是 2025-2026 年认证领域的主流最佳实践。核心思路：**邮箱 Magic Link 作为账号标识入口和兜底恢复手段，Passkey 作为日常免密登录方式**。该方案完全无密码，安全性高（Passkey 抗钓鱼），UX 优秀（指纹/面容一触登录），且对 PWA 兼容性好（iOS 16+、Android 均支持）。

推荐使用 **better-auth** 框架，它通过插件机制原生支持 Magic Link + Passkey 的组合，且与 Next.js App Router 和 MongoDB 深度集成，可最小化开发量。

---

## 一、认证流程设计

### 1.1 首次注册

```
用户输入邮箱 → 发送 Magic Link → 用户点击链接 → 自动创建账号 + 登录
                                                    ↓
                                              引导设置 Passkey
                                          (指纹/面容/设备锁)
```

**关键点：**
- Magic Link 的 `newUserCallbackURL` 可重定向到 Passkey 设置引导页
- 引导页展示 Passkey 的好处（"下次一键登录"），用户可选择跳过
- better-auth 的 `signIn.magicLink()` 自动处理 新用户注册/老用户登录 的分流

### 1.2 日常登录 (Identifier-First Flow)

```
用户打开 App → 自动检测是否支持 Passkey
                    ↓
    ┌───── 支持且已注册 Passkey ──────┐
    │                                  │
    │  Conditional UI 自动弹出         │
    │  指纹/面容验证 → 登录成功        │
    │                                  │
    └──────────────────────────────────┘
                    ↓ (不支持或未注册)
    ┌───── Identifier-First Fallback ──┐
    │                                  │
    │  显示邮箱输入框                    │
    │  输入邮箱 → 系统判断:            │
    │    - 有 Passkey → 触发 Passkey   │
    │    - 无 Passkey → 发 Magic Link  │
    │                                  │
    └──────────────────────────────────┘
```

**关键点：**
- 使用 WebAuthn Conditional UI (`autocomplete="webauthn"`)，在邮箱输入框自动提示可用的 Passkey
- better-auth 的 `signIn.passkey({ autoFill: true })` 在组件挂载时调用，实现自动弹出
- 必须先检测 `PublicKeyCredential.isConditionalMediationAvailable()` 是否可用

### 1.3 换设备 / Passkey 丢失恢复

```
新设备打开 App → 无本地 Passkey → 显示邮箱输入框
                                        ↓
用户输入邮箱 → 发送 Magic Link → 点击链接登录
                                        ↓
                                  引导重新设置 Passkey
                              (新设备注册新 Passkey)
```

**关键点：**
- 一个账号可绑定多个 Passkey（多设备）
- Passkey 本身支持生态同步：iCloud Keychain (Apple)、Google Password Manager (Android)
- 即使所有 Passkey 丢失，邮箱 Magic Link 始终可用作恢复手段
- 恢复登录后自动引导注册新设备的 Passkey

---

## 二、技术方案选型

### 2.1 方案对比

| 维度 | better-auth | Auth.js (NextAuth) | DIY (SimpleWebAuthn) |
|------|------------|-------------------|---------------------|
| Magic Link | 插件原生支持 | 原生支持 | 需自建 |
| Passkey | 插件原生支持 | 实验性 (不推荐生产) | 完全控制 |
| Next.js App Router | 完整支持 | 完整支持 | 需自行集成 |
| MongoDB | 原生适配器 | 原生适配器 | 需自建 schema |
| Session 管理 | 内置 cookie session | 内置 JWT/session | 需自建 |
| 开发量 | 最小 | 中等 (Passkey 实验性) | 最大 |
| 灵活性 | 高（插件架构） | 中等 | 最高 |
| 维护成本 | 低 | 低 | 高 |
| 社区活跃度 | 高 (2025-26 新兴) | 最高 | 中等 |

### 2.2 推荐方案: better-auth

**理由：**
1. **Magic Link + Passkey 双插件原生支持**，无需组合多个库
2. **MongoDB 原生适配器**，与现有技术栈一致
3. **Next.js App Router 完整支持**，catch-all route handler 即可
4. **Passkey 管理 API 完整**：`addPasskey`、`listUserPasskeys`、`deletePasskey`
5. **Conditional UI 支持**：`signIn.passkey({ autoFill: true })`
6. **自动 migration CLI**：`npx @better-auth/cli migrate`

**Auth.js 排除原因：** Passkey/WebAuthn 支持仍标记为 experimental，不推荐生产使用。
**DIY 排除原因：** 开发量大（session 管理、token 存储、challenge 管理等都要自建），且容易出安全漏洞。

---

## 三、技术架构

### 3.1 依赖包

```bash
npm install better-auth @better-auth/passkey
# 邮件发送（Magic Link）
npm install resend
```

### 3.2 服务端配置

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { passkey } from "@better-auth/passkey"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { getDatabase } from "@/lib/mongodb"

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  database: mongodbAdapter(await getDatabase()),

  plugins: [
    // Magic Link 插件
    magicLink({
      expiresIn: 600,                // 10 分钟过期
      storeToken: "hashed",          // 哈希存储 token
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: "寻岩记 <auth@bouldering.top>",
          to: email,
          subject: "登录寻岩记",
          html: `<a href="${url}">点击登录</a>`,
        })
      },
    }),

    // Passkey 插件
    passkey({
      rpID: "bouldering.top",       // ★ Relying Party ID
      rpName: "寻岩记 BlocTop",
      origin: process.env.NEXT_PUBLIC_APP_URL,  // https://bouldering.top
      authenticatorAttachment: "platform",       // 优先本机生物识别
      userVerification: "required",
      residentKey: "required",                   // Discoverable credential
    }),
  ],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,  // 5 分钟缓存
    },
  },
})
```

### 3.3 客户端配置

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client"
import { passkeyClient } from "@better-auth/passkey/client"
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    passkeyClient(),
    magicLinkClient(),
  ],
})
```

### 3.4 API Route

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

### 3.5 Relying Party ID 配置

| 配置项 | 值 | 说明 |
|--------|---|------|
| `rpID` | `"bouldering.top"` | 顶级域名，确保所有子域名可用 |
| `origin` | `"https://bouldering.top"` | 生产环境 URL |
| `origin` (dev) | `"http://localhost:3000"` | 开发环境 URL |

**rpID 设为顶级域名的好处：**
- 未来如果有 `app.bouldering.top` 或 `m.bouldering.top` 子域名，Passkey 可跨子域名使用
- Passkey 注册在 `bouldering.top` 级别，而非具体子域名

---

## 四、数据库 Schema

### 4.1 Users Collection

```typescript
interface User {
  _id: ObjectId
  email: string              // 账号标识（唯一）
  emailVerified: boolean     // 邮箱是否已验证
  name?: string              // 显示名称
  image?: string             // 头像 URL
  createdAt: Date
  updatedAt: Date
}
```

### 4.2 Sessions Collection

```typescript
interface Session {
  _id: ObjectId
  userId: ObjectId           // → User._id
  token: string              // session token（唯一索引）
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}
```

### 4.3 Passkeys Collection

```typescript
interface Passkey {
  _id: ObjectId
  userId: ObjectId           // → User._id
  name: string               // 设备名称 ("iPhone 15", "MacBook")
  credentialID: string       // base64url 编码的 credential ID（唯一索引）
  publicKey: string          // base64url 编码的公钥
  counter: number            // 签名计数器（防重放攻击）
  deviceType: string         // "singleDevice" | "multiDevice"
  backedUp: boolean          // 是否已备份（云同步）
  transports: string[]       // ["internal", "hybrid"] 等
  aaguid: string             // 认证器型号标识
  createdAt: Date
}
```

### 4.4 Verification Tokens Collection (Magic Link)

```typescript
interface VerificationToken {
  _id: ObjectId
  identifier: string         // 邮箱
  token: string              // 哈希后的 token
  expiresAt: Date
  createdAt: Date
}
```

### 4.5 Accounts Collection (better-auth 要求)

```typescript
interface Account {
  _id: ObjectId
  userId: ObjectId           // → User._id
  accountId: string          // provider 内的用户 ID
  providerId: string         // "credential" | "passkey" | 未来可扩展 OAuth
  createdAt: Date
  updatedAt: Date
}
```

> **注意：** better-auth 的 `npx @better-auth/cli migrate` 会自动创建这些 collection 和索引。

---

## 五、PWA 兼容性

### 5.1 平台支持矩阵

| 平台 | WebAuthn API | Passkey 同步 | Conditional UI | PWA 内可用 |
|------|-------------|-------------|----------------|-----------|
| iOS 16+ (Safari) | ✅ | iCloud Keychain | ✅ | ✅ |
| Android (Chrome 108+) | ✅ | Google Password Manager | ✅ | ✅ |
| macOS (Safari 16+) | ✅ | iCloud Keychain | ✅ | ✅ |
| macOS (Chrome) | ✅ | Google PM / iCloud | ✅ | ✅ |
| Windows (Chrome/Edge) | ✅ | Google PM / Windows Hello | ✅ | ✅ |

### 5.2 PWA 特别注意事项

1. **origin 匹配**：PWA 的 `start_url` 必须与 WebAuthn 的 `origin` 配置一致
2. **Standalone 模式**：iOS PWA 在 standalone 模式下 WebAuthn 正常工作
3. **离线场景**：Passkey 验证需要网络（challenge 来自服务器），离线时应跳过认证或显示缓存内容
4. **生物识别提示**：PWA 中调用 `navigator.credentials.get()` 会触发系统级生物识别弹窗，体验与原生 App 一致

---

## 六、安全考量

### 6.1 Magic Link 安全

| 措施 | 说明 |
|------|------|
| Token 哈希存储 | `storeToken: "hashed"` 防止数据库泄露后被直接使用 |
| 短过期时间 | 10 分钟内有效 |
| 一次性使用 | 验证后立即销毁 |
| Rate Limiting | 同一邮箱限制发送频率（建议 60s/次） |
| 安全头部 | `Referrer-Policy: no-referrer` 防止 token 泄露到第三方 |

### 6.2 Passkey 安全

| 特性 | 说明 |
|------|------|
| 抗钓鱼 | rpID 绑定域名，假网站无法触发验证 |
| 抗重放 | counter 递增，检测克隆攻击 |
| 生物识别绑定 | `userVerification: "required"` 确保每次验证需要指纹/面容 |
| 无服务器密钥 | 私钥仅存设备安全芯片，服务器只存公钥 |

### 6.3 Session 安全

- 使用 HTTP-only、Secure、SameSite=Lax 的 cookie
- Session 过期时间建议 30 天（长期登录体验），配合 activity-based 续期
- 敏感操作（如删除 Passkey）需要重新验证

---

## 七、前端 UI 设计建议

### 7.1 登录页

```
┌─────────────────────────────┐
│                             │
│    🧗 寻岩记               │
│                             │
│  ┌───────────────────────┐  │
│  │  邮箱地址              │  │  ← autocomplete="email webauthn"
│  └───────────────────────┘  │    (Conditional UI 自动弹 Passkey)
│                             │
│  [ 发送登录链接 ]           │  ← 有 Passkey 时此按钮可隐藏
│                             │
│  ─── 或 ───                │
│                             │
│  [ 🔐 使用 Passkey 登录 ]  │  ← 显式按钮（备用入口）
│                             │
└─────────────────────────────┘
```

### 7.2 Passkey 设置引导（注册后）

```
┌─────────────────────────────┐
│                             │
│  ✅ 登录成功！              │
│                             │
│  设置指纹/面容登录          │
│  下次打开直接进入，无需邮箱  │
│                             │
│  [ 🔐 设置 Passkey ]       │  ← 调用 addPasskey()
│                             │
│  稍后设置                   │  ← 可跳过
│                             │
└─────────────────────────────┘
```

### 7.3 个人设置页 - Passkey 管理

```
已注册的 Passkey:
┌─────────────────────────────┐
│ 📱 iPhone 15    2026-02-10  │  [删除]
│ 💻 MacBook Pro  2026-02-12  │  [删除]
└─────────────────────────────┘
[ + 添加新设备 ]
```

---

## 八、实现路线图（建议）

### Phase 1: 基础认证 (MVP)
1. 安装配置 better-auth + MongoDB adapter
2. 实现 Magic Link 注册/登录
3. 集成 Resend 发送邮件
4. 登录页 UI + Session 管理
5. 基础的 "已登录/未登录" 状态管理

### Phase 2: Passkey 集成
1. 添加 Passkey 插件配置
2. 注册后引导设置 Passkey
3. 登录页 Conditional UI
4. 个人设置页 Passkey 管理
5. 设备丢失恢复流程

### Phase 3: 用户功能
1. 用户画像（nickname、avatar）
2. 攀岩偏好设置
3. 登录状态与现有功能整合（收藏、历史记录等）

---

## 九、成本评估

| 服务 | 免费额度 | 说明 |
|------|---------|------|
| Resend (邮件) | 3,000 封/月 | Magic Link 发送，足够早期使用 |
| MongoDB Atlas | 512MB 免费 | 已在使用，认证 collection 额外占用很小 |
| Vercel | 免费层 | API Route 即可处理 |

**无额外基础设施成本**，所有功能可在现有技术栈上实现。

---

## Sources

- [Passkeys Handbook 2025 (MojoAuth)](https://mojoauth.com/white-papers/passkeys-passwordless-authentication-handbook/)
- [Passkeys & WebAuthn in 2026: Migration Playbook](https://kawaldeepsingh.medium.com/passkeys-webauthn-in-2026-a-practical-migration-playbook-for-passwordless-authentication-5202f09c62a3)
- [Passkeys, WebAuthn, and Next.js: Practical Guide](https://rebeccamdeprey.com/blog/passkeys-webauthn-nextjs-practical-guide)
- [Auth.js Passkey Provider (Experimental)](https://authjs.dev/getting-started/providers/passkey)
- [Better Auth - Magic Link Plugin](https://www.better-auth.com/docs/plugins/magic-link)
- [Better Auth - Passkey Plugin](https://www.better-auth.com/docs/plugins/passkey)
- [Passkey & WebAuthn Database Guide (Corbado)](https://www.corbado.com/blog/passkey-webauthn-database-guide)
- [Passkey Recovery & Fallback (Corbado)](https://www.corbado.com/blog/passkey-fallback-recovery)
- [Passkey Fallback & Recovery: Identifier-First Approach](https://www.corbado.com/blog/passkey-fallback-recovery)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/docs/packages/server)
- [SimpleWebAuthn MongoDB Discussion](https://github.com/MasterKale/SimpleWebAuthn/discussions/375)
- [WebAuthn Relying Party ID & Passkeys (Corbado)](https://www.corbado.com/blog/webauthn-relying-party-id-rpid-passkeys)
- [Passkey Device Loss Recovery (AuthSignal)](https://www.authsignal.com/blog/articles/what-happens-when-your-passkey-device-is-lost-understanding-recovery-and-device-sync)
- [UX Best Practices for Passkeys (AuthSignal)](https://www.authsignal.com/blog/articles/ux-best-practices-for-passkeys-understanding-device-initiated-authentication)
- [PWA Biometric Authentication with Passkeys](https://progressier.com/pwa-capabilities/biometric-authentication-with-passkeys)
- [Passkeys Compatibility Guide (Authgear)](https://www.authgear.com/post/passkeys-compatibility)
- [Login & Signup UX Guide 2025 (Authgear)](https://www.authgear.com/post/login-signup-ux-guide)
- [1Password: Passkeys vs Magic Links](https://blog.1password.com/passkeys-vs-magic-links-differences/)
- [Secure Authentication in Next.js with Email Magic Links (Clerk)](https://clerk.com/blog/secure-authentication-nextjs-email-magic-links)
- [Resend + Auth.js Configuration](https://authjs.dev/guides/configuring-resend)
