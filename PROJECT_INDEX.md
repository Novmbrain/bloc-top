# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

Generated: 2026-01-22

---

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── [locale]/             # 国际化路由 (zh/en)
│   │   ├── page.tsx          # 首页 - 岩场列表
│   │   ├── layout.tsx        # 国际化布局
│   │   ├── crag/[id]/        # 岩场详情页
│   │   ├── route/            # 线路列表页
│   │   ├── route/[id]/       # 线路详情页
│   │   └── profile/          # 设置页
│   ├── api/                  # API Routes (6 个端点)
│   │   ├── beta/             # Beta 视频 CRUD
│   │   ├── weather/          # 天气数据 (高德API)
│   │   ├── geo/              # IP 地理定位
│   │   ├── visit/            # 访问统计
│   │   ├── feedback/         # 用户反馈
│   │   └── log/              # 客户端日志上报
│   ├── layout.tsx            # 根布局 (字体)
│   ├── sw.ts                 # Service Worker (Serwist)
│   └── not-found.tsx         # 404 页面
├── components/               # React 组件 (31个)
│   ├── ui/                   # shadcn/ui + 自定义基础组件
│   │   └── segmented-control.tsx # iOS风格分段控制器 ✨NEW
│   ├── app-tabbar.tsx        # 底部导航栏
│   ├── crag-card.tsx         # 岩场卡片
│   ├── locale-switcher.tsx   # 语言切换器 ✨NEW
│   ├── weather-*.tsx         # 天气组件系列
│   └── ...
├── hooks/                    # 自定义 Hooks (4个)
│   ├── use-city-selection.ts # 城市选择 (localStorage)
│   ├── use-route-search.ts   # 线路搜索 (拼音支持)
│   └── use-delayed-loading.ts# 延迟加载 (防骨架屏闪烁)
├── i18n/                     # 国际化配置 (next-intl) ✨NEW
│   ├── routing.ts            # 路由配置
│   ├── request.ts            # 服务端配置
│   └── navigation.ts         # 导航工具
├── lib/                      # 工具库
│   ├── db/index.ts           # 数据访问层
│   ├── mongodb.ts            # MongoDB 连接
│   ├── grade-utils.ts        # 难度等级工具
│   ├── weather-utils.ts      # 天气适宜度评估
│   ├── city-config.ts        # 城市配置
│   ├── cache-config.ts       # 缓存 TTL 配置
│   ├── rate-limit.ts         # API 限流
│   ├── logger.ts             # 服务端日志
│   └── themes/               # 主题系统 (Dracula)
├── types/index.ts            # TypeScript 类型
├── middleware.ts             # 语言检测中间件 ✨NEW
└── test/                     # 测试工具

messages/                     # 翻译文件 ✨NEW
├── zh.json                   # 中文
└── en.json                   # English

scripts/                      # 数据库脚本 (7个)
doc/                          # 项目文档
public/                       # 静态资源 (PWA icons, manifest)
```

---

## 🚀 Entry Points

| 入口 | 路径 | 说明 |
|------|------|------|
| 开发服务器 | `npm run dev` | Turbopack 开发模式 |
| 生产构建 | `npm run build` | Webpack 构建 |
| 数据库迁移 | `npm run db:seed` | 开发环境数据迁移 |
| 单元测试 | `npm run test:run` | Vitest 运行 (304+ tests) |
| 组件测试 | `npm run test:ct` | Playwright 浏览器测试 |

---

## 📦 Core Modules

### Database Layer
- **Path**: `src/lib/db/index.ts`
- **Exports**: `getAllCrags`, `getCragById`, `getAllRoutes`, `getRouteById`, `getRoutesByCragId`
- **Purpose**: MongoDB CRUD 操作 + 日志记录

### Theme System
- **Path**: `src/lib/themes/`
- **Exports**: `themes`, `getTheme`, `ThemeId`
- **Purpose**: 双主题系统 (light/dark Dracula)

### i18n System ✨NEW
- **Path**: `src/i18n/`
- **Exports**: `routing`, `Link`, `useRouter`, `usePathname`
- **Purpose**: next-intl 国际化 (zh/en)

### SegmentedControl ✨NEW
- **Path**: `src/components/ui/segmented-control.tsx`
- **Exports**: `SegmentedControl`, `SegmentOption`
- **Purpose**: iOS风格分段选择器，滑动动画，支持图标

### Weather Utils
- **Path**: `src/lib/weather-utils.ts`
- **Exports**: `getClimbingSuitability`, `WEATHER_ICONS`
- **Purpose**: 天气数据处理 + 攀岩适宜度评估

### City Config
- **Path**: `src/lib/city-config.ts`
- **Exports**: `CITIES`, `CityId`, `CityConfig`
- **Purpose**: 多城市配置 (罗源, 厦门)

---

## 🎨 Key Components

| 组件 | 路径 | 用途 |
|------|------|------|
| `Drawer` | `components/ui/drawer.tsx` | 通用抽屉 (手势关闭) |
| `SegmentedControl` | `components/ui/segmented-control.tsx` | iOS风格分段选择器 ✨NEW |
| `ImageViewer` | `components/ui/image-viewer.tsx` | 全屏图片 (双指缩放) |
| `AMapContainer` | `components/amap-container.tsx` | 高德地图容器 |
| `CragCard` | `components/crag-card.tsx` | 岩场列表卡片 |
| `AppTabbar` | `components/app-tabbar.tsx` | 底部导航栏 (i18n) |
| `LocaleSwitcher` | `components/locale-switcher.tsx` | 语言切换器 (3种变体) |
| `LocaleSegmented` | `components/locale-switcher.tsx` | 分段式语言切换 ✨NEW |
| `ThemeSwitcher` | `components/theme-switcher.tsx` | 分段式主题切换 (重构) |

---

## 🌍 Internationalization ✨NEW

| 配置 | 路径 | 说明 |
|------|------|------|
| 路由 | `src/i18n/routing.ts` | 支持语言: zh, en |
| 请求 | `src/i18n/request.ts` | 消息加载 |
| 导航 | `src/i18n/navigation.ts` | Link, useRouter |
| 中间件 | `src/middleware.ts` | 语言检测 |

### URL 结构
- `/zh/` - 中文 (默认)
- `/en/` - English

### 翻译命名空间
```
Common, Navigation, HomePage, CragCard, CragDetail,
RouteList, RouteDetail, Weather, Search, CitySelector,
EmptyCity, InstallPrompt, UpdatePrompt, LocaleSwitcher,
Grade, Beta, Profile, Metadata
```

---

## 🌐 API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/beta?routeId=N` | 获取线路 Beta 视频列表 |
| `POST` | `/api/beta` | 提交 Beta 视频 (Rate Limited) |
| `GET` | `/api/weather?lng=X&lat=Y` | 获取天气数据 (1h 缓存) |
| `GET` | `/api/geo` | IP 定位推断城市 |
| `GET` | `/api/visit` | 访问统计 |
| `POST` | `/api/log` | 客户端错误上报 |
| `POST` | `/api/feedback` | 用户反馈提交 |

---

## 🧪 Test Coverage

- **单元测试**: 20 个文件 (`*.test.ts/tsx`)
- **组件测试**: 1 个文件 (`*.ct.tsx`)
- **总测试数**: 304+
- **覆盖率**: ~34%
- **测试框架**: Vitest + Testing Library + Playwright

### 已测试模块
```
lib/: grade-utils, tokens, filter-constants, beta-constants,
      rate-limit, crag-theme, themes, utils, pinyin-utils,
      weather-utils, city-config
hooks/: use-route-search, use-city-selection, use-delayed-loading
components/: filter-chip, grade-range-selector, drawer,
             crag-card, search-overlay, theme-switcher
```

---

## 🔗 Key Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `next` | 16.1.2 | React 框架 (App Router) |
| `next-intl` | 4.7.0 | 国际化 ✨NEW |
| `react` | 19.2.3 | UI 库 |
| `mongodb` | 7.0.0 | 数据库驱动 |
| `@serwist/next` | 9.5.0 | PWA Service Worker |
| `next-themes` | 0.4.6 | 主题切换 |
| `@amap/amap-jsapi-loader` | 1.0.1 | 高德地图 |
| `lucide-react` | 0.562.0 | 图标库 |
| `pinyin-pro` | 3.28.0 | 拼音搜索 |
| `tailwindcss` | 4.x | CSS 框架 |

---

## 🎯 Core Data Types

```typescript
interface Crag {
  id: string           // 'yuan-tong-si'
  name: string         // 岩场名称
  cityId: string       // 所属城市
  coordinates?: Coordinates
  approachPaths?: ApproachPath[]
}

interface Route {
  id: number
  name: string
  grade: string        // V0-V13 或 "？"
  cragId: string
  betaLinks?: BetaLink[]
}

interface WeatherData {
  live: WeatherLive
  forecasts?: WeatherForecast[]
  climbing: ClimbingCondition  // 攀岩适宜度
}
```

---

## 📝 Quick Start

```bash
# 1. Node 版本
nvm use  # >= 20.9.0

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 填入 MONGODB_URI 和 NEXT_PUBLIC_AMAP_KEY

# 4. 启动开发服务器
npm run dev

# 5. 运行测试
npm run test:run
npm run lint
```

---

## 🔄 Git Workflow

```
Issue → Feature Branch → PR → CI → Merge
```

- **分支命名**: `feature/issue-{N}-{desc}`
- **PR 关键词**: `Closes #{N}` 自动关闭 Issue
- **CI 检查**: ESLint, TypeScript, Vitest, Playwright

---

## 📚 Documentation

| 文件 | 内容 |
|------|------|
| `CLAUDE.md` | AI 开发指南 (代码规范) |
| `doc/PROJECT_OVERVIEW.md` | 项目架构详解 |
| `doc/i18n-implementation-plan.md` | 国际化方案 ✨NEW |
| `README.md` | 快速开始 |

---

**Token Efficiency**: ~3KB (vs 58KB full read = 94% reduction)
