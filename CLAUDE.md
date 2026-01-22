# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

罗源野抱 TOPO - 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

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
```

## Tech Stack

- **Framework:** Next.js 16.1.2 + App Router + ISR
- **Database:** MongoDB Atlas (原生驱动)
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york style)
- **Theming:** next-themes (日间/暗夜/自动模式，Dracula 配色)
- **PWA:** Serwist (service worker at `src/app/sw.ts`)
- **Testing:** Vitest + Testing Library + Playwright (组件测试)
- **CI/CD:** GitHub Actions (质量检查) + Vercel (部署)
- **Map:** 高德地图 JS API 1.4.15 (@amap/amap-jsapi-loader)
- **Icons:** lucide-react
- **Fonts:** Plus Jakarta Sans (sans) + JetBrains Mono (mono)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页 - 岩场列表
│   ├── layout.tsx         # 根布局 (fonts, PWA prompts)
│   ├── sw.ts              # Service Worker
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/[id]/        # 线路详情页
│   └── profile/           # 用户页面
├── components/
│   ├── ui/                # shadcn/ui 组件
│   │   ├── button.tsx, card.tsx, skeleton.tsx  # 基础组件
│   │   ├── drawer.tsx     # 通用抽屉组件 (手势关闭)
│   │   └── image-viewer.tsx # 全屏图片查看器 (双指缩放)
│   ├── theme-provider.tsx # 主题上下文提供者
│   ├── theme-switcher.tsx # 主题切换器组件
│   ├── crag-card.tsx      # 岩场卡片
│   ├── app-tabbar.tsx     # 底部导航栏 (毛玻璃效果)
│   ├── filter-chip.tsx    # 筛选芯片组件 (单选/多选)
│   ├── filter-drawer.tsx  # 筛选面板抽屉
│   ├── route-detail-drawer.tsx  # 线路详情抽屉
│   ├── beta-list-drawer.tsx     # Beta 视频列表抽屉
│   ├── floating-search.tsx # 浮动搜索按钮
│   ├── search-overlay.tsx # 搜索覆盖层
│   ├── offline-indicator.tsx  # 离线状态提示 (顶部横幅)
│   ├── sw-update-prompt.tsx   # SW 更新提示 (底部弹窗)
│   ├── install-prompt.tsx # PWA 安装提示 (首页卡片)
│   ├── amap-container.tsx # 高德地图容器组件
│   ├── weather-strip.tsx  # 首页天气条 (攀岩适宜度)
│   ├── weather-badge.tsx  # 卡片天气角标 (温度+图标)
│   ├── weather-card.tsx   # 详情页天气卡 (完整信息+预报)
│   ├── city-selector.tsx  # 城市选择器 (标题下拉菜单)
│   └── empty-city.tsx     # 城市无数据空状态
├── types/index.ts         # TypeScript 类型定义
├── hooks/                 # 自定义 Hooks
│   ├── use-route-search.ts # 线路搜索 Hook (首页搜索用)
│   ├── use-city-selection.ts # 城市选择 Hook (localStorage + IP 定位)
│   └── use-delayed-loading.ts # 延迟加载 Hook (避免骨架屏闪烁)
├── test/                  # 测试工具
│   ├── setup.tsx          # Vitest 全局设置 (mocks)
│   └── utils.tsx          # 测试辅助函数
└── lib/
    ├── utils.ts           # cn() 工具函数
    ├── tokens.ts          # 设计令牌
    ├── grade-utils.ts     # 难度等级工具
    ├── cache-config.ts    # 统一缓存 TTL 配置 (ISR, SW, API, HTTP)
    ├── rate-limit.ts      # 内存级 Rate Limiting (IP 限流)
    ├── filter-constants.ts # 筛选配置常量 (难度分组, URL参数)
    ├── beta-constants.ts   # Beta 平台配置 (小红书, 抖音等)
    ├── weather-constants.ts # 天气配置 (图标, 适宜度阈值)
    ├── weather-utils.ts   # 天气工具 (攀岩适宜度评估)
    ├── city-config.ts     # 城市配置 (ID, 名称, 坐标, adcode)
    ├── logger.ts          # 服务端统一日志工具
    ├── client-logger.ts   # 客户端日志工具 (上报到服务端)
    ├── mongodb.ts         # MongoDB 连接层
    ├── db/index.ts        # 数据访问层 (CRUD, 带日志)
    └── themes/            # 主题系统
        ├── index.ts       # 主题类型和工具函数
        ├── light.ts       # 日间主题 (Dracula Light)
        └── dark.ts        # 暗夜主题 (Dracula)

scripts/
└── seed.ts                # 数据库迁移脚本

playwright/                # Playwright 组件测试配置
├── index.html             # 测试入口 HTML
└── index.tsx              # 测试入口 (加载全局样式)

doc/
└── PROJECT_OVERVIEW.md    # 项目技术文档 (详细)

# 根目录配置文件
vitest.config.ts           # Vitest 测试配置
playwright-ct.config.ts    # Playwright 组件测试配置
```

## Core Data Types

```typescript
interface Coordinates {
  lng: number             // 经度
  lat: number             // 纬度
}

interface ApproachPath {
  id: string
  name: string
  points: Coordinates[]   // 路径点数组
  color?: string          // 路径颜色
  description?: string
}

interface Crag {
  id: string              // 'yuan-tong-si', 'ba-jing-cun'
  name: string            // 岩场名称
  cityId: string          // 所属城市 ID ('luoyuan', 'xiamen')
  location: string        // 地址
  developmentTime: string // 开发时间
  description: string     // 描述
  approach: string        // 接近方式
  coverImages?: string[]  // 封面图片
  coordinates?: Coordinates     // 岩场坐标 (高德地图)
  approachPaths?: ApproachPath[] // 接近路径 (KML导入)
}

// 城市配置类型
type CityId = 'luoyuan' | 'xiamen'

interface CityConfig {
  id: CityId
  name: string              // 显示名称
  adcode: string            // 高德 adcode
  coordinates: Coordinates  // 中心坐标
  available: boolean        // 是否有数据可用
}

interface Route {
  id: number
  name: string            // 线路名称
  grade: string           // V0-V13 或 "？" (Hueco V-Scale 难度等级)
  cragId: string          // 关联岩场
  area: string            // 区域
  setter?: string
  FA?: string             // 首攀者
  description?: string
  image?: string
  betaLinks?: BetaLink[]  // Beta 视频链接
}

// Beta 视频链接（目前仅支持小红书）
type BetaPlatform = 'xiaohongshu'

interface BetaLink {
  id: string
  platform: BetaPlatform
  noteId: string          // 小红书笔记 ID（用于去重）
  url: string
  originalUrl?: string    // 原始短链接
  title?: string
  author?: string
  climberHeight?: number  // 身高 (cm)
  climberReach?: number   // 臂长 (cm)
}
```

## Design System

使用 CSS 变量，定义在 `globals.css`，通过 `.dark` 类控制主题切换（next-themes class 模式）。

### 主题变量 (`--theme-*`)

```css
/* 颜色 */
--theme-primary          /* 主色 */
--theme-on-primary       /* 主色上的文字 */
--theme-primary-container /* 浅色容器背景 */
--theme-on-primary-container /* 容器内文字 */
--theme-surface          /* 表面色/背景色 */
--theme-surface-variant  /* 表面变体色 */
--theme-on-surface       /* 表面上的文字 */
--theme-on-surface-variant /* 次级文字 */
--theme-outline          /* 边框色 */
--theme-outline-variant  /* 边框变体色 */
--theme-warning          /* 警告色 */
--theme-error            /* 错误色 */
--theme-success          /* 成功色 */

/* 圆角 */
--theme-radius-sm/md/lg/xl/full

/* 阴影 */
--theme-shadow-sm/md/lg

/* 过渡动画 */
--theme-transition
```

### 通用令牌 (非主题相关)

```css
/* 间距 */
--space-xs/sm/md/lg/xl: 0.25-1.5rem
--space-page: 1rem

/* 基础圆角 */
--radius-xs/sm/md/lg/xl: 0.25-1.75rem

/* 阴影 (非主题感知) */
--elevation-1 到 --elevation-5
```

### 主题定义

| 主题模式 | 值 | 特点 |
|---------|-----|-----|
| 日间 | `light` | 明亮清爽，紫色主色调 |
| 暗夜 | `dark` | Dracula 配色，护眼舒适 |
| 自动 | `system` | 跟随系统偏好 (默认) |

**Dracula 配色方案** (暗夜模式)：
- 背景: `#282A36` (深紫灰)
- 前景: `#F8F8F2` (浅色文字)
- 主色: `#BD93F9` (Dracula Purple)
- 官方规范: https://draculatheme.com/contribute

### 使用方式

```tsx
// 在组件中使用主题变量 (推荐 style 属性)
<div style={{
  backgroundColor: 'var(--theme-surface)',
  color: 'var(--theme-on-surface)',
  borderRadius: 'var(--theme-radius-xl)',
  boxShadow: 'var(--theme-shadow-sm)',
  transition: 'var(--theme-transition)',
}}>
  内容
</div>

// 半透明色使用 color-mix
style={{
  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, var(--theme-surface))',
}}

// 切换主题 (在组件中使用 next-themes)
import { useTheme } from 'next-themes'
const { theme, setTheme, resolvedTheme } = useTheme()

// 设置主题模式
setTheme('light')   // 日间模式
setTheme('dark')    // 暗夜模式
setTheme('system')  // 自动模式 (跟随系统)

// resolvedTheme 返回实际应用的主题 ('light' 或 'dark')
// 当 theme='system' 时，resolvedTheme 会根据系统偏好返回实际值
```

## Component Patterns

### 提示组件模式 (参考 sw-update-prompt.tsx)

```tsx
// 固定定位底部弹窗 (使用主题变量)
<div
  className="fixed bottom-20 left-4 right-4 z-50 p-4 animate-fade-in-up"
  style={{
    backgroundColor: 'var(--theme-primary)',
    color: 'var(--theme-on-primary)',
    borderRadius: 'var(--theme-radius-xl)',
    boxShadow: 'var(--theme-shadow-lg)',
    transition: 'var(--theme-transition)',
  }}
>
  <div className="flex items-start gap-3">
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)' }}
    >
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="font-medium">标题</p>
      <p className="text-sm" style={{ opacity: 0.8 }}>描述</p>
    </div>
    <button onClick={onClose}>
      <X className="w-5 h-5" />
    </button>
  </div>
  <div className="flex gap-2 mt-3">
    <button
      className="flex-1 py-2 px-4 font-medium"
      style={{
        backgroundColor: 'var(--theme-on-primary)',
        color: 'var(--theme-primary)',
        borderRadius: 'var(--theme-radius-lg)',
      }}
    >
      主要操作
    </button>
    <button
      className="py-2 px-4 font-medium"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)',
        borderRadius: 'var(--theme-radius-lg)',
      }}
    >
      次要操作
    </button>
  </div>
</div>
```

### 顶部横幅模式 (参考 offline-indicator.tsx)

```tsx
<div
  className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 animate-fade-in-up"
  style={{
    backgroundColor: 'var(--theme-warning)',
    color: 'white',
    transition: 'var(--theme-transition)',
  }}
>
  <Icon className="w-4 h-4" />
  <span className="text-sm font-medium">提示信息</span>
</div>
```

### 抽屉组件模式 (参考 drawer.tsx)

```tsx
import { Drawer } from '@/components/ui/drawer'
import { ImageViewer } from '@/components/ui/image-viewer'

// 抽屉高度选项: 'quarter' | 'half' | 'three-quarter' | 'full'
<Drawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  height="three-quarter"
  showHandle          // 显示拖拽手柄
  title="抽屉标题"
  showCloseButton     // 显示关闭按钮
>
  <div className="px-4 pb-4">
    抽屉内容
  </div>
</Drawer>

// 图片查看器 (支持双指缩放)
<ImageViewer
  isOpen={imageOpen}
  onClose={() => setImageOpen(false)}
  src="/path/to/image.jpg"
  alt="图片描述"
/>
```

**抽屉交互特性:**
- 下滑手势关闭 (阈值 100px)
- 背景遮罩点击关闭
- ESC 键关闭
- Body 滚动锁定
- iOS 安全区域适配

### 地图组件模式 (参考 amap-container.tsx)

```tsx
import AMapContainer from '@/components/amap-container'

// 基础使用 - 显示岩场位置
<AMapContainer
  center={{ lng: 119.549, lat: 26.489 }}
  name="圆通寺岩场"
  zoom={15}
  height="200px"
/>

// 带接近路径 - KML 导入后绘制
<AMapContainer
  center={crag.coordinates}
  name={crag.name}
  approachPaths={[
    {
      id: 'path-1',
      name: '主要接近路径',
      points: [
        { lng: 119.545, lat: 26.485 },
        { lng: 119.547, lat: 26.487 },
        { lng: 119.549, lat: 26.489 },
      ],
      color: '#3366FF',
    }
  ]}
/>
```

**地图组件特性:**
- 异步加载高德地图 API (避免首屏阻塞)
- 岩场标记 + 名称标签
- 接近路径绘制 (支持方向箭头)
- 控制按钮: 重置视图 / 导航 / 全屏
- 点击导航按钮跳转高德 App

## PWA Configuration

- Service Worker: `src/app/sw.ts` (Serwist)
- Manifest: `public/manifest.json`
- R2 图片缓存 30 天，最多 200 张
- 图片域名: `img.bouldering.top` (Cloudflare R2)

## API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/beta?routeId=123` | 获取线路的 Beta 视频列表 |
| `POST` | `/api/beta` | 提交 Beta 视频 (Rate Limited) |
| `GET` | `/api/weather?lng=119&lat=26` | 获取天气数据 (含攀岩适宜度, 1h缓存) |
| `GET` | `/api/geo` | IP 定位 → 推断城市 (首次访问智能选择) |
| `POST` | `/api/log` | 客户端错误上报 (Vercel 日志可见) |

> 岩场/线路数据通过 Server Components 直接从 MongoDB 获取，无需 API 路由

## Import Aliases

- `@/components` - React 组件
- `@/components/ui` - shadcn/ui 组件
- `@/lib` - 工具函数
- `@/hooks` - 自定义 Hooks
- `@/types` - 类型定义
- `@/data` - 静态数据

## Logging System

统一的日志系统，日志可在 Vercel Dashboard 中查看。

### 服务端日志 (`src/lib/logger.ts`)

```typescript
import { logger, createModuleLogger } from '@/lib/logger'

// 方式 1: 直接使用 logger
logger.info('Message', { module: 'DB', action: 'getAllCrags', duration: 45 })
logger.error('Failed', error, { module: 'API', action: 'POST /api/beta' })

// 方式 2: 创建模块专用 logger (推荐)
const log = createModuleLogger('Weather')
log.info('Fetched weather', { action: 'GET /api/weather', duration: 120 })
log.error('API failed', error, { action: 'fetchWeatherData' })
```

**日志格式:**
```
2025-01-19T10:30:45.123Z INFO  [DB](getAllCrags) Fetched 5 crags 45ms
{"count":5}
```

### 客户端日志 (`src/lib/client-logger.ts`)

客户端错误自动上报到 `/api/log`，Vercel Dashboard 可见。

```typescript
'use client'
import { clientLogger } from '@/lib/client-logger'

// Error Boundary 中使用
clientLogger.error('Unhandled error', error, {
  component: 'ErrorBoundary',
  action: 'render',
})

// 组件中使用
clientLogger.warn('Unexpected response', {
  component: 'SearchOverlay',
  metadata: { code: 404 },
})
```

### 日志级别

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| `debug` | 开发调试 (生产不输出) | 变量值、中间状态 |
| `info` | 正常业务流程 | 数据获取成功 |
| `warn` | 可恢复的异常 | API 超时重试、缓存未命中 |
| `error` | 需要关注的错误 | 数据库错误、API 失败 |

### Vercel 日志可见性

```
✅ 可见: API Routes, Server Components, Middleware 中的日志
❌ 不可见: Client Components 中的 console (需通过 /api/log 上报)
```

## Animations & Utilities

定义在 `globals.css`:
- `.animate-fade-in-up` - 淡入上移
- `.animate-fade-in` - 淡入
- `.animate-scale-in` - 缩放淡入
- `.animate-drawer-in` - 抽屉底部滑入
- `.skeleton-shimmer` - 骨架屏闪烁
- `.scrollbar-hide` - 隐藏滚动条但保留滚动功能

## Testing

### 测试文件约定

| 类型 | 命名 | 位置 |
|------|------|------|
| 单元测试 | `*.test.ts` | 与源文件同目录 |
| 组件测试 | `*.test.tsx` | 与组件同目录 |
| 浏览器测试 | `*.ct.tsx` | 与组件同目录 |

示例：`src/lib/utils.ts` → `src/lib/utils.test.ts`

### 测试分层

| 层级 | 工具 | 用途 |
|------|------|------|
| 单元测试 | Vitest | 工具函数、纯逻辑 |
| 组件测试 | Vitest + Testing Library | 组件渲染、基础交互 |
| 浏览器测试 | Playwright | 复杂交互 (拖拽、手势) |

### 覆盖率目标

当前覆盖率约 **34%**，主要覆盖核心工具函数和关键组件。

> 查看详细报告：`npm run test:coverage` 后打开 `coverage/index.html`

### 已测试模块

**Lib (工具函数)**:
- `grade-utils.ts`, `tokens.ts`, `filter-constants.ts`
- `beta-constants.ts`, `rate-limit.ts`, `crag-theme.ts`
- `themes/index.ts`, `utils.ts`

**Components (组件)**:
- `filter-chip.tsx`, `grade-range-selector.tsx`
- `drawer.tsx`, `crag-card.tsx`, `search-overlay.tsx`

### CI 流水线

GitHub Actions 自动运行 (push/PR 到 main/dev):
1. 🔍 ESLint - 代码规范
2. 📘 TypeScript - 类型检查
3. 🧪 Unit Tests - Vitest + 覆盖率
4. 🎭 Playwright - 组件测试

## Git Workflow

### ⚠️ Claude 必须遵循的工作流

**每个新需求/功能/修复都必须**：
1. **先创建 Issue** - 使用 `gh issue create` 描述需求
2. **创建 feature 分支** - 命名格式 `feature/issue-{N}-{short-desc}`
3. **完成开发后创建 PR** - 使用 `Closes #{N}` 链接 Issue
4. **等待 CI 通过后合并**

> 不要跳过任何步骤，即使是小改动也要遵循此流程。

### Issue-First 开发流程

```
Issue 创建 → Feature 分支 → PR (dev→main) → 合并 → Issue 自动关闭
```

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 生产分支，受保护，必须通过 PR 合并 |
| `dev` | 开发分支，日常开发 |
| `feature/issue-{N}-{desc}` | 功能分支，从 dev 创建 |

### 完整工作流

```bash
# 1. 创建 Issue
gh issue create --title "[Feature] 功能描述" --body "..."

# 2. 创建 feature 分支
git checkout dev && git pull
git checkout -b feature/issue-42-add-favorites

# 3. 开发并提交
git add . && git commit -m "feat: add user favorites"
git push origin feature/issue-42-add-favorites

# 4. 创建 PR (关联 Issue)
gh pr create --base main --title "feat: add favorites" \
  --body "Closes #42"

# 5. CI 通过后合并 (rebase 策略)
gh pr merge --rebase
```

### Branch Protection (main)

- ✅ 必须通过 CI (ESLint, TypeScript, Unit Tests, Playwright)
- ✅ 必须通过 PR 合并
- ✅ 禁止 force push
- ❌ 不要求 code review (个人项目)

### GitHub 模板文件

| 文件 | 作用 |
|------|------|
| `.github/ISSUE_TEMPLATE/feature.md` | Feature 请求模板 |
| `.github/ISSUE_TEMPLATE/bug.md` | Bug 报告模板 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板 (含 Issue 关联) |

### Issue 关联关键词

在 PR 描述中使用以下关键词自动关联 Issue：
- `Closes #123` - 合并后关闭 Issue
- `Fixes #123` - 合并后关闭 Issue
- `Resolves #123` - 合并后关闭 Issue

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
