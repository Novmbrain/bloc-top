# Cross-Subdomain Login Callback Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用户从 Editor 跳到 PWA 登录页后，登录成功应回到 Editor，而非停留在 PWA 首页。

**Architecture:** PWA 登录页当前硬编码了登录后跳转到 `/` 或 `/auth/security-setup`，完全忽略 URL 中的 `callbackURL` 参数。修复方案：(1) 登录页读取 `callbackURL` query param；(2) 验证 URL 为可信域名（防钓鱼）；(3) 三种登录方式（密码、Passkey、Magic Link）统一使用 callbackURL 作为登录后跳转地址。

**Tech Stack:** Next.js 16.1, React 19, better-auth, next-intl

**前置条件:** PR #264（crossSubDomainCookies）已合并。大多数场景用户已在 PWA 登录，cookie 共享后 Editor 直接可用。本 plan 解决 session 过期后的回跳问题。

---

## 调研数据摘要

### 当前问题链

| 环节 | 代码位置 | 问题 |
|------|---------|------|
| Editor middleware | `apps/editor/src/proxy.ts:16-17` | 跳到 `/login?callbackURL=https://editor.bouldering.top/` ✅ 正确 |
| Editor layout | `apps/editor/src/app/layout.tsx:22` | 跳到 `/login` 但**不带** callbackURL ❌ |
| PWA 密码登录 | `apps/pwa/src/app/[locale]/login/page.tsx:82` | `window.location.href = '/'` 硬编码 ❌ |
| PWA Passkey 登录 | `apps/pwa/src/app/[locale]/login/page.tsx:104` | `window.location.href = '/'` 硬编码 ❌ |
| PWA Magic Link | `apps/pwa/src/app/[locale]/login/page.tsx:46` | `callbackURL: '/auth/security-setup'` 硬编码（且该路径 404）❌ |

### 安全考虑

`callbackURL` 来自 URL query string，可能被恶意构造为钓鱼链接（如 `?callbackURL=https://evil.com`）。必须验证 URL 属于可信域名。

可信域名白名单：
- `bouldering.top` 及其子域名（`*.bouldering.top`）
- `localhost`（开发环境）

---

## Task 1: 创建可信 URL 验证工具函数

**Files:**
- Create: `apps/pwa/src/lib/trusted-url.ts`
- Create: `apps/pwa/src/lib/trusted-url.test.ts`

**Step 1: 编写测试**

```typescript
// apps/pwa/src/lib/trusted-url.test.ts
import { describe, it, expect } from 'vitest'
import { isTrustedCallbackURL } from './trusted-url'

describe('isTrustedCallbackURL', () => {
  // 可信 URL
  it('accepts root-relative paths', () => {
    expect(isTrustedCallbackURL('/')).toBe(true)
    expect(isTrustedCallbackURL('/profile')).toBe(true)
    expect(isTrustedCallbackURL('/auth/security-setup')).toBe(true)
  })

  it('accepts bouldering.top URLs', () => {
    expect(isTrustedCallbackURL('https://bouldering.top/')).toBe(true)
    expect(isTrustedCallbackURL('https://www.bouldering.top/zh/profile')).toBe(true)
    expect(isTrustedCallbackURL('https://editor.bouldering.top/')).toBe(true)
    expect(isTrustedCallbackURL('https://editor.bouldering.top/crags')).toBe(true)
  })

  it('accepts localhost in development', () => {
    expect(isTrustedCallbackURL('http://localhost:3000/')).toBe(true)
    expect(isTrustedCallbackURL('http://localhost:3001/editor')).toBe(true)
  })

  // 不可信 URL
  it('rejects external URLs', () => {
    expect(isTrustedCallbackURL('https://evil.com')).toBe(false)
    expect(isTrustedCallbackURL('https://bouldering.top.evil.com')).toBe(false)
    expect(isTrustedCallbackURL('https://notbouldering.top')).toBe(false)
  })

  it('rejects protocol-relative URLs', () => {
    expect(isTrustedCallbackURL('//evil.com')).toBe(false)
  })

  it('rejects javascript URLs', () => {
    expect(isTrustedCallbackURL('javascript:alert(1)')).toBe(false)
  })

  it('returns false for empty/null', () => {
    expect(isTrustedCallbackURL('')).toBe(false)
    expect(isTrustedCallbackURL(null as unknown as string)).toBe(false)
    expect(isTrustedCallbackURL(undefined as unknown as string)).toBe(false)
  })
})
```

**Step 2: 运行测试确认失败**

Run: `pnpm --filter @bloctop/pwa test:run -- trusted-url`
Expected: FAIL — module not found

**Step 3: 实现工具函数**

```typescript
// apps/pwa/src/lib/trusted-url.ts

/**
 * 验证 callbackURL 是否为可信域名，防止开放重定向攻击。
 *
 * 可信: 相对路径 (/xxx)、bouldering.top 及子域名、localhost
 */
export function isTrustedCallbackURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  // 相对路径始终可信
  if (url.startsWith('/') && !url.startsWith('//')) return true

  try {
    const parsed = new URL(url)

    // 仅允许 http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    const hostname = parsed.hostname

    // localhost（开发环境）
    if (hostname === 'localhost') return true

    // bouldering.top 及其子域名
    if (hostname === 'bouldering.top' || hostname.endsWith('.bouldering.top')) return true

    return false
  } catch {
    return false
  }
}
```

**Step 4: 运行测试确认通过**

Run: `pnpm --filter @bloctop/pwa test:run -- trusted-url`
Expected: PASS — 所有测试通过

**Step 5: Commit**

```bash
git add apps/pwa/src/lib/trusted-url.ts apps/pwa/src/lib/trusted-url.test.ts
git commit -m "feat: add trusted URL validation for login callback redirect"
```

---

## Task 2: 登录页读取并使用 callbackURL

**Files:**
- Modify: `apps/pwa/src/app/[locale]/login/page.tsx`

**Step 1: 添加 useSearchParams 并提取 callbackURL**

在文件顶部 import 区添加：

```tsx
import { useSearchParams } from 'next/navigation'
import { isTrustedCallbackURL } from '@/lib/trusted-url'
```

在 `LoginPage` 组件函数体开头（`const t = ...` 之后）添加：

```tsx
const searchParams = useSearchParams()
const rawCallbackURL = searchParams.get('callbackURL')
const callbackURL = rawCallbackURL && isTrustedCallbackURL(rawCallbackURL)
  ? rawCallbackURL
  : '/'
```

**Step 2: 修改密码登录回跳**

将 `apps/pwa/src/app/[locale]/login/page.tsx:82`：

```tsx
// 旧代码
window.location.href = '/'
```

改为：

```tsx
// 新代码
window.location.href = callbackURL
```

**Step 3: 修改 Passkey 登录回跳**

将 `apps/pwa/src/app/[locale]/login/page.tsx:104`：

```tsx
// 旧代码
window.location.href = '/'
```

改为：

```tsx
// 新代码
window.location.href = callbackURL
```

**Step 4: 修改 Magic Link callbackURL**

将 `apps/pwa/src/app/[locale]/login/page.tsx:46`：

```tsx
// 旧代码
callbackURL: '/auth/security-setup',
```

改为：

```tsx
// 新代码
callbackURL: callbackURL,
```

> **注意**: Magic Link 的 callbackURL 由 better-auth 在邮件验证后处理跳转。如果 callbackURL 是外部域名（如 `https://editor.bouldering.top`），better-auth 需要 `trustedOrigins` 中包含该域名（PR #264 已添加）。

**Step 5: 验证 TypeScript**

Run: `pnpm --filter @bloctop/pwa typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/pwa/src/app/[locale]/login/page.tsx
git commit -m "feat: respect callbackURL parameter in login page for cross-app redirect"
```

---

## Task 3: Editor layout.tsx 补上 callbackURL 参数

**Files:**
- Modify: `apps/editor/src/app/layout.tsx:22,28`

**背景:** Editor 的 `layout.tsx` 中有两处 redirect 到 PWA 登录页，但都没有携带 callbackURL。当 middleware 层的 cookie 检测通过（有 cookie 但 session 无效/过期）时，会走到 layout 的 server-side 检测，此时需要带上 callbackURL。

**Step 1: 修改未登录 redirect**

将 `apps/editor/src/app/layout.tsx:22`：

```tsx
// 旧代码
redirect(`${process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'}/zh/login`)
```

改为：

```tsx
// 新代码
const pwaUrl = process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'
const editorUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://editor.bouldering.top'
redirect(`${pwaUrl}/zh/login?callbackURL=${encodeURIComponent(editorUrl)}`)
```

**Step 2: 修改无权限 redirect**

将 `apps/editor/src/app/layout.tsx:28`（权限不足 redirect）做同样改动。

> **注意**: 权限不足时可能不应该回到 editor（会无限循环）。考虑跳到 PWA 首页并显示无权限提示。保持原样 `redirect(pwaUrl + '/zh/login')` 或改为 `redirect(pwaUrl + '/')` 更合理。

**Step 3: 提取公共变量避免重复**

最终 layout.tsx 应为：

```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers: await headers() })

  const pwaUrl = process.env.NEXT_PUBLIC_PWA_URL || 'https://bouldering.top'
  const editorUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://editor.bouldering.top'

  if (!session?.user?.id) {
    redirect(`${pwaUrl}/zh/login?callbackURL=${encodeURIComponent(editorUrl)}`)
  }

  const role = (session.user as { role?: string }).role || 'user'
  const hasAccess = await canAccessEditor(session.user.id, role as 'admin' | 'user')
  if (!hasAccess) {
    // 无权限 → 回 PWA 首页（不回 editor，避免循环）
    redirect(pwaUrl)
  }

  return (
    <html lang="zh" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

**Step 4: 验证 TypeScript**

Run: `pnpm --filter @bloctop/editor typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/editor/src/app/layout.tsx
git commit -m "fix: add callbackURL to editor login redirects"
```

---

## Task 4: Editor 环境变量配置

**Files:**
- Modify: `turbo.json` (添加 `NEXT_PUBLIC_PWA_URL` 到 globalEnv)

**Step 1: 添加环境变量**

在 `turbo.json` 的 `globalEnv` 数组中添加 `"NEXT_PUBLIC_PWA_URL"`。

**Step 2: Commit**

```bash
git add turbo.json
git commit -m "chore: add NEXT_PUBLIC_PWA_URL to turbo globalEnv"
```

**Step 3: Vercel 环境变量**

> 手动操作（不在代码中）：在 Editor 的 Vercel Project Settings → Environment Variables 中添加：
> - `NEXT_PUBLIC_PWA_URL` = `https://bouldering.top`

---

## Task 5: 最终验证

**Step 1: TypeScript 全量检查**

Run: `pnpm turbo typecheck`
Expected: 全部 PASS

**Step 2: 运行测试**

Run: `pnpm --filter @bloctop/pwa test:run`
Expected: 全部 PASS（包含新增的 trusted-url 测试）

**Step 3: Commit 并标注完成**

```bash
git add -A
# 如果有遗漏文件
git commit -m "chore: final verification for cross-subdomain callback fix"
```

---

## 范围边界说明

### 本次包含
- PWA 登录页读取 `callbackURL` 并在登录后跳转
- 可信 URL 验证（防开放重定向攻击）
- Editor layout.tsx 补上 callbackURL
- 三种登录方式（密码、Passkey、Magic Link）统一回跳

### 本次不包含
- **Magic Link 中间页优化**: `/auth/security-setup` 路径当前 404（原始代码 bug，不在本次范围）。如果 callbackURL 为 `/` 或 editor URL，则 Magic Link 直接跳到目标页，无需中间页。
- **Editor 自建登录页**: 当前方案依赖 PWA 的登录页。未来如果 Editor 需要独立登录能力，需要单独评估。
- **Passkey-setup 引导**: 首次登录后的 Passkey 注册引导流程保持不变（仍在 PWA 内完成）。
