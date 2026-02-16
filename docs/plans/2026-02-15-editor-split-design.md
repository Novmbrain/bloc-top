# Editor 拆分设计：Turborepo Monorepo 架构

## 目标

将 editor 功能从 PWA 项目中抽离为独立网站，部署到 Vercel 的独立域名。
形成"岩场管理 & 数据标记服务"，服务于当前 PWA 和未来 iOS App。

## 需求摘要

| 维度 | 决策 |
|------|------|
| 驱动力 | 独立部署节奏 + 团队分工 + iOS 复用 |
| iOS 定位 | 纯展示 App，不编辑。编辑走 Editor 网站 |
| 代码组织 | Turborepo monorepo（pnpm workspaces） |
| 数据层 | 共享 MongoDB + 独立 better-auth 实例 |
| 缓存失效 | Editor 写入后 Webhook → PWA `/api/revalidate` |
| PWA 定位 | 保留用户功能（登录/Beta提交/离线），只拆走 editor |
| Editor 访问 | 仅登录用户，RBAC 控制内容 |

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Git Repository (bloctop)                 │
├──────────────────┬──────────────────┬───────────────────────────┤
│   apps/pwa       │   apps/editor    │       packages/           │
│  bouldering.top  │ editor.bloctop   │  shared/ + ui/            │
│                  │   .top           │                           │
│  ┌────────────┐  │  ┌────────────┐  │  ┌─────────────────────┐  │
│  │ 公共展示   │  │  │ 岩场管理   │  │  │ @bloctop/shared     │  │
│  │ 用户功能   │  │  │ 数据标记   │  │  │  types, db, perms   │  │
│  │ 离线/PWA   │  │  │ 权限管理   │  │  │  utils, constants   │  │
│  └─────┬──────┘  │  └─────┬──────┘  │  ├─────────────────────┤  │
│        │         │        │         │  │ @bloctop/ui         │  │
│        └─────────┼────────┘         │  │  components, styles │  │
│                  │                  │  │  face-image-cache   │  │
│           ┌──────┴───────┐          │  └─────────────────────┘  │
│           │  MongoDB     │          │                           │
│           │ (共享数据库)  │          │                           │
│           └──────────────┘          │                           │
└─────────────────────────────────────┴───────────────────────────┘
```

## 目录结构

```
bloctop/
├── apps/
│   ├── pwa/                              → bouldering.top (Vercel Project A)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx            # 根布局 (fonts)
│   │   │   │   ├── sw.ts                 # Service Worker (Serwist) — PWA 独有
│   │   │   │   ├── [locale]/
│   │   │   │   │   ├── layout.tsx        # 主布局 (ThemeProvider, FaceImageProvider)
│   │   │   │   │   ├── page.tsx          # 首页
│   │   │   │   │   ├── crag/[id]/
│   │   │   │   │   ├── route/
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── profile/
│   │   │   │   │   ├── offline/
│   │   │   │   │   └── intro/
│   │   │   │   └── api/
│   │   │   │       ├── auth/[...all]/    # PWA 的 better-auth 实例
│   │   │   │       ├── revalidate/       # ★ Webhook 接收端
│   │   │   │       ├── crags/            # GET 读取
│   │   │   │       ├── crags/[id]/       # GET 读取 + areas
│   │   │   │       ├── routes/           # GET 读取
│   │   │   │       ├── beta/             # GET + POST (用户提交)
│   │   │   │       ├── cities/           # GET 读取
│   │   │   │       ├── prefectures/      # GET 读取
│   │   │   │       ├── weather/
│   │   │   │       ├── geo/
│   │   │   │       ├── feedback/
│   │   │   │       ├── visit/
│   │   │   │       └── log/
│   │   │   ├── components/               # PWA 专属组件
│   │   │   │   ├── app-tabbar.tsx
│   │   │   │   ├── crag-card.tsx
│   │   │   │   ├── route-detail-drawer.tsx
│   │   │   │   ├── topo-line-overlay.tsx      # Topo 渲染 — PWA 独有
│   │   │   │   ├── multi-topo-line-overlay.tsx
│   │   │   │   ├── route-legend-panel.tsx
│   │   │   │   ├── route-filter-bar.tsx
│   │   │   │   ├── weather-*.tsx
│   │   │   │   ├── search-*.tsx
│   │   │   │   ├── offline-*.tsx
│   │   │   │   ├── city-selector.tsx
│   │   │   │   ├── security-drawer.tsx
│   │   │   │   ├── install-prompt.tsx
│   │   │   │   ├── sw-update-prompt.tsx
│   │   │   │   └── ...
│   │   │   ├── hooks/                    # PWA 专属 hooks
│   │   │   │   ├── use-offline-*.ts
│   │   │   │   ├── use-weather.ts
│   │   │   │   ├── use-city-selection.ts
│   │   │   │   ├── use-crag-routes.ts    # 无 editor mode
│   │   │   │   ├── use-scroll-reveal.ts
│   │   │   │   └── ...
│   │   │   └── lib/
│   │   │       ├── auth.ts              # PWA 的 better-auth server 实例
│   │   │       ├── auth-client.ts       # PWA 的 better-auth client
│   │   │       ├── offline-storage.ts
│   │   │       └── cache-config.ts      # SW 缓存配置
│   │   ├── proxy.ts                     # i18n 路由 + IP 城市检测 (Next.js 16 proxy)
│   │   ├── messages/                     # PWA 翻译文件 (zh/en/fr)
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── editor/                           → editor.bouldering.top (Vercel Project B)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx            # 根布局
│       │   │   ├── [locale]/
│       │   │   │   ├── layout.tsx        # auth guard + FaceImageProvider
│       │   │   │   ├── page.tsx          # Editor hub
│       │   │   │   ├── crags/            # 岩场管理
│       │   │   │   │   └── [id]/         # 岩场详情 + 内联编辑 + 权限
│       │   │   │   ├── routes/           # 线路标注 (Topo 绘制)
│       │   │   │   ├── faces/            # 岩面管理
│       │   │   │   ├── betas/            # Beta 管理
│       │   │   │   ├── users/            # 用户管理 (admin)
│       │   │   │   └── cities/           # 城市管理 (admin)
│       │   │   └── api/
│       │   │       ├── auth/[...all]/    # Editor 的 better-auth 实例
│       │   │       ├── crags/            # 全 CRUD + webhook 触发
│       │   │       ├── crags/[id]/       # PATCH/DELETE + areas
│       │   │       ├── routes/           # 全 CRUD + webhook 触发
│       │   │       ├── routes/[id]/      # PATCH/DELETE
│       │   │       ├── faces/            # 全 CRUD
│       │   │       ├── upload/           # R2 上传
│       │   │       ├── beta/             # 全 CRUD
│       │   │       ├── cities/           # 全 CRUD (admin)
│       │   │       ├── prefectures/      # 全 CRUD (admin)
│       │   │       ├── crag-permissions/ # 权限管理 (admin)
│       │   │       └── editor/           # search-users, crags list
│       │   ├── components/
│       │   │   └── editor/               # 8 个 editor 组件
│       │   │       ├── fullscreen-topo-editor.tsx
│       │   │       ├── crag-permissions-panel.tsx
│       │   │       ├── editor-page-header.tsx
│       │   │       ├── crag-selector.tsx
│       │   │       ├── route-card.tsx
│       │   │       ├── area-select.tsx
│       │   │       ├── beta-card.tsx
│       │   │       └── progress-ring.tsx
│       │   ├── hooks/
│       │   │   ├── use-crag-routes.ts    # 含 editor mode
│       │   │   └── use-break-app-shell-limit.ts
│       │   └── lib/
│       │       ├── auth.ts              # Editor 的 better-auth server 实例
│       │       ├── auth-client.ts       # Editor 的 better-auth client
│       │       ├── editor-utils.ts
│       │       ├── editor-areas.ts
│       │       └── revalidate-pwa.ts    # ★ Webhook 发送端
│       ├── proxy.ts                     # 仅 auth guard (无 i18n, 无城市检测)
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                           # @bloctop/shared — 纯逻辑，无 React
│   │   ├── src/
│   │   │   ├── types/index.ts            # 所有类型定义
│   │   │   ├── db/index.ts              # MongoDB 连接 + CRUD 函数
│   │   │   ├── permissions.ts           # RBAC 权限函数
│   │   │   ├── require-auth.ts          # API 认证 helper
│   │   │   ├── constants.ts             # R2 URL 生成
│   │   │   ├── tokens.ts               # 等级颜色
│   │   │   ├── topo-utils.ts            # SVG 曲线计算
│   │   │   ├── topo-constants.ts        # Topo 配置
│   │   │   ├── grade-utils.ts           # 难度工具
│   │   │   ├── city-utils.ts            # 城市工具
│   │   │   ├── coordinate-utils.ts      # 坐标转换
│   │   │   ├── beta-constants.ts        # Beta 平台
│   │   │   ├── route-utils.ts           # 线路工具
│   │   │   ├── rate-limit.ts            # 限流
│   │   │   ├── request-utils.ts         # 路径清洁
│   │   │   ├── logger.ts               # 服务端日志
│   │   │   ├── api-error-codes.ts       # 错误码
│   │   │   └── utils.ts                # cn()
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                              # @bloctop/ui — React 组件 + 样式
│       ├── src/
│       │   ├── styles/
│       │   │   └── globals.css          # ★ 设计令牌 + 主题变量 + 毛玻璃
│       │   ├── components/
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx            # IME 安全输入
│       │   │   ├── textarea.tsx
│       │   │   ├── composition-input.tsx
│       │   │   ├── drawer.tsx
│       │   │   ├── image-viewer.tsx
│       │   │   ├── segmented-control.tsx
│       │   │   ├── skeleton.tsx
│       │   │   └── toast.tsx
│       │   ├── face-image/
│       │   │   ├── cache-service.ts     # FaceImageCacheService
│       │   │   ├── types.ts
│       │   │   ├── face-image-provider.tsx  # React Context Provider
│       │   │   ├── use-face-image.ts       # Hook
│       │   │   └── face-thumbnail-strip.tsx
│       │   ├── beta/
│       │   │   └── beta-submit-drawer.tsx  # PWA + Editor 都用
│       │   ├── locale/
│       │   │   ├── locale-detector.tsx
│       │   │   └── locale-switcher.tsx
│       │   └── theme/
│       │       ├── theme-provider.tsx
│       │       └── theme-switcher.tsx
│       ├── package.json
│       └── tsconfig.json
│
├── turbo.json                           # 构建编排
├── pnpm-workspace.yaml                  # workspace 声明
├── package.json                         # root scripts
└── .github/
    └── ...
```

## 包分配矩阵

### 判断标准

| 标准 | 归属 |
|------|------|
| 两个 App 都用 + 纯逻辑 | `packages/shared` |
| 两个 App 都用 + React 组件/样式 | `packages/ui` |
| 只有 PWA 用 | `apps/pwa/src/` |
| 只有 Editor 用 | `apps/editor/src/` |

### 详细分配

#### `packages/shared` — 20 个模块

| 模块 | 类型 | 两边使用场景 |
|------|------|-------------|
| `types/index.ts` | 类型 | 所有接口定义 |
| `db/index.ts` | DB | CRUD 函数 |
| `permissions.ts` | 业务 | RBAC 权限判断 |
| `require-auth.ts` | 认证 | API 路由保护 |
| `constants.ts` | 常量 | R2 图片 URL |
| `tokens.ts` | 常量 | 难度等级颜色 |
| `topo-utils.ts` | 工具 | SVG 曲线计算 |
| `topo-constants.ts` | 常量 | Topo 配置 |
| `grade-utils.ts` | 工具 | 难度解析 |
| `city-utils.ts` | 工具 | 城市查找 |
| `coordinate-utils.ts` | 工具 | GCJ-02↔WGS-84 |
| `beta-constants.ts` | 常量 | 平台配置 |
| `route-utils.ts` | 工具 | 共面线路 |
| `rate-limit.ts` | 基础设施 | IP 限流 |
| `request-utils.ts` | 工具 | 路径清洁 |
| `logger.ts` | 基础设施 | 服务端日志 |
| `api-error-codes.ts` | 常量 | 错误码 |
| `filter-constants.ts` | 常量 | 筛选配置 |
| `crag-theme.ts` | 常量 | 岩场主题配色 |
| `utils.ts` | 工具 | cn() |

#### `packages/ui` — 15 个模块

| 模块 | 类型 | 说明 |
|------|------|------|
| `globals.css` | 样式 | 532 行设计令牌 + 主题 + 毛玻璃 |
| `button.tsx` | 组件 | shadcn Button |
| `input.tsx` | 组件 | IME 安全输入 |
| `textarea.tsx` | 组件 | IME 安全文本域 |
| `composition-input.tsx` | 组件 | IME 底层实现 |
| `drawer.tsx` | 组件 | 底部抽屉 |
| `image-viewer.tsx` | 组件 | 全屏图片 |
| `segmented-control.tsx` | 组件 | 分段选择器 |
| `skeleton.tsx` | 组件 | 骨架屏 |
| `toast.tsx` | 组件 | 通知 |
| `face-image-provider.tsx` | 上下文 | 岩面图片缓存 Provider |
| `use-face-image.ts` | Hook | 缓存订阅 |
| `face-thumbnail-strip.tsx` | 组件 | 岩面缩略图条 |
| `beta-submit-drawer.tsx` | 组件 | Beta 提交表单 |
| `theme-provider.tsx` | 上下文 | 主题 Provider |

#### PWA 专属 — 主要模块

| 模块 | 说明 |
|------|------|
| `sw.ts` | Service Worker |
| `offline-storage.ts` | IndexedDB 离线存储 |
| `cache-config.ts` | SW 缓存 TTL |
| `topo-line-overlay.tsx` | Topo 单线路渲染 |
| `multi-topo-line-overlay.tsx` | Topo 多线路渲染 |
| `route-legend-panel.tsx` | 线路图例 |
| `weather-*.tsx` | 天气组件 (3个) |
| `search-*.tsx` | 搜索组件 (3个) |
| `offline-*.tsx` | 离线组件 (3个) |
| `app-tabbar.tsx` | 底部导航 |
| `crag-card.tsx` | 岩场卡片 |
| proxy 城市检测 | IP → 城市 (proxy.ts) |

#### Editor 专属 — 主要模块

| 模块 | 说明 |
|------|------|
| `fullscreen-topo-editor.tsx` | 全屏 Topo 绘制 (535行) |
| `crag-permissions-panel.tsx` | 权限管理面板 |
| `editor-page-header.tsx` | 编辑器 Header |
| `crag-selector.tsx` | 岩场选择器 |
| `route-card.tsx` | 线路卡片 |
| `area-select.tsx` | 区域选择器 |
| `beta-card.tsx` | Beta 卡片 |
| `progress-ring.tsx` | 进度环 |
| `editor-utils.ts` | 编辑器工具 |
| `editor-areas.ts` | 区域管理 |
| `revalidate-pwa.ts` | Webhook 发送 |
| `use-break-app-shell-limit.ts` | 桌面宽度 |

## API 路由分配

### PWA 端

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST` | `/api/auth/[...all]` | PWA better-auth |
| `POST` | `/api/revalidate` | ★ Webhook 接收 |
| `GET` | `/api/crags` | 岩场列表 |
| `GET` | `/api/crags/[id]` | 岩场详情 |
| `GET` | `/api/crags/[id]/routes` | 岩场线路 |
| `GET` | `/api/crags/[id]/version` | 离线版本检查 |
| `GET` | `/api/routes` | 线路列表 |
| `GET` | `/api/routes/[id]` | 线路详情 |
| `GET/POST` | `/api/beta` | Beta 读取 + 用户提交 |
| `GET` | `/api/cities` | 城市列表 |
| `GET` | `/api/prefectures` | 地级市列表 |
| `GET` | `/api/weather` | 天气 |
| `GET` | `/api/geo` | IP 定位 |
| `POST` | `/api/feedback` | 反馈 |
| `POST` | `/api/visit` | 访问统计 |
| `POST` | `/api/log` | 错误上报 |
| `POST` | `/api/user/avatar` | 头像上传 |
| `GET` | `/api/user/avatar/[userId]` | 头像获取 |

### Editor 端

| 方法 | 路径 | 说明 | Webhook |
|------|------|------|---------|
| `GET/POST` | `/api/auth/[...all]` | Editor better-auth | - |
| `GET` | `/api/crags` | 岩场列表 | - |
| `POST` | `/api/crags` | 创建岩场 (admin) | ✅ revalidate `/` |
| `GET/PATCH` | `/api/crags/[id]` | 岩场详情/更新 | ✅ revalidate `/crag/[id]` |
| `DELETE` | `/api/crags/[id]` | 删除岩场 (admin) | ✅ revalidate `/` |
| `PATCH` | `/api/crags/[id]/areas` | 更新区域 | ✅ revalidate `/crag/[id]` |
| `GET/POST` | `/api/routes` | 线路列表/创建 | ✅ revalidate `/crag/[id]` |
| `PATCH/DELETE` | `/api/routes/[id]` | 线路更新/删除 | ✅ revalidate `/crag/[id]` |
| `GET/POST/PATCH/DELETE` | `/api/faces` | 岩面 CRUD | ✅ revalidate `/crag/[id]` |
| `POST` | `/api/upload` | R2 上传 | - |
| `GET/POST/PATCH/DELETE` | `/api/beta` | Beta CRUD | - |
| `GET/POST` | `/api/cities` | 城市 CRUD | ✅ revalidate `/` |
| `GET/POST` | `/api/prefectures` | 地级市 CRUD | ✅ revalidate `/` |
| `GET/POST/DELETE` | `/api/crag-permissions` | 权限管理 | - |
| `GET` | `/api/editor/crags` | 编辑器岩场列表 | - |
| `GET` | `/api/editor/search-users` | 搜索用户 | - |

## Webhook 缓存失效机制

### 流程

```
Editor API Route (写入操作)
       │
       ├─ 1. 写入 MongoDB ✅
       │
       └─ 2. 调用 revalidatePwa()
              │
              POST https://bouldering.top/api/revalidate
              Headers: { Authorization: Bearer <REVALIDATE_SECRET> }
              Body: {
                paths: ["/zh/crag/yuan-tong-si", "/en/crag/yuan-tong-si", "/fr/crag/yuan-tong-si"],
                tags: ["crag-yuan-tong-si"]
              }
              │
              ▼
         PWA /api/revalidate
              │
              ├─ 验证 Authorization header
              ├─ revalidatePath() for each path
              ├─ revalidateTag() for each tag (可选)
              └─ 返回 200 OK
```

### revalidate-pwa.ts 实现概要

```typescript
// apps/editor/src/lib/revalidate-pwa.ts
const PWA_URL = process.env.PWA_URL           // https://bouldering.top
const SECRET = process.env.REVALIDATE_SECRET  // 共享密钥

const LOCALES = ['zh', 'en', 'fr']

export async function revalidatePwa(options: {
  paths?: string[]          // e.g. ['/crag/yuan-tong-si']
  tags?: string[]           // e.g. ['crag-yuan-tong-si']
}) {
  const localizedPaths = options.paths?.flatMap(p =>
    LOCALES.map(locale => `/${locale}${p}`)
  ) ?? []

  try {
    const res = await fetch(`${PWA_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        paths: localizedPaths,
        tags: options.tags,
      }),
    })

    if (!res.ok) {
      console.error(`Revalidation failed: ${res.status}`)
    }
  } catch (error) {
    // Webhook 失败不应阻塞 editor 操作
    // ISR 的 time-based revalidate 作为安全网
    console.error('Revalidation webhook failed:', error)
  }
}
```

### 安全网策略

| 层级 | 机制 | 延迟 |
|------|------|------|
| 主动 | Webhook on-demand revalidation | ~1s |
| 被动 | ISR time-based revalidate (降为 1天) | ≤24h |
| 手动 | PWA `/api/revalidate` 管理端点 | 即时 |

Webhook 失败时不阻塞 editor 操作，靠 ISR time-based revalidate 作为 fallback。

## 认证架构

### 共享 DB + 独立 Auth 实例

```
┌──────────────┐              ┌──────────────┐
│   PWA App    │              │  Editor App  │
│              │              │              │
│ better-auth  │              │ better-auth  │
│  instance A  │              │  instance B  │
│              │              │              │
│ cookie:      │              │ cookie:      │
│ bouldering   │              │ editor.      │
│ .top         │              │ bouldering   │
│              │              │ .top         │
└──────┬───────┘              └──────┬───────┘
       │                             │
       └──────────┬──────────────────┘
                  ▼
       ┌─────────────────────┐
       │     MongoDB         │
       │                     │
       │  user collection    │  ← 共享用户表
       │  session collection │  ← 混合 session (不冲突)
       │  account collection │  ← 共享
       │  passkey collection │  ← 共享
       │  ...data tables...  │  ← 共享
       └─────────────────────┘
```

**关键点：**
- 两个 better-auth 实例共享同一个 MongoDB（同一个 `user` 表）
- session cookie 域不同，互不干扰
- 用户在 PWA 和 Editor 需要**分别登录**
- RBAC 权限数据（`crag_permissions`）共享，两边读取同一份

### better-auth 配置差异

| 配置项 | PWA | Editor |
|--------|-----|--------|
| `baseURL` | `https://bouldering.top` | `https://editor.bouldering.top` |
| `basePath` | `/api/auth` | `/api/auth` |
| `database` | 同一个 MongoDB URI | 同一个 MongoDB URI |
| `plugins` | 基础 (Magic Link + Passkey) | 基础 + Admin 插件 |
| `session.cookieCache` | `maxAge: 300` | `maxAge: 300` |

## 环境变量

### 共享 (两个 Vercel Project 都需要)

| 变量 | 说明 |
|------|------|
| `MONGODB_URI` | 同一个 MongoDB Atlas 连接串 |
| `BETTER_AUTH_SECRET` | **必须不同** — 确保 session 隔离 |
| `NEXT_PUBLIC_AMAP_KEY` | 高德地图 Key |
| `REVALIDATE_SECRET` | Webhook 认证密钥（两边一致） |

### PWA 专属

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | `https://bouldering.top` |
| `RESEND_API_KEY` | Magic Link 邮件 |

### Editor 专属

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | `https://editor.bouldering.top` |
| `PWA_URL` | `https://bouldering.top`（Webhook 目标） |
| `RESEND_API_KEY` | Magic Link 邮件（可共享同一个） |

## Proxy 差异 (Next.js 16 — middleware 已重命名为 proxy)

> Next.js 16 将 `middleware.ts` 重命名为 `proxy.ts`，导出函数从 `middleware` 改为 `proxy`。
> "Proxy" 更准确描述其行为：Edge Runtime 网络代理，位于应用前面。

### PWA proxy.ts

```typescript
// i18n 路由 + IP 城市检测
import createMiddleware from 'next-intl/middleware'
// ... 包含 AMap IP 定位逻辑 + city_selection cookie
export default async function proxy(request: NextRequest) { ... }
```

### Editor proxy.ts

```typescript
// 无 i18n（纯中文），仅做 auth guard
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  // 未登录用户重定向到 PWA 登录页
  const session = request.cookies.get('better-auth.session_token')
  if (!session) {
    return NextResponse.redirect(new URL('https://bouldering.top/zh/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)']
}
```

## i18n 翻译策略

**审查发现**：Editor 页面和组件**完全没有使用** `useTranslations` 或 `getTranslations`。所有 UI 文本都是硬编码中文。PWA `messages/*.json` 中仅有 6 个 editor 相关 key（Profile 命名空间下的编辑器入口文案），拆分后这些 key 留在 PWA。

**决策**：**Editor 不使用 next-intl，不需要 `[locale]` 路由前缀。**
- Editor 路由直接使用 `/crags`, `/routes` 等路径，无需 `/zh/crags`
- 不需要 `messages/` 翻译文件
- 不需要 next-intl middleware
- 大幅简化 Editor 架构：无 i18n 中间件、无 locale 检测、无翻译文件管理

**影响**：
- Editor middleware 仅需做 auth guard（检查登录状态），不需要 i18n 路由
- Editor 的 `revalidatePwa()` webhook 仍需要发送带 locale 前缀的路径给 PWA

## Vercel 部署配置

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": [
    "MONGODB_URI", "MONGODB_DB_NAME",
    "NEXT_PUBLIC_AMAP_KEY", "NEXT_PUBLIC_APP_URL",
    "BETTER_AUTH_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL",
    "REVALIDATE_SECRET",
    "CLOUDFLARE_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test:run": {
      "dependsOn": ["^build"]
    },
    "test:ct": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

> **注意**: `globalEnv` 必须声明所有构建期使用的环境变量，否则 Turborepo 在 Vercel CI 上会忽略这些变量导致构建失败。

### Vercel Project 配置

> **实际发现**: Vercel 会自动检测 `turbo.json` 并使用 Turborepo 构建。Root Directory 保持仓库根目录即可，
> Vercel 自动执行 `turbo run build`，无需手动指定 Build Command。

| 设置 | PWA Project | Editor Project |
|------|-------------|----------------|
| Root Directory | 仓库根目录 (自动检测 Turborepo) | `apps/editor` (待创建) |
| Build Command | 自动: `turbo run build` | 自动: `turbo run build --filter=editor` |
| Domain | `bouldering.top` | `editor.bouldering.top` |
| Framework | Next.js (自动检测) | Next.js |
| Node.js | ≥20.9.0 | ≥20.9.0 |

> **Root Directory 注意**: Vercel 的 Root Directory 是 **Project 级别设置**（非 branch 级别），修改后影响所有分支。
> 当前 PWA Project 的 Root Directory 从 `.` 无需改动 — Vercel 自动从根目录发现 `turbo.json` 并运行 Turborepo 构建。

### Ignored Build Step

Vercel 支持 "Ignored Build Step" 优化，只在相关文件变更时构建：
- PWA: `apps/pwa/**` 或 `packages/**` 变更 → 构建
- Editor: `apps/editor/**` 或 `packages/**` 变更 → 构建
- 只改 `apps/pwa/` → Editor 不构建（反之亦然）

## 迁移策略（概要）

### Phase 1: Monorepo 初始化 — ✅ 已完成

> Branch: `feat/editor-split-prerequisites` → merged to `main` via PR #261 (2026-02-15)

1. ✅ npm → pnpm 迁移 (`d594ee6`)
2. ✅ 代码移入 `apps/pwa/` + Turborepo 初始化 (`28220ad`)
3. ✅ 创建 `packages/shared` 和 `packages/ui` 空骨架 (`2050f98`)
4. ✅ `vercel.json` 移入 `apps/pwa/` (`e93c89d`)
5. ✅ pre-push hook 适配 Turborepo (`fbafb68`)
6. ✅ pnpm lockfile 同步修复 (`f38d166`)
7. ✅ `turbo.json` 添加 `globalEnv` 修复 Vercel 构建 (`d9febf6`)
8. ✅ `middleware.ts` → `proxy.ts` (Next.js 16) (`40bfee7`)

**验证结果**: Vercel 构建成功，906 个测试全部通过，ESLint 0 错误。

### Phase 2: Editor App 创建 — ✅ 已完成

> Branch: `feat/phase2-editor-app` (2026-02-16)

#### Sub-phase 2a: 共享包提取 (`packages/shared`)

1. ✅ 提取类型定义到 `packages/shared/src/types/` (`b84102a`)
2. ✅ 提取 MongoDB + 数据访问层 + Logger (`af6c652`)
   - **关键重构**: `mongodb.ts` 从 top-level `throw` 改为 lazy `getClientPromise()` 函数，防止 Next.js 构建期连接数据库
3. ✅ 提取权限、认证 helper、基础设施 (`2fbbbfe`)
   - `require-auth.ts` 重构为 `createRequireAuth(getAuth)` 依赖注入模式，支持不同 App 传入各自的 auth 实例
4. ✅ 提取工具模块（constants, utils, grade, city, topo, beta 等）(`7e9cd1c`)

#### Sub-phase 2b: UI 包提取 (`packages/ui`)

5. ✅ 提取 UI 组件、face-image-cache、主题到 `packages/ui` (`e849240`)

#### Sub-phase 2c: Editor 骨架

6. ✅ 创建 `apps/editor` Next.js 项目骨架 (`f96a84c`)
   - `package.json`, `next.config.ts` (含 `transpilePackages`), `tsconfig.json`, `globals.css`
7. ✅ 配置 Editor 独立 better-auth 实例 + proxy guard (`3ef6470`)
   - **关键决策**: Editor auth 不含 Magic Link client（用户通过 PWA 注册）
   - **关键决策**: `export const dynamic = 'force-dynamic'` 在 root layout，防止 auth guard 触发 SSG 时连接 MongoDB
   - Passkey `origin` 设为 `editor.bouldering.top`，`rpID` 共享 `bouldering.top`

#### Sub-phase 2d: 代码迁移

8. ✅ 迁移 Editor 页面（7 个目录）、组件（8 个）、hooks（2 个）(`ad51bde`)
9. ✅ 复制 16 个 API 路由到 Editor，更新所有 import (`f9ddf8e`)
   - `cache-config.ts` 补充提取到 `packages/shared`
10. ✅ 实现 `revalidate-pwa.ts` webhook 发送端 (`6d657be`)
    - 替换所有 Editor API 路由中的 `revalidateHelpers` 为 webhook 调用

#### Sub-phase 2e: PWA Import 清理 — 🔄 延迟

> PWA 的 re-export bridge（如 `apps/pwa/src/lib/mongodb.ts` → `@bloctop/shared/mongodb`）工作正常，
> 直接 import 迁移是优化项，不影响功能。延迟到后续单独 PR。

#### Sub-phase 2f: 验证

11. ✅ 全量构建通过（`pnpm build` — shared + ui + pwa + editor 全部成功）
12. ✅ 874 个测试通过（266 shared + 608 PWA）

**关键架构决策记录**:

| 决策 | 方案 | 原因 |
|------|------|------|
| MongoDB 连接 | lazy `getClientPromise()` | 防止构建期 top-level throw |
| Auth 共享 | `createRequireAuth(getAuth)` DI | 各 App 传入各自 auth 实例 |
| Editor i18n | 不使用 next-intl，硬编码中文 | 简化架构，Editor 仅中文 |
| SSG 冲突 | `force-dynamic` 在 root layout | auth guard 需要 runtime MongoDB |
| 跨应用缓存失效 | HTTP webhook (`revalidate-pwa.ts`) | Editor 无法直接调用 PWA 的 `revalidatePath()` |
| PWA import 迁移 | 延迟，保留 re-export bridge | 功能不受影响，减少 Phase 2 变更范围 |

**最终统计**: `packages/shared` (43 files), `packages/ui` (20 files), `apps/editor` (46 files), `apps/pwa` (210 files)

### Phase 3: PWA 清理
1. 从 PWA 中删除 editor 相关页面/组件（待 Phase 2 合并后执行）
2. 更新 `editor/layout.tsx` 保护逻辑（改为重定向到 editor 域名）
3. 清理 PWA re-export bridge，改为直接从 `@bloctop/shared` 导入

### Phase 4: 部署 & 验证
1. Vercel 创建两个 Project
2. 配置域名和环境变量
3. 端到端测试：Editor 编辑 → Webhook → PWA 更新
4. Profile 页面添加"前往编辑器"链接

## 架构审查发现

> 以下为 2026-02-15 深度审查结果，包含设计初版未覆盖的关键问题。

### 🔴 P0 — Passkey rpID 域名冲突

**现状**：`src/lib/auth.ts` 中 Passkey rpID 硬编码为 `'bouldering.top'`：
```typescript
passkey({
  rpID: 'bouldering.top',       // WebAuthn Relying Party ID
  rpName: '寻岩记 BlocTop',
  origin: 'https://www.bouldering.top',
})
```

**问题**：WebAuthn 规范要求 rpID 必须是当前域名或其父域名。
- `bouldering.top` 的 rpID 为 `bouldering.top` → ✅
- `editor.bouldering.top` 的 rpID 也可以为 `bouldering.top` → ✅（子域名可以使用父域名的 rpID）

**结论**：两个实例都使用 `rpID: 'bouldering.top'` 即可。但 `origin` 字段需要区分：
- PWA: `origin: 'https://bouldering.top'`
- Editor: `origin: 'https://editor.bouldering.top'`

**⚠️ 注意**：better-auth 的 `origin` 参数可能需要支持数组，或者 Editor 实例需要单独配置。这需要在实施时验证 better-auth 的 Passkey 插件是否支持多 origin。如果不支持，Editor 可以禁用 Passkey 登录，仅使用 Magic Link。

### 🔴 P0 — `/api/revalidate` 无认证保护

**现状**：当前 `src/app/api/revalidate/route.ts` **完全无认证**，任何人都可以调用触发页面重新生成。

**问题**：
- DoS 风险：恶意调用可触发大量 ISR 重建
- 拆分后此端点将作为 Editor 的 Webhook 接收端，必须加认证

**修复方案**（迁移前就应修复）：
```typescript
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... existing logic
}
```

### 🟡 P1 — BETTER_AUTH_SECRET 必须不同

**设计文档原文**：`BETTER_AUTH_SECRET` "可以相同或不同"

**修正**：**必须使用不同的 secret**。理由：
- 两个 App 需要**独立的 session**（设计决策）
- 如果 secret 相同，一个实例签发的 session token 在另一个实例也能验证
- session 表中没有 domain 字段，无法区分 session 来源
- 不同 secret → token 互相无法验证 → 天然隔离

### 🟡 P1 — 当前无自动 revalidation

**现状审查发现**：
- ISR 仅配置在 2 个页面：线路列表页 + 岩场详情页（30 天）
- **首页无 ISR 配置**（每次请求都是 dynamic rendering）
- **数据变更后无自动 revalidation** — 创建/更新/删除线路、岩场等操作不会触发 `revalidatePath`
- 编辑者必须手动调用 `/api/revalidate` 或等 30 天缓存过期

**影响**：Webhook 机制不仅是拆分后的新需求，实际上**当前 PWA 就缺少自动 revalidation**。

**建议**：在迁移前先给当前 PWA 的写入 API 加上 `revalidatePath`，为后续 Webhook 化打基础。

### 🟡 P1 — API 路由重复问题

**问题**：多个 API 路由（如 `/api/crags`、`/api/routes`）在两个 App 中都存在，但方法不同：
- PWA: 仅 GET
- Editor: GET + POST + PATCH + DELETE

**风险**：代码重复维护。GET handler 的逻辑可能逐渐分化。

**缓解方案**：将 API handler 的核心逻辑放入 `packages/shared/db/`，API route 只做薄薄的 HTTP 层：
```typescript
// apps/pwa/src/app/api/crags/route.ts
import { getAllCrags } from '@bloctop/shared/db'
export async function GET() {
  const crags = await getAllCrags()
  return NextResponse.json(crags)
}

// apps/editor/src/app/api/crags/route.ts
import { getAllCrags, createCrag } from '@bloctop/shared/db'
export async function GET() { /* same */ }
export async function POST(req) { /* editor-only */ }
```

### 🟢 P2 — Session 表混合无冲突

**确认安全**：
- session 表会混合两个 App 的 session 记录
- 但由于 cookie 域不同 + secret 不同，不会互相干扰
- session 记录不会无限增长（有 `expiresAt` 字段，better-auth 会清理过期 session）

### 🟢 P2 — `crag-theme.ts` 和 `filter-constants.ts` 遗漏

审查发现两个共享模块未在设计文档中列出：
- `crag-theme.ts` — 岩场主题配色（editor 岩场列表 + PWA 岩场卡片都用）
- `filter-constants.ts` — 筛选配置（editor 线路选择 + PWA 线路筛选都用）

**修正**：应加入 `packages/shared`。

## 风险与缓解（更新版）

| 风险 | 严重度 | 缓解 |
|------|--------|------|
| Webhook 失败导致 PWA 数据过期 | 中 | ISR time-based fallback (1天) + 手动 revalidate |
| 共享包变更导致两个 app 同时构建失败 | 高 | 充分测试 + Vercel Preview Deployment |
| `/api/revalidate` 无认证被滥用 | ~~🔴高~~ ✅已修复 | Bearer token 认证已加 (`REVALIDATE_SECRET`) |
| Passkey 跨域名兼容性 | ✅已验证 | `origin` 支持 `string[]`，两边共享 `rpID: 'bouldering.top'` |
| API handler 重复维护 | 中 | 核心逻辑下沉到 `packages/shared/db`，route 层做薄壳 |
| Editor 翻译维护 | ~~低~~ ✅消除 | Editor 不使用 next-intl，纯中文硬编码 |
| Turborepo 学习成本 | 低 | Vercel 原生支持，文档成熟 |

## 迁移前置任务（Prerequisite） — ✅ 已完成

> Branch: `feat/editor-split-prerequisites` (2026-02-15)

1. ✅ **`/api/revalidate` 加认证** — Bearer token + env 校验 + paths[]/tags[] 批量支持 (`3aa8b57`)
2. ✅ **写入 API 加自动 revalidation** — 10 个 API 路由全部加入 revalidatePath (`3e23281`)
3. ✅ **首页添加 ISR 配置** — `revalidate = 86400` (1天安全网) (`f2d33b1`)
4. ✅ **Passkey origin 验证** — 已改为数组格式，支持 www/non-www (`f1caf63`)

## 构建工具决策

**原状**：项目曾使用 Nx 22.4.5 做任务编排和缓存（`nx.json`）。

**决策**：迁移到 Turborepo，移除 Nx。理由：
1. Vercel 原生支持 Turborepo，部署零配置
2. Turborepo 配置更简洁（一个 `turbo.json` vs Nx 的多文件配置）
3. 当前 Nx 仅用于任务缓存，未使用其高级特性（generators, executors）
4. pnpm workspaces + Turborepo 是 Vercel monorepo 的推荐组合

**状态**: ✅ 已完成 — Nx 已移除，`nx.json` 已删除，Turborepo 已就绪。

## 未来演进

- **方案 A → B 演进**：逐步将 `packages/shared` 中的模块移到各自 app，降低耦合度
- **iOS App 集成**：iOS 直连同一个 MongoDB（通过新的 API 层或 MongoDB Realm），不需要 editor 暴露 API
- **Editor 国际化**：editor 可以先只支持中文，减少翻译维护成本
