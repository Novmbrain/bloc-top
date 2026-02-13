# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

寻岩记 (BlocTop) - 攀岩线路分享 PWA 应用（野外抱石指南）

## Node Version

Node.js >= 20.9.0，使用 `nvm use` 自动切换

## Quick Start

```bash
# 1. 切换 Node 版本
nvm use

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 MongoDB 连接字符串

# 4. 启动开发服务器
npm run dev
```

## Environment Variables

复制 `.env.example` 为 `.env.local`，配置以下变量：

| 变量 | 必需 | 说明 |
|------|------|------|
| `MONGODB_URI` | ✅ | MongoDB Atlas 连接字符串 |
| `NEXT_PUBLIC_AMAP_KEY` | ✅ | 高德地图 API Key (地图展示 + 天气查询) |
| `BETTER_AUTH_SECRET` | ✅ | Session 签名密钥 (32+ 字符随机串) |
| `RESEND_API_KEY` | ✅ | Resend API Key (`re_xxxx`，Magic Link 邮件) |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用 URL (`https://bouldering.top` / `http://localhost:3000`) |

> 生产环境变量在 Vercel 项目设置中配置

## Commands

```bash
# 开发
npm run dev           # 开发服务器 (Turbopack)
npm run build         # 生产构建 (webpack)
npm run start         # 生产服务器
npm run lint          # ESLint

# 测试
npm run test          # Vitest watch 模式
npm run test:run      # Vitest 单次运行
npm run test:coverage # Vitest + 覆盖率报告
npm run test:ct       # Playwright 组件测试
npm run test:ct:ui    # Playwright 显示浏览器
npm run test:ct:debug # Playwright 慢动作调试

# 数据库
npm run db:seed       # 数据迁移 (开发环境)
npm run db:seed:prod  # 数据迁移 (生产环境)

# UI
npx shadcn@latest add <component>  # 添加 UI 组件

# Claude Code 自定义命令
/ship "描述"          # 端到端 Git 工作流 (commit → PR → Vercel 部署检查 → merge)
/ship "#42"           # 关联已有 issue 的工作流
```

## Tech Stack

- **Framework:** Next.js 16.1.2 + App Router + ISR
- **Database:** MongoDB Atlas (原生驱动)
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york style)
- **Theming:** next-themes (日间/暗夜/自动模式，Dracula 配色)
- **I18n:** next-intl ^4.7.0 (中/英/法三语)
- **PWA:** Serwist (service worker at `src/app/sw.ts`)
- **Testing:** Vitest + Testing Library + Playwright (组件测试)
- **Auth:** better-auth (Magic Link + Passkey/WebAuthn + Admin 插件) + Resend (邮件)
- **CI/CD:** 本地 pre-push hook (质量检查) + Vercel (部署)
- **Map:** 高德地图 JS API 1.4.15 (@amap/amap-jsapi-loader)
- **Icons:** lucide-react
- **Fonts:** Plus Jakarta Sans (sans) + JetBrains Mono (mono)

## Project Structure

```
src/
├── middleware.ts                # ★ Middleware (i18n 路由 + 首页 IP 城市检测)
├── app/
│   ├── layout.tsx              # 根布局 (fonts)
│   ├── sw.ts                   # Service Worker (Serwist)
│   ├── not-found.tsx
│   ├── [locale]/               # ★ i18n 动态路由 (zh/en/fr)
│   │   ├── layout.tsx          # 主布局 (ThemeProvider, Providers)
│   │   ├── page.tsx            # 首页 - 岩场列表
│   │   ├── crag/[id]/          # 岩场详情页
│   │   ├── route/              # 线路列表/详情
│   │   ├── intro/              # 介绍页
│   │   ├── login/              # ★ 登录页 (Magic Link + Passkey)
│   │   ├── auth/               # 认证辅助页面
│   │   │   ├── verify/         # Magic Link 验证中间页
│   │   │   └── passkey-setup/  # Passkey 注册引导页
│   │   ├── profile/            # 用户页面 (含账号管理 + Passkey 管理)
│   │   ├── editor/             # ★ 编辑器 (管理后台, session+admin 保护)
│   │   │   ├── layout.tsx      # Server-side auth guard
│   │   │   ├── page.tsx        # 编辑器首页
│   │   │   ├── crags/          # 岩场管理 (列表 + 详情/权限)
│   │   │   │   └── [id]/       # 岩场详情 + 权限管理面板
│   │   │   ├── routes/         # 线路编辑
│   │   │   ├── faces/          # 岩面图片管理
│   │   │   ├── betas/          # Beta 视频管理
│   │   │   ├── users/          # 用户管理 (admin-only, 角色分配)
│   │   │   └── cities/         # 城市/地级市管理
│   │   └── offline/            # ★ 离线浏览
│   │       ├── page.tsx        # 已下载岩场列表
│   │       ├── crag/[id]/      # 离线岩场详情
│   │       └── route/[id]/     # 离线线路详情
│   └── api/
│       ├── auth/[...all]/      # ★ better-auth catch-all (Magic Link + Passkey + Session)
│       └── ...                 # 其他 API Routes (见下方表)
├── i18n/                       # ★ 国际化配置
│   ├── navigation.ts           # createNavigation (Link, redirect, usePathname)
│   ├── request.ts              # getRequestConfig (server-side i18n)
│   └── routing.ts              # defineRouting (locales, defaultLocale)
├── components/
│   ├── ui/                     # shadcn/ui 基础组件
│   │   ├── button.tsx, skeleton.tsx, drawer.tsx, image-viewer.tsx
│   │   ├── segmented-control.tsx, toast.tsx
│   │   ├── input.tsx, textarea.tsx  # ★ IME 安全输入 (包装 composition-input.tsx)
│   │   └── composition-input.tsx    # CompositionInput 底层实现
│   ├── editor/                 # 编辑器专用组件
│   │   ├── crag-selector.tsx, route-card.tsx, progress-ring.tsx
│   │   ├── editor-page-header.tsx      # 编辑器页面 Header (动态返回按钮)
│   │   ├── crag-permissions-panel.tsx  # 岩场权限管理面板 (创建者/管理者)
│   │   └── fullscreen-topo-editor.tsx  # Topo 线路编辑器
│   ├── face-image-provider.tsx # ★ FaceImageCache React 上下文
│   ├── face-thumbnail-strip.tsx # 岩面缩略图条
│   ├── offline-download-provider.tsx # 离线下载上下文
│   ├── offline-cache-manager.tsx     # 离线缓存管理
│   ├── download-button.tsx           # 岩场下载按钮
│   ├── locale-detector.tsx     # 语言检测
│   ├── locale-switcher.tsx     # 语言切换器
│   ├── crag-card.tsx           # 岩场卡片
│   ├── app-tabbar.tsx          # 底部导航栏 (毛玻璃效果)
│   ├── filter-chip.tsx         # 筛选芯片 (单选/多选)
│   ├── filter-drawer.tsx       # 筛选面板抽屉
│   ├── route-detail-drawer.tsx # 线路详情抽屉 (支持多线路切换)
│   ├── route-filter-bar.tsx    # 线路筛选栏
│   ├── topo-line-overlay.tsx   # Topo 线路 SVG 叠加层
│   ├── multi-topo-line-overlay.tsx # 多线路叠加层 (岩面共享模式)
│   ├── beta-list-drawer.tsx    # Beta 视频列表抽屉
│   ├── beta-submit-drawer.tsx  # Beta 视频提交抽屉
│   ├── floating-search.tsx     # 浮动搜索按钮
│   ├── floating-search-input.tsx # 浮动搜索输入框
│   ├── search-overlay.tsx      # 搜索覆盖层
│   ├── search-drawer.tsx       # 搜索抽屉
│   ├── contextual-hint.tsx     # 上下文提示
│   ├── grade-range-selector.tsx # 难度范围选择器
│   ├── amap-container.tsx      # 高德地图容器
│   ├── weather-strip.tsx       # 首页天气条 (攀岩适宜度)
│   ├── weather-badge.tsx       # 卡片天气角标
│   ├── weather-card.tsx        # 详情页天气卡
│   ├── city-selector.tsx       # 城市选择器
│   ├── offline-indicator.tsx   # 离线状态提示
│   ├── sw-update-prompt.tsx    # SW 更新提示
│   ├── install-prompt.tsx      # PWA 安装提示
│   └── theme-provider.tsx, theme-switcher.tsx
├── hooks/
│   ├── use-face-image.ts       # ★ FaceImageCache hook
│   ├── use-passkey-management.ts # Passkey CRUD (列表/添加/删除)
│   ├── use-offline-download.ts # 离线下载 hook
│   ├── use-offline-mode.ts     # 离线模式检测
│   ├── use-route-search.ts     # 线路搜索
│   ├── use-city-selection.ts   # 城市选择 (cookie 单一数据源, middleware IP 检测)
│   ├── use-crag-routes.ts      # 岩场线路数据
│   ├── use-weather.ts          # 天气数据
│   ├── use-climber-body-data.ts # 攀岩者身体数据 (身高/臂展)
│   ├── use-locale-preference.ts # 语言偏好
│   ├── use-platform-detect.ts  # 平台检测 (iOS/Android/Desktop)
│   ├── use-contextual-hint.ts  # 上下文提示
│   ├── use-media-query.ts      # 响应式媒体查询 (SSR 安全)
│   ├── use-scroll-reveal.ts    # 滚动显示动画
│   └── use-delayed-loading.ts  # 延迟加载 (避免骨架屏闪烁)
├── types/index.ts              # TypeScript 类型定义 (见下方 Core Data Types)
├── test/
│   ├── setup.tsx               # Vitest 全局设置 (mocks)
│   └── utils.tsx               # 测试辅助函数
└── lib/
    ├── face-image-cache/       # ★ 岩面图片缓存层
    │   ├── types.ts            # FaceImageCacheService 接口
    │   ├── cache-service.ts    # 缓存实现 (URL 版本化)
    │   └── index.ts            # 导出
    ├── auth.ts                 # ★ better-auth server config (lazy singleton, Admin 插件)
    ├── auth-client.ts          # better-auth React client (useSession, signIn, signOut, admin)
    ├── permissions.ts          # ★ RBAC 权限定义 + 角色 + 工具函数
    ├── require-auth.ts         # API 路由共享认证 helper (requireAuth)
    ├── email-templates.ts      # Magic Link 邮件 HTML 模板
    ├── db/index.ts             # 数据访问层 (typed CRUD functions)
    ├── mongodb.ts              # MongoDB 连接层 (exports getDatabase())
    ├── constants.ts            # ★ 图片 URL 生成 (getTopoImageUrl, getFaceTopoUrl 等)
    ├── utils.ts                # cn() 工具函数
    ├── tokens.ts               # 设计令牌 (仅 gradeColors)
    ├── grade-utils.ts          # 难度等级工具
    ├── cache-config.ts         # 统一缓存 TTL 配置
    ├── rate-limit.ts           # 内存级 Rate Limiting
    ├── filter-constants.ts     # 筛选配置常量
    ├── beta-constants.ts       # Beta 平台配置
    ├── topo-constants.ts       # Topo 编辑器常量
    ├── topo-utils.ts           # Topo 工具函数
    ├── weather-constants.ts    # 天气配置
    ├── weather-utils.ts        # 天气工具 (攀岩适宜度评估)
    ├── city-utils.ts           # 城市工具函数 (纯同步，接收数据参数)
    ├── route-utils.ts          # 线路工具函数
    ├── editor-utils.ts         # 编辑器工具函数
    ├── editor-areas.ts         # 区域管理 (CRUD)
    ├── offline-storage.ts      # 离线存储工具
    ├── request-utils.ts        # 请求工具 (sanitizePathSegment 等)
    ├── api-error-codes.ts      # API 错误码
    ├── logger.ts               # 服务端日志
    ├── client-logger.ts        # 客户端日志 (上报到 /api/log)
    └── themes/                 # 主题系统 (Dracula)

messages/                       # ★ i18n 翻译文件
├── zh.json                     # 中文 (默认)
├── en.json                     # 英文
└── fr.json                     # 法文

scripts/                        # 数据库脚本
├── seed.ts                     # 数据迁移
└── ...                         # backup, check, migrate 等

doc/
├── PROJECT_OVERVIEW.md         # 项目技术文档 (详细)
├── PROJECT_INDEX.md            # 项目索引 (自动生成)
├── AUTH_SYSTEM.md              # 认证系统架构文档
├── FACE_IMAGE_CACHE_ARCHITECTURE.md  # 缓存架构文档
├── RBAC_DESIGN.md              # ★ RBAC 权限系统设计文档
└── data-flow/                  # 数据流文档
    ├── ROUTE_RENDERING.md      # Bloc 线路渲染数据流
    └── CITY_CRAG_ISOLATION.md  # 城市→岩场数据隔离与多城市扩展
```

## Core Data Types

定义在 `src/types/index.ts`：

```typescript
interface TopoPoint {
  x: number  // 0-1 归一化 X 坐标
  y: number  // 0-1 归一化 Y 坐标
}

interface Route {
  id: number
  name: string
  grade: string           // V0-V13 或 "？" (Hueco V-Scale)
  cragId: string
  area: string
  faceId?: string         // 岩面 ID，同一 faceId 的线路共享图片
  setter?: string
  FA?: string
  description?: string
  image?: string
  betaLinks?: BetaLink[]
  topoLine?: TopoPoint[]  // Topo 线路标注 (归一化坐标)
}

interface Crag {
  id: string              // 'yuan-tong-si', 'ba-jing-cun'
  name: string
  cityId: string          // 所属城市 ID ('luoyuan', 'xiamen')
  location: string
  developmentTime: string
  description: string
  approach: string
  coverImages?: string[]
  coordinates?: Coordinates
  approachPaths?: ApproachPath[]
  areas?: string[]        // 持久化的区域列表
}

interface BetaLink {
  id: string
  platform: BetaPlatform  // 'xiaohongshu'
  noteId: string
  url: string
  originalUrl?: string
  title?: string
  author?: string
  climberHeight?: number
  climberReach?: number
  createdAt?: Date
}

// 其他类型 (详见 types/index.ts):
// Coordinates, ApproachPath, Comment, BetaVideo, User, Feedback, VisitStats
// GRADE_LEVELS, GradeLevel, ClimbingSuitability, WeatherLive, WeatherForecast
// ClimbingCondition, WeatherData, DownloadStatus, DownloadProgress, OfflineCragMeta
// TopoRoute, TopoData
```

城市/地级市配置存储在 MongoDB（`cities`/`prefectures` 集合），类型定义在 `src/types/index.ts`：

```typescript
type CityId = string
interface CityConfig {
  id: string
  name: string
  shortName: string       // 简称 (空间紧张时)
  adcode: string          // 高德 adcode
  coordinates: Coordinates
  available: boolean
  prefectureId?: string   // 所属地级市
  sortOrder?: number
}
interface PrefectureConfig {
  id: string
  name: string
  shortName: string
  districts: string[]     // 下辖区/县 ID 列表（有序）
  defaultDistrict: string // IP 定位命中市级 adcode 时默认选中的区
  sortOrder?: number
}
```

城市工具函数（纯同步）在 `src/lib/city-utils.ts`，接收数据数组作为参数：
```typescript
findCityById(cities, id)  // 按 ID 查找城市
findCityName(cities, id)  // 获取城市名称
isCityValid(cities, id)   // 验证 ID 有效性
findCityByAdcode(cities, prefectures, adcode)  // adcode → 城市
findNearestCity(cities, coords)  // 最近城市
```

## Internationalization (i18n)

使用 `next-intl` 实现，所有页面路由在 `[locale]` 动态段下。

**路由**: `src/i18n/routing.ts` 定义 locales (`zh`, `en`, `fr`) 和 defaultLocale (`zh`)

**翻译文件**: `messages/{locale}.json`

**使用方式**:
```tsx
// Server Component
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('Home')

// Client Component
import { useTranslations } from 'next-intl'
const t = useTranslations('Home')

// 导航 (使用 i18n 版本的 Link)
import { Link } from '@/i18n/navigation'
<Link href="/crag/yuan-tong-si">岩场详情</Link>
```

## Face Image Cache

岩面图片统一缓存层，位于 `src/lib/face-image-cache/`。使用 URL 版本化（`?t=timestamp`）刷新缓存，兼容 Next.js `<Image>`。

- **Provider**: `<FaceImageProvider>` 包裹在 `[locale]/layout.tsx`
- **Hook**: `useFaceImageCache()` 返回 `FaceImageCacheService`
- **订阅**: `subscribe(faceKey, cb)` 精确匹配 | `subscribeByPrefix(prefix, cb)` 列表级
- **失效**: 编辑器 CRUD 操作后调用 `faceImageCache.invalidate(faceKey)`

> 架构详情见 `doc/FACE_IMAGE_CACHE_ARCHITECTURE.md`

## Authentication (better-auth)

无密码认证：Magic Link 邮件 + Passkey 生物识别。

- **Server**: `src/lib/auth.ts` — lazy singleton，通过 `getAuth()` 获取 (避免构建期 top-level await)
- **Client**: `src/lib/auth-client.ts` — `useSession()`, `signIn`, `signOut`, `authClient.passkey.*`
- **API**: `/api/auth/[...all]` — better-auth catch-all 路由
- **编辑器保护**: `editor/layout.tsx` 为 Server Component，检查 `session.user.role === 'admin'`
- **MongoDB**: 自动创建 `user`, `session`, `account`, `verification`, `passkey` collections (单数命名)
- **Hook**: `usePasskeyManagement()` — Passkey 列表/添加/删除
- **Session cookieCache**: 服务端 `maxAge: 300` (5 分钟)，绕过 better-auth 直接修改 `user` 集合后需刷新 session
- **⚠️ 双通道陷阱**: `getSession()` 和 `useSession()` 是**完全独立**的数据通道：
  - `getSession()` — 走 client proxy，standalone fetch，返回数据但**不更新** nanostores session atom
  - `useSession()` — 订阅 nanostores atom，仅在 `$sessionSignal` toggle 时自动 refetch（仅 sign-in/sign-out/update-user 等 mutation 路径触发）
  - **正确刷新方式**: 使用 session atom 的 `refetch` 方法：`(useSession() as any).refetch({ query: { disableCookieCache: true } })`
  - **错误方式**: ~~`getSession({ query: { disableCookieCache: true } })`~~ — 不会更新任何 `useSession()` hook
- **⚠️ ObjectId 陷阱**: 绕过 better-auth adapter 直接操作 `user` 集合时，`_id` 必须用 `new ObjectId(userId)` 而非裸字符串：
  - better-auth 的 MongoDB adapter 内置 `serializeID`，自动将 string 转为 `ObjectId`
  - 我们手写的 `db.collection('user').updateOne(...)` 不经过 adapter，必须自行转换
  - MongoDB 中 `"67a..."` (string) ≠ `ObjectId("67a...")`，`updateOne` 匹配不到时**静默返回** `matchedCount: 0`
  - **正确方式**: `import { ObjectId } from 'mongodb'` → `{ _id: new ObjectId(userId) }`
  - **错误方式**: ~~`{ _id: toMongoId(userId) }`~~ — `toMongoId` 只做类型断言，不转 ObjectId

> 架构详情见 `doc/AUTH_SYSTEM.md`

## RBAC 权限系统

两层架构：用户级角色 + 岩场级权限。

- **权限定义**: `src/lib/permissions.ts` — AC 定义、角色、权限工具函数
- **数据层**: `src/lib/db/index.ts` — `crag_permissions` CRUD 函数
- **类型**: `src/types/index.ts` — `UserRole`, `CragPermission`, `CragPermissionRole`
- **迁移**: `scripts/migrate-crag-ownership.ts` — 初始化岩场所有权
- **用户角色** (`user.role`): `admin` | `crag_creator` | `user`
  - Admin 插件自动管理，通过 `authClient.admin.setRole()` 修改
- **岩场权限** (`crag_permissions` collection): `creator` | `manager`
  - `creator` = 岩场全部权限 + 可分配 manager
  - `manager` = 可编辑线路/岩面/Beta (不可删除岩场)
- **权限函数**: `canCreateCrag(role)`, `canEditCrag(userId, cragId, role)`, `canDeleteCrag(...)`, `canAccessEditor(...)`, `getEditableCragIds(...)`

> 设计详情见 `doc/RBAC_DESIGN.md`

## Design System

使用 CSS 变量 (`globals.css`)，通过 `.dark` 类控制主题切换 (next-themes class 模式)。

### 主题变量 (`--theme-*`)

| 类别 | 变量 |
|------|------|
| 颜色 | `primary`, `on-primary`, `primary-container`, `on-primary-container` |
| 表面 | `surface`, `surface-variant`, `on-surface`, `on-surface-variant` |
| 边框 | `outline`, `outline-variant` |
| 状态 | `warning`, `error`, `success` |
| 桌面 | `desktop-bg` |
| 圆角 | `radius-sm/md/lg/xl/full` |
| 阴影 | `shadow-sm/md/lg` |
| 动画 | `transition` |

### 通用令牌

```css
--space-xs/sm/md/lg/xl: 0.25-1.5rem    /* 间距 */
--space-page: 1rem
--radius-xs/sm/md/lg/xl: 0.25-1.75rem  /* 基础圆角 */
--elevation-1 到 --elevation-5          /* 阴影 */
--app-shell-width: 480px               /* 桌面居中宽度 */
--app-shell-padding: 16px
```

### Dracula 配色 (暗夜模式)

背景 `#282A36` | 前景 `#F8F8F2` | 主色 `#BD93F9` | 规范: https://draculatheme.com/contribute

### 使用方式

```tsx
// 组件中使用主题变量 (推荐 style 属性)
style={{
  backgroundColor: 'var(--theme-surface)',
  color: 'var(--theme-on-surface)',
  borderRadius: 'var(--theme-radius-xl)',
}}

// 半透明色
style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))' }}

// 主题切换
import { useTheme } from 'next-themes'
const { theme, setTheme, resolvedTheme } = useTheme()
// resolvedTheme: theme='system' 时返回实际 'light' 或 'dark'
```

## Code Exploration Rules (Serena MCP)

**所有代码探索场景必须优先使用 Serena MCP Server 工具**，无论是用户直接输入 prompt 还是通过 skill 触发。

| 场景 | 使用工具 |
|------|---------|
| 浏览文件/目录 | `serena.read_file` / `serena.list_dir` |
| 搜索代码模式 | `serena.search_for_pattern` |
| 查看符号概览 | `serena.get_symbols_overview` |
| 查找符号定义 | `serena.find_symbol` (支持 `include_body`, `depth`) |
| 查找引用关系 | `serena.find_referencing_symbols` |
| 查找文件 | `serena.find_file` |

**注意**: 使用前需确保项目已激活 (`serena.activate_project`)。项目名称：`PWA-app`。

## Input Component Rules (IME Composition)

**禁止在 `src/` 中直接使用 `<input>` 或 `<textarea>`**，必须使用封装组件：

| 原生元素 | 替代组件 | 导入路径 |
|---------|---------|---------|
| `<input>` | `<Input>` | `@/components/ui/input` |
| `<textarea>` | `<Textarea>` | `@/components/ui/textarea` |

**原因**: 原生 `<input>` 的 `onChange` 在中文/日文 IME 输入法组合过程中会提前触发，导致拼音被意外提交。`Input`/`Textarea` 内部使用 `CompositionInput`，通过 `compositionstart`/`compositionend` 事件正确处理 IME 输入。

**ESLint 强制执行**: `eslint.config.mjs` 中配置了 `no-restricted-syntax` 规则，违规会报错。

**例外情况** (需添加 `// eslint-disable-next-line no-restricted-syntax` 注释):
- `type="file"` / `type="hidden"` — 无文本输入，不涉及 IME
- `type="number"` — 数字输入无 IME 组合问题
- `type="password"` — 密码输入无 IME 组合问题

```tsx
// ✅ 正确
import { Input } from '@/components/ui/input'
<Input value={text} onChange={setText} placeholder="搜索..." />

// ✅ 使用 unstyled variant（自定义样式场景）
<Input variant="unstyled" value={text} onChange={setText} />

// ❌ 错误 — 会导致中文输入 bug
<input value={text} onChange={e => setText(e.target.value)} />
```

## Key Component APIs

### Drawer (抽屉组件)

```tsx
import { Drawer } from '@/components/ui/drawer'

<Drawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  height="three-quarter"    // 'quarter' | 'half' | 'three-quarter' | 'full'
  showHandle                // 拖拽手柄
  title="标题"
  showCloseButton
>
  <div className="px-4 pb-4">内容</div>
</Drawer>
```

特性: 下滑手势关闭 (100px 阈值) | 遮罩点击关闭 | ESC 关闭 | Body 滚动锁定 | iOS 安全区适配

### ImageViewer (全屏图片)

```tsx
import { ImageViewer } from '@/components/ui/image-viewer'
<ImageViewer isOpen={open} onClose={close} src="/path.jpg" alt="描述" />
```

### AMapContainer (高德地图)

```tsx
import AMapContainer from '@/components/amap-container'
<AMapContainer center={coordinates} name="岩场名" zoom={15} height="200px" approachPaths={paths} />
```

## PWA Configuration

- Service Worker: `src/app/sw.ts` (Serwist)
- Manifest: `public/manifest.json`
- R2 图片缓存 30 天，最多 200 张
- 图片域名: `img.bouldering.top` (Cloudflare R2)

## R2 Key 与中文编码规则

> ⚠️ 曾因编码不一致导致多次线上 bug，新增 R2 相关代码时必须遵守以下规则。

| 场景 | 编码方式 | 示例 |
|------|---------|------|
| **R2 Key 存储** (`Key` 参数) | **不编码**，使用原始 UTF-8 | `cragId/区域A/岩面1.jpg` |
| **路径净化** (防注入) | `sanitizePathSegment()` | 保留中文，移除 `../` 等危险字符 |
| **公共图片 URL** | `encodeURIComponent` | `img.bouldering.top/cragId/%E5%8C%BA%E5%9F%9FA/...` |
| **S3 `CopySource`** | 按段 `encodeURIComponent` | `bucket/cragId/%E5%8C%BA%E5%9F%9FA/...` |
| **URL 查询参数** | `encodeURIComponent` | `?area=%E5%8C%BA%E5%9F%9FA` |
| **R2 列表解析** | `decodeURIComponent` (try-catch) | 兼容旧的双重编码 key |

**核心原则**: Cloudflare 公共域名 (`img.bouldering.top`) 会自动解码 URL 路径，所以 R2 Key 必须存储为原始 Unicode。若存为 percent-encoded 字符串，CDN URL 解码后找不到对应 key → 404。

```typescript
// ✅ 正确 — R2 Key 原始存储
const key = `${cragId}/${area}/${faceId}.jpg`
await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: file }))

// ✅ 正确 — CopySource 需要编码 (S3 HTTP 头不支持非 ASCII)
const encoded = key.split('/').map(s => encodeURIComponent(s)).join('/')
await s3.send(new CopyObjectCommand({ Bucket, CopySource: `${Bucket}/${encoded}`, Key: newKey }))

// ✅ 正确 — 公共 URL 编码
const url = `${IMAGE_BASE_URL}/${cragId}/${encodeURIComponent(faceId)}.jpg`

// ❌ 错误 — R2 Key 不应编码
const key = `${cragId}/${encodeURIComponent(faceId)}.jpg`  // 会导致双重编码
```

## API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST` | `/api/auth/[...all]` | ★ better-auth catch-all (登录/注册/session/passkey) |
| `GET` | `/api/cities` | 获取城市和地级市列表 (5min 缓存) |
| `POST` | `/api/cities` | 创建城市 (admin) |
| `PATCH/DELETE` | `/api/cities/[id]` | 更新/删除城市 (admin) |
| `GET/POST` | `/api/prefectures` | 地级市列表/创建 (admin) |
| `PATCH/DELETE` | `/api/prefectures/[id]` | 更新/删除地级市 (admin) |
| `GET` | `/api/crags` | 获取所有岩场列表 |
| `GET` | `/api/crags/[id]/routes` | 获取指定岩场的线路列表 |
| `PATCH` | `/api/crags/[id]/areas` | 更新岩场区域列表 (需认证+岩场权限) |
| `GET/POST` | `/api/routes` | 获取/创建线路 (POST 需认证+岩场权限) |
| `GET/PATCH/DELETE` | `/api/routes/[id]` | 获取/更新/删除线路 (PATCH/DELETE 需认证+岩场权限) |
| `GET/POST` | `/api/beta` | 获取/提交 Beta 视频 (POST: Rate Limited, PATCH/DELETE: 需认证) |
| `GET/PATCH/DELETE` | `/api/faces` | 岩面图片管理 (全部需认证+岩场权限) |
| `POST` | `/api/upload` | 上传 Topo 图片到 R2 (需认证+岩场权限) |
| `GET/POST/DELETE` | `/api/crag-permissions` | 岩场权限管理 (需 creator/admin) |
| `GET` | `/api/editor/crags` | 编辑器岩场列表 (权限过滤, 需认证) |
| `GET` | `/api/editor/search-users?q=xxx` | 搜索用户 (邮箱模糊匹配, 需 editor 权限) |
| `POST` | `/api/revalidate` | ISR 按需重验证 |
| `GET` | `/api/weather?lng=119&lat=26` | 天气数据 (含攀岩适宜度, 1h 缓存) |
| `GET` | `/api/geo` | IP 定位 → 推断城市 (主要由 middleware 替代，保留供 profile 等场景) |
| `POST` | `/api/feedback` | 用户反馈/留言 |
| `POST` | `/api/visit` | 访问统计上报 |
| `POST` | `/api/log` | 客户端错误上报 |

> 岩场/线路数据通过 Server Components 直接从 MongoDB 获取，无需 API 路由

## Import Aliases

- `@/components` — React 组件
- `@/components/ui` — shadcn/ui 组件
- `@/lib` — 工具函数
- `@/hooks` — 自定义 Hooks
- `@/types` — 类型定义
- `@/i18n` — 国际化工具
- `@/data` — 静态数据

## Logging System

```typescript
// 服务端 (推荐模块 logger)
import { createModuleLogger } from '@/lib/logger'
const log = createModuleLogger('Weather')
log.info('Fetched weather', { action: 'GET /api/weather', duration: 120 })
log.error('API failed', error, { action: 'fetchWeatherData' })

// 客户端 (自动上报到 /api/log → Vercel Dashboard 可见)
import { clientLogger } from '@/lib/client-logger'
clientLogger.error('Unhandled error', error, { component: 'ErrorBoundary' })
```

级别: `debug` (开发) | `info` (业务) | `warn` (可恢复) | `error` (需关注)

Vercel 可见: API Routes + Server Components + Middleware。Client Components 需通过 `/api/log` 上报。

## Animations & Utilities

定义在 `globals.css`:
- `.animate-fade-in-up` — 淡入上移
- `.animate-fade-in` — 淡入
- `.animate-scale-in` — 缩放淡入
- `.animate-drawer-in` — 抽屉底部滑入
- `.animate-pulse-subtle` — 微脉冲 (状态指示器)
- `.scroll-reveal` / `.scroll-reveal-left` / `.scroll-reveal-right` — 滚动触发动画
- `.skeleton-shimmer` — 骨架屏闪烁
- `.scrollbar-hide` — 隐藏滚动条但保留滚动功能
- `.desktop-center-full` / `.desktop-center-padded` — 桌面居中

## Testing

### 测试文件约定

| 类型 | 命名 | 位置 |
|------|------|------|
| 单元测试 | `*.test.ts` | 与源文件同目录 |
| 组件测试 | `*.test.tsx` | 与组件同目录 |
| 浏览器测试 | `*.ct.tsx` | 与组件同目录 |

### 测试分层

| 层级 | 工具 | 用途 |
|------|------|------|
| 单元测试 | Vitest | 工具函数、纯逻辑 |
| 组件测试 | Vitest + Testing Library | 组件渲染、基础交互 |
| 浏览器测试 | Playwright | 复杂交互 (拖拽、手势) |

### CI 流水线（本地 pre-push hook）

所有质量检查在本地 `git push` 时自动运行（`.husky/pre-push`）：
1. ESLint — 代码规范
2. TypeScript — 类型检查
3. Vitest — 单元测试
4. Playwright — 组件测试

> 任一检查失败会阻止 push。跳过检查（不推荐）：`git push --no-verify`

## Documentation Rules

当完成以下类型的修改时，必须同步更新文档：

### 需要更新 CLAUDE.md 的情况：
- 添加/删除/重命名文件或目录
- 修改技术栈（依赖、框架版本）
- 添加新的组件模式或设计规范
- 修改项目命令或配置

### 需要更新 doc/PROJECT_OVERVIEW.md 的情况：
- 重大架构变更（如添加数据库、API 层）
- 新增核心功能模块
- 修改数据流或状态管理方式
- 添加新的技术决策

### 文档更新原则：
1. 保持 CLAUDE.md 简洁（供 AI 快速参考）
2. 保持 PROJECT_OVERVIEW.md 详细（供开发者学习）
3. 每次任务结束前检查是否需要更新文档
