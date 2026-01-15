# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

罗源野抱 TOPO - 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

## Node Version

Node.js >= 20.9.0，使用 `nvm use` 自动切换

## Commands

```bash
npm run dev      # 开发服务器 (Turbopack)
npm run build    # 生产构建 (webpack)
npm run start    # 生产服务器
npm run lint     # ESLint
npx shadcn@latest add <component>  # 添加 UI 组件
```

## Tech Stack

- **Framework:** Next.js 16.1.2 + App Router
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york style)
- **PWA:** Serwist (service worker at `src/app/sw.ts`)
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
│   ├── ui/                # shadcn/ui 组件 (button, card, skeleton)
│   ├── crag-card.tsx      # 岩场卡片
│   ├── app-tabbar.tsx     # 底部导航栏
│   ├── floating-search.tsx # 浮动搜索按钮
│   ├── search-overlay.tsx # 搜索覆盖层
│   ├── offline-indicator.tsx  # 离线状态提示 (顶部横幅)
│   └── sw-update-prompt.tsx   # SW 更新提示 (底部弹窗)
├── data/
│   ├── crags.ts           # 岩场数据 (静态)
│   └── routes.ts          # 线路数据 (静态)
├── types/index.ts         # TypeScript 类型定义
├── hooks/                 # 自定义 Hooks
└── lib/
    ├── utils.ts           # cn() 工具函数
    ├── tokens.ts          # 设计令牌
    └── grade-utils.ts     # 难度等级工具
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
  grade: string           // V0-V13 或 "？"
  cragId: string          // 关联岩场
  area: string            // 区域
  setter?: string
  FA?: string             // 首攀者
  description?: string
  image?: string
}
```

## Design System (Material 3)

使用 CSS 变量，定义在 `globals.css`:

```css
/* 主要颜色 */
--m3-primary: #667eea
--m3-on-primary: #ffffff
--m3-surface: #fefbff
--m3-surface-variant: #e4e1ec
--m3-on-surface: #1c1b1f
--m3-on-surface-variant: #46464f
--m3-outline: #777680

/* 间距 */
--space-xs/sm/md/lg/xl: 0.25-1.5rem

/* 圆角 */
--radius-xs/sm/md/lg/xl: 0.25-1.75rem

/* 阴影 */
--elevation-1 到 --elevation-5
```

## Component Patterns

### 提示组件模式 (参考 sw-update-prompt.tsx)

```tsx
// 固定定位底部弹窗
<div className="fixed bottom-20 left-4 right-4 z-50 bg-[var(--m3-primary)] text-white p-4 rounded-xl shadow-lg animate-fade-in-up">
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="font-medium">标题</p>
      <p className="text-sm text-white/80">描述</p>
    </div>
    <button onClick={onClose}>
      <X className="w-5 h-5" />
    </button>
  </div>
  <div className="flex gap-2 mt-3">
    <button className="flex-1 py-2 px-4 bg-white text-[var(--m3-primary)] font-medium rounded-lg">
      主要操作
    </button>
    <button className="py-2 px-4 bg-white/20 font-medium rounded-lg">
      次要操作
    </button>
  </div>
</div>
```

### 顶部横幅模式 (参考 offline-indicator.tsx)

```tsx
<div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 animate-fade-in-up">
  <Icon className="w-4 h-4" />
  <span className="text-sm font-medium">提示信息</span>
</div>
```

## PWA Configuration

- Service Worker: `src/app/sw.ts` (Serwist)
- Manifest: `public/manifest.json`
- COS 图片缓存 30 天，最多 200 张
- 图片域名: `topo-image-1305178596.cos.ap-guangzhou.myqcloud.com`

## Import Aliases

- `@/components` - React 组件
- `@/components/ui` - shadcn/ui 组件
- `@/lib` - 工具函数
- `@/hooks` - 自定义 Hooks
- `@/types` - 类型定义
- `@/data` - 静态数据

## Animations

定义在 `globals.css`:
- `.animate-fade-in-up` - 淡入上移
- `.animate-scale-in` - 缩放淡入
- `.skeleton-shimmer` - 骨架屏闪烁
