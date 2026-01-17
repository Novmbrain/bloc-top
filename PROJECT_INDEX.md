# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

Generated: 2026-01-17

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (Pages)
│   ├── page.tsx           # 首页 - 岩场列表
│   ├── layout.tsx         # 根布局
│   ├── sw.ts              # Service Worker (Serwist)
│   ├── api/beta/          # Beta API 端点
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/             # 线路列表页
│   ├── route/[id]/        # 线路详情页
│   └── profile/           # 设置页面
├── components/            # React 组件
│   ├── ui/                # 基础 UI 组件 (shadcn/ui)
│   │   ├── button.tsx, card.tsx, skeleton.tsx
│   │   ├── drawer.tsx     # 通用抽屉 (手势关闭)
│   │   └── image-viewer.tsx # 全屏图片查看器
│   ├── app-tabbar.tsx     # 底部导航栏
│   ├── filter-drawer.tsx  # 筛选面板
│   ├── route-detail-drawer.tsx  # 线路详情抽屉
│   ├── beta-list-drawer.tsx     # Beta 视频列表
│   ├── beta-submit-drawer.tsx   # Beta 提交表单
│   └── theme-switcher.tsx # 主题切换器
├── lib/                   # 工具库
│   ├── mongodb.ts         # MongoDB 连接层
│   ├── db/index.ts        # 数据访问层
│   ├── beta-constants.ts  # Beta 平台配置
│   ├── rate-limit.ts      # IP 限流
│   ├── filter-constants.ts # 筛选配置
│   └── themes/            # 主题系统
├── hooks/                 # 自定义 Hooks
│   ├── use-drawer.ts      # 抽屉状态管理
│   └── use-route-search.ts # 线路搜索
├── types/index.ts         # TypeScript 类型
└── data/                  # 静态数据备份
    ├── crags.ts           # 岩场数据
    └── routes.ts          # 线路数据

scripts/
├── seed.ts                # 数据库迁移
├── seed-beta.ts           # Beta 数据迁移
├── check-routes.ts        # 线路数据检查
└── copy-db-to-prod.ts     # Dev→Prod 数据复制
```

---

## 🚀 Entry Points

| 入口 | 路径 | 说明 |
|------|------|------|
| CLI 开发 | `npm run dev` | Turbopack 开发服务器 |
| CLI 构建 | `npm run build` | Webpack 生产构建 |
| API | `/api/beta` | Beta 视频 CRUD |
| PWA | `/sw.ts` | Service Worker |

---

## 📦 Core Modules

### 数据层
| 模块 | 路径 | 用途 |
|------|------|------|
| MongoDB | `lib/mongodb.ts` | 数据库连接管理 |
| DB 操作 | `lib/db/index.ts` | CRUD 封装 |
| 类型定义 | `types/index.ts` | Route, Crag, BetaLink |

### 业务逻辑
| 模块 | 路径 | 用途 |
|------|------|------|
| Beta 配置 | `lib/beta-constants.ts` | 小红书 URL 解析/验证 |
| 限流 | `lib/rate-limit.ts` | IP 级别限流 (5/min) |
| 筛选 | `lib/filter-constants.ts` | 难度筛选配置 |

### UI 组件
| 组件 | 路径 | 用途 |
|------|------|------|
| Drawer | `components/ui/drawer.tsx` | 通用抽屉 (手势关闭) |
| ImageViewer | `components/ui/image-viewer.tsx` | 全屏图片 (双指缩放) |
| FilterChip | `components/filter-chip.tsx` | 筛选芯片 |
| AppTabbar | `components/app-tabbar.tsx` | 底部导航 |

---

## 🔧 Configuration

| 文件 | 用途 |
|------|------|
| `package.json` | 依赖和脚本 |
| `vercel.json` | Vercel 部署配置 |
| `components.json` | shadcn/ui 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.ts` | Tailwind CSS v4 |

---

## 🗄️ Database

### 环境分离
| 环境 | 数据库名 | 用途 |
|------|---------|------|
| 本地开发 | `luoyuan-topo-dev` | 测试数据 |
| Vercel 生产 | `luoyuan-topo-prod` | 生产数据 |

### Collections
| 集合 | 文档数 | Schema |
|------|--------|--------|
| `crags` | 2 | `{ id, name, location, description, approach, coverImages }` |
| `routes` | 47 | `{ id, name, grade, cragId, area, FA, betaLinks[] }` |

---

## 🎨 Theme System

### 主题变量 (CSS Custom Properties)
```css
--theme-primary          /* 主色 */
--theme-surface          /* 背景色 */
--theme-on-surface       /* 文字色 */
--theme-radius-*         /* 圆角 */
--theme-shadow-*         /* 阴影 */
```

### 可用主题
| 主题 | 名称 | 特点 |
|------|------|------|
| `minimal` | 极简专业 | 黑白灰、高对比 (默认) |
| `outdoor` | 户外探险 | 大地色、暖色调 |

---

## 🔗 Key Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.2 | 框架 (App Router + ISR) |
| React | 19.2.3 | UI 库 |
| MongoDB | 7.0.0 | 数据库驱动 |
| Serwist | 9.5.0 | PWA Service Worker |
| next-themes | 0.4.6 | 主题切换 |
| Tailwind CSS | 4 | 样式 |
| lucide-react | 0.562.0 | 图标 |

---

## 📊 Codebase Stats

| 指标 | 值 |
|------|-----|
| TypeScript 文件 | 58 |
| 代码行数 | ~8,179 |
| 组件数量 | 25+ |
| API 端点 | 1 |

---

## 📝 Quick Start

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 MongoDB URI

# 3. 启动开发服务器
npm run dev

# 4. 数据库迁移 (可选)
npm run db:seed
```

---

## 🔄 Recent Changes

| 日期 | 功能 |
|------|------|
| 2026-01-17 | Beta URL 智能提取 (小红书分享文本) |
| 2026-01-17 | 设置页面重新设计 (作者信息抽屉) |
| 2026-01-17 | Beta 去重 + IP 限流 |
| 2026-01-17 | Dev/Prod 数据库分离 |

---

## 📚 Documentation

| 文档 | 说明 |
|------|------|
| `CLAUDE.md` | AI 助手指南 (简洁) |
| `doc/PROJECT_OVERVIEW.md` | 详细技术文档 |
| `PROJECT_INDEX.md` | 本索引文件 |
