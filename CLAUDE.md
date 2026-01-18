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
- **Theming:** next-themes (双主题: 极简/户外)
- **PWA:** Serwist (service worker at `src/app/sw.ts`)
- **Testing:** Vitest + Testing Library + Playwright (组件测试)
- **CI/CD:** GitHub Actions (质量检查) + Vercel (部署)
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
│   └── install-prompt.tsx # PWA 安装提示 (首页卡片)
├── data/
│   ├── crags.ts           # 岩场数据 (静态备份)
│   └── routes.ts          # 线路数据 (静态备份)
├── types/index.ts         # TypeScript 类型定义
├── hooks/                 # 自定义 Hooks
│   └── use-route-search.ts # 线路搜索 Hook (首页搜索用)
├── test/                  # 测试工具
│   ├── setup.tsx          # Vitest 全局设置 (mocks)
│   └── utils.tsx          # 测试辅助函数
└── lib/
    ├── utils.ts           # cn() 工具函数
    ├── tokens.ts          # 设计令牌
    ├── grade-utils.ts     # 难度等级工具
    ├── rate-limit.ts      # 内存级 Rate Limiting (IP 限流)
    ├── filter-constants.ts # 筛选配置常量 (难度分组, URL参数)
    ├── beta-constants.ts   # Beta 平台配置 (小红书, 抖音等)
    ├── mongodb.ts         # MongoDB 连接层
    ├── db/index.ts        # 数据访问层 (CRUD)
    └── themes/            # 主题系统
        ├── index.ts       # 主题类型和工具函数
        ├── minimal.ts     # 极简专业主题
        └── outdoor.ts     # 户外探险主题

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
interface Crag {
  id: string              // 'yuan-tong-si', 'ba-jing-cun'
  name: string            // 岩场名称
  location: string        // 地址
  developmentTime: string // 开发时间
  description: string     // 描述
  approach: string        // 接近方式
  coverImages?: string[]  // 封面图片
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

使用 CSS 变量，定义在 `globals.css`，通过 `data-theme` 属性控制主题切换。

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

| 主题 | name | 特点 |
|-----|------|-----|
| 极简专业 | `minimal` | 黑白灰、高对比、专业 (默认) |
| 户外探险 | `outdoor` | 大地色、暖色调、户外氛围 |

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
const { theme, setTheme } = useTheme()
setTheme('outdoor') // 或 'minimal'
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

## PWA Configuration

- Service Worker: `src/app/sw.ts` (Serwist)
- Manifest: `public/manifest.json`
- COS 图片缓存 30 天，最多 200 张
- 图片域名: `topo-image-1305178596.cos.ap-guangzhou.myqcloud.com`

## API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/beta?routeId=123` | 获取线路的 Beta 视频列表 |
| `POST` | `/api/beta` | 提交 Beta 视频 (Rate Limited) |

> 岩场/线路数据通过 Server Components 直接从 MongoDB 获取，无需 API 路由

## Import Aliases

- `@/components` - React 组件
- `@/components/ui` - shadcn/ui 组件
- `@/lib` - 工具函数
- `@/hooks` - 自定义 Hooks
- `@/types` - 类型定义
- `@/data` - 静态数据

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
