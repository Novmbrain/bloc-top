# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

Generated: 2026-01-27
Lines of Code: ~24,000 | Test Files: 41

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
│   │   ├── profile/              # 设置页面
│   │   ├── offline/              # 离线模式页面
│   │   └── demo/editor/          # Topo 编辑器 (隐藏入口)
│   ├── api/                      # API Routes (12 个端点)
│   │   ├── beta/                 # Beta 视频 CRUD
│   │   ├── weather/              # 天气数据 (高德API)
│   │   ├── geo/                  # IP 地理定位
│   │   ├── crags/                # 岩场列表
│   │   │   └── [id]/routes       # 岩场线路列表
│   │   ├── routes/[id]/          # 线路 CRUD + topoLine
│   │   ├── upload/               # R2 图片上传
│   │   └── revalidate/           # ISR 重新验证
│   ├── sw.ts                     # Service Worker (Serwist)
│   └── globals.css               # 全局样式 + CSS 变量
│
├── components/                   # React Components
│   ├── ui/                       # 基础 UI 组件
│   │   ├── drawer.tsx            # 通用抽屉 (手势关闭)
│   │   ├── image-viewer.tsx      # 全屏图片 (双指缩放 + 叠加层)
│   │   ├── toast.tsx             # Toast 通知
│   │   └── ...
│   ├── app-tabbar.tsx            # 底部导航栏 (含隐藏入口)
│   ├── topo-line-overlay.tsx     # Topo 线路 SVG 叠加层 ✨
│   ├── route-detail-drawer.tsx   # 线路详情抽屉 (Topo 动画)
│   ├── weather-*.tsx             # 天气组件系列
│   ├── filter-*.tsx              # 筛选组件系列
│   ├── offline-*.tsx             # 离线组件系列
│   └── ...
│
├── hooks/                        # 自定义 Hooks
│   ├── use-route-search.ts       # 线路搜索 (拼音支持)
│   ├── use-city-selection.ts     # 城市选择
│   ├── use-offline-*.ts          # 离线功能
│   └── ...
│
├── lib/                          # 工具库
│   ├── db/index.ts               # MongoDB CRUD 操作
│   ├── mongodb.ts                # 数据库连接
│   ├── topo-utils.ts             # 贝塞尔曲线、坐标转换
│   ├── topo-constants.ts         # Topo 样式/动画配置 ✨
│   ├── constants.ts              # 图片 URL 常量
│   ├── tokens.ts                 # 设计令牌 (难度颜色)
│   ├── themes/                   # 主题系统 (Dracula)
│   └── ...
│
├── types/index.ts                # TypeScript 类型
└── i18n/                         # 国际化配置
```

---

## 🚀 Entry Points

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `src/app/[locale]/page.tsx` | 岩场列表、过滤、搜索 |
| 岩场详情 | `src/app/[locale]/crag/[id]/page.tsx` | 地图、线路列表 |
| 线路列表 | `src/app/[locale]/route/page.tsx` | 全部线路搜索 |
| 设置 | `src/app/[locale]/profile/page.tsx` | 用户设置 |
| 离线 | `src/app/[locale]/offline/page.tsx` | 已下载岩场 |
| **Topo 编辑器** | `src/app/[locale]/demo/editor/page.tsx` | 线路标注 (隐藏入口) |

### 🔐 隐藏入口
**Topo 编辑器**：在任意页面 **2秒内连续点击 Tabbar "线路"按钮 6 次** 即可进入

---

## 🌐 API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/crags` | 岩场列表 |
| `GET` | `/api/crags/[id]/routes` | 岩场线路列表 |
| `GET/PATCH` | `/api/routes/[id]` | 线路详情 + topoLine |
| `GET/POST` | `/api/beta` | Beta 视频 CRUD |
| `POST` | `/api/upload` | R2 图片上传 |
| `GET` | `/api/weather` | 天气 + 攀岩适宜度 |
| `GET` | `/api/geo` | IP 定位 |
| `POST` | `/api/revalidate` | ISR 重新验证 |

---

## 📦 Core Modules

### Topo 线路系统 ✨
| 文件 | 功能 |
|------|------|
| `components/topo-line-overlay.tsx` | SVG 线路叠加层 (贝塞尔曲线、画线动画、起点点击重播) |
| `lib/topo-utils.ts` | `bezierCurve()`, `scalePoints()`, `normalizePoint()` |
| `lib/topo-constants.ts` | 尺寸、线条样式、控制点、动画配置 |

### Database (`src/lib/db/index.ts`)
- `getAllCrags()`, `getCragById(id)`
- `getRouteById(id)`, `getRoutesByCragId(cragId)`
- `updateRoute(id, updates)` - 支持 topoLine 更新

### Offline Storage (`src/lib/offline-storage.ts`)
- IndexedDB 存储
- `downloadCrag()`, `getCachedCrags()`, `clearCache()`

---

## 🎨 Key Components

### UI Base
| 组件 | 功能 |
|------|------|
| `Drawer` | 通用抽屉 (手势下滑关闭、ESC 关闭) |
| `ImageViewer` | 全屏图片查看器 (双指缩放、支持 children 叠加层) |
| `Toast` | 通知组件 |

### Business
| 组件 | 功能 |
|------|------|
| `TopoLineOverlay` | Topo 线路 SVG (动画、ref 暴露 replay 方法) |
| `RouteDetailDrawer` | 线路详情 (Topo 动画、点击放大) |
| `AppTabbar` | 底部导航 (含隐藏编辑器入口) |
| `CragCard` | 岩场卡片 |
| `WeatherStrip/Badge/Card` | 天气组件系列 |
| `FilterDrawer/Chip` | 筛选组件 |
| `BetaListDrawer/SubmitDrawer` | Beta 视频 |

---

## 🪝 Custom Hooks

| Hook | 功能 |
|------|------|
| `useRouteSearch` | 线路搜索 (拼音支持) |
| `useCitySelection` | 城市选择 (localStorage + IP) |
| `useOfflineMode` | 离线模式检测 |
| `useOfflineDownload` | 离线下载管理 |
| `useClimberBodyData` | 身体数据缓存 |

---

## 🧪 Testing

- **框架**: Vitest + Playwright CT
- **测试文件**: 41 个
- **覆盖率**: ~34%

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
| Database | MongoDB Atlas | 7.0.0 |
| i18n | next-intl | 4.7.0 |
| Styling | Tailwind CSS | 4.x |
| PWA | Serwist | 9.5.0 |
| Map | 高德地图 | 1.4.15 |
| Image Zoom | react-zoom-pan-pinch | 3.7.0 |
| Testing | Vitest + Playwright | latest |

---

## 📝 Quick Start

```bash
nvm use                    # Node 20.9+
npm install
cp .env.example .env.local # 配置 MONGODB_URI + NEXT_PUBLIC_AMAP_KEY
npm run dev                # http://localhost:3000
npm run test               # 运行测试
```

---

## 🔑 Key Dependencies

| Package | 用途 |
|---------|------|
| mongodb | 数据库驱动 |
| @serwist/next | PWA Service Worker |
| next-intl | 国际化 |
| react-zoom-pan-pinch | 图片缩放 |
| @amap/amap-jsapi-loader | 高德地图 |
| pinyin-pro | 拼音搜索 |
| lucide-react | 图标 |
| @aws-sdk/client-s3 | R2 图片上传 |

---

## 📊 Project Stats

| 指标 | 数值 |
|------|------|
| 源代码行数 | ~24,000 |
| 测试文件 | 41 个 |
| 组件 | ~50 个 |
| API 路由 | 12 个 |
| 支持语言 | 3 种 (zh/en/fr) |
| 覆盖率 | ~34% |

---

**Token Efficiency**: ~4KB index vs ~60KB full codebase (94% reduction)
