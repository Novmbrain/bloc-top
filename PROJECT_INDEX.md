# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

Generated: 2026-01-26
Total Source Files: 146 TypeScript/TSX files
Test Coverage: 41 test files (~34%)

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router (16.1.2)
│   ├── [locale]/                 # 国际化路由 (zh/en/fr)
│   │   ├── page.tsx              # 首页 - 岩场列表
│   │   ├── home-client.tsx       # 首页客户端组件 (过滤、搜索)
│   │   ├── layout.tsx            # 国际化布局
│   │   ├── crag/[id]/            # 岩场详情页
│   │   ├── route/                # 线路列表页
│   │   │   ├── page.tsx          # 服务端组件
│   │   │   └── [id]/             # 线路详情页
│   │   ├── profile/              # 设置页面
│   │   ├── offline/              # 离线模式页面
│   │   │   ├── page.tsx          # 已下载岩场列表
│   │   │   ├── crag/[id]/        # 离线岩场详情
│   │   │   └── route/[id]/       # 离线线路详情
│   │   └── demo/                 # Demo 页面 ✨NEW
│   │       ├── page.tsx          # Demo 列表
│   │       └── editor/           # Topo 编辑器演示
│   ├── api/                      # API Routes (11 个端点)
│   │   ├── beta/                 # Beta 视频 CRUD
│   │   ├── weather/              # 天气数据 (高德API)
│   │   ├── geo/                  # IP 地理定位
│   │   ├── visit/                # 访问统计
│   │   ├── feedback/             # 用户反馈
│   │   ├── log/                  # 客户端日志上报
│   │   ├── crags/                # 岩场 API ✨NEW
│   │   │   └── [id]/routes       # 岩场线路列表
│   │   ├── routes/[id]/          # 线路 API ✨NEW
│   │   └── upload/               # 图片上传 ✨NEW
│   ├── layout.tsx                # 根布局
│   ├── globals.css               # 全局样式
│   ├── sw.ts                     # Service Worker (Serwist)
│   └── not-found.tsx             # 404 页面
│
├── components/                   # React Components (48 files)
│   ├── ui/                       # shadcn/ui + 自定义基础组件
│   │   ├── drawer.tsx            # 通用抽屉 (手势关闭)
│   │   ├── image-viewer.tsx      # 全屏图片 (双指缩放)
│   │   ├── segmented-control.tsx # iOS 风格分段选择器
│   │   ├── toast.tsx             # Toast 通知
│   │   ├── button.tsx, card.tsx, skeleton.tsx
│   │   └── ...
│   ├── app-tabbar.tsx            # 底部导航栏
│   ├── crag-card.tsx             # 岩场卡片
│   ├── weather-*.tsx             # 天气组件系列 (strip/badge/card)
│   ├── filter-*.tsx              # 筛选组件系列
│   ├── search-*.tsx              # 搜索组件系列
│   ├── offline-*.tsx             # 离线组件系列
│   ├── beta-*.tsx                # Beta 视频组件
│   ├── locale-switcher.tsx       # 语言切换器
│   └── ...
│
├── hooks/                        # 自定义 Hooks (12 files)
│   ├── use-route-search.ts       # 线路搜索 (拼音支持)
│   ├── use-city-selection.ts     # 城市选择
│   ├── use-delayed-loading.ts    # 延迟加载
│   ├── use-offline-mode.ts       # 离线模式检测
│   ├── use-offline-download.ts   # 离线下载管理
│   ├── use-climber-body-data.ts  # 攀岩者身体数据缓存 ✨NEW
│   └── ...
│
├── i18n/                         # 国际化配置 (next-intl)
│   ├── routing.ts                # 路由配置 (zh/en/fr)
│   ├── request.ts                # 服务端请求配置
│   └── navigation.ts             # 导航工具
│
├── lib/                          # 工具库 (37 files)
│   ├── db/index.ts               # MongoDB CRUD 操作
│   ├── mongodb.ts                # 数据库连接
│   ├── grade-utils.ts            # 难度等级工具
│   ├── weather-utils.ts          # 天气适宜度评估
│   ├── offline-storage.ts        # IndexedDB 离线存储
│   ├── topo-utils.ts             # Topo 编辑工具 ✨NEW
│   ├── constants.ts              # 图片 URL 常量 ✨NEW
│   ├── pinyin-utils.ts           # 拼音工具 (搜索)
│   ├── logger.ts                 # 服务端日志
│   ├── client-logger.ts          # 客户端日志
│   ├── themes/                   # 主题系统 (Dracula)
│   └── ...
│
├── types/index.ts                # TypeScript 类型定义
├── middleware.ts                 # 语言检测中间件
└── test/                         # 测试工具
    ├── setup.tsx
    └── utils.tsx

messages/                         # 翻译文件
├── zh.json, en.json, fr.json

scripts/                          # 数据库脚本
├── seed.ts, migrate-*.ts, backup-*.ts
```

---

## 🚀 Entry Points

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `src/app/[locale]/page.tsx` | 岩场列表、过滤、搜索 |
| 岩场详情 | `src/app/[locale]/crag/[id]/page.tsx` | 地图、线路列表 |
| 线路列表 | `src/app/[locale]/route/page.tsx` | 全部线路 |
| 线路详情 | `src/app/[locale]/route/[id]/page.tsx` | Beta、Topo |
| 设置 | `src/app/[locale]/profile/page.tsx` | 用户设置 |
| 离线 | `src/app/[locale]/offline/page.tsx` | 已下载岩场 |
| Demo | `src/app/[locale]/demo/page.tsx` | 演示功能 ✨NEW |
| Topo 编辑器 | `src/app/[locale]/demo/editor/page.tsx` | 线路标注 ✨NEW |

---

## 🌐 API Routes

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| `GET/POST` | `/api/beta` | Beta 视频 CRUD | POST 60/h |
| `GET` | `/api/weather` | 天气数据 | - |
| `GET` | `/api/geo` | IP 定位 | - |
| `POST` | `/api/visit` | 访问统计 | - |
| `POST` | `/api/feedback` | 用户反馈 | 60/h |
| `POST` | `/api/log` | 日志上报 | 100/h |
| `GET` | `/api/crags` | 岩场列表 ✨NEW | - |
| `GET` | `/api/crags/[id]/routes` | 岩场线路 ✨NEW | - |
| `GET/PATCH` | `/api/routes/[id]` | 线路 CRUD ✨NEW | - |
| `POST` | `/api/upload` | 图片上传 ✨NEW | 10/h |

---

## 📦 Core Modules

### Database (`src/lib/db/index.ts`)
- `getAllCrags()`, `getCragById(id)`
- `getAllRoutes()`, `getRouteById(id)`, `getRoutesByCragId(cragId)`
- `updateRoute(id, updates)` - 支持 topoLine ✨NEW
- `createFeedback()`, `recordVisit()`, `getVisitStats()`

### Themes (`src/lib/themes/`)
- Light/Dark Dracula 主题
- CSS 变量 + next-themes 类切换

### i18n (`src/i18n/`)
- 支持语言: zh (中文), en (English), fr (Français)
- next-intl 实现

### Offline (`src/lib/offline-storage.ts`)
- IndexedDB 存储
- `downloadCrag()`, `getCachedCrags()`, `clearCache()`

### Topo Utils (`src/lib/topo-utils.ts`) ✨NEW
- `bezierCurve()` - 贝塞尔曲线生成
- `scalePoints()`, `normalizePoint()` - 坐标处理

---

## 🪝 Custom Hooks

| Hook | 功能 |
|------|------|
| `useRouteSearch` | 线路搜索 (拼音支持) |
| `useCitySelection` | 城市选择 (localStorage + IP) |
| `useDelayedLoading` | 延迟加载 (防闪烁) |
| `useOfflineMode` | 离线模式检测 |
| `useOfflineDownload` | 离线下载管理 |
| `useClimberBodyData` | 身体数据缓存 ✨NEW |

---

## 🎨 Key Components

### UI Base
- `Drawer` - 手势关闭、ESC 支持
- `ImageViewer` - 双指缩放 (react-zoom-pan-pinch)
- `SegmentedControl` - iOS 风格分段
- `Toast` - 通知组件

### Business
- `CragCard` - 岩场卡片 (天气、图片)
- `WeatherStrip/Badge/Card` - 天气组件系列
- `FilterDrawer/Chip` - 筛选组件
- `SearchOverlay/Drawer` - 搜索组件
- `RouteDetailDrawer` - 线路详情
- `BetaListDrawer/SubmitDrawer` - Beta 视频
- `DownloadButton` - 离线下载
- `OfflineCacheManager` - 缓存管理

---

## 🧪 Testing

- **测试框架**: Vitest + Playwright
- **测试文件**: 41 个 (598 tests)
- **覆盖率**: ~34%
- **CI**: GitHub Actions (lint, tsc, test)

### 命令
```bash
npm run test          # Vitest watch
npm run test:run      # 单次运行
npm run test:coverage # 覆盖率报告
npm run test:ct       # Playwright 组件测试
```

---

## 🔧 Tech Stack

| 类别 | 技术 | 版本 |
|------|------|------|
| Framework | Next.js (App Router) | 16.1.2 |
| Runtime | React | 19.2.3 |
| Database | MongoDB | 7.0.0 |
| i18n | next-intl | 4.7.0 |
| Styling | Tailwind CSS | 4.x |
| PWA | Serwist | 9.5.0 |
| Testing | Vitest + Playwright | 4.0.17 / 1.57.0 |

---

## 📝 Commands

```bash
# 开发
npm run dev              # Turbopack 开发服务器
npm run build            # 生产构建
npm run lint             # ESLint

# 测试
npm run test:run         # 单次运行
npm run test:coverage    # 覆盖率

# 数据库
npm run db:seed          # 数据迁移 (开发)
npm run db:seed:prod     # 数据迁移 (生产)
```

---

## 📊 Project Stats

| 指标 | 数值 |
|------|------|
| 源文件 | 146 个 |
| 测试文件 | 41 个 |
| 组件 | 48 个 |
| API 路由 | 11 个 |
| 页面 | 9 个 |
| Hooks | 12 个 |
| 支持语言 | 3 种 |
| 测试用例 | 598 个 |
| 覆盖率 | ~34% |

---

**Token Efficiency**: ~8KB (vs 146 source files = 94% token reduction)
