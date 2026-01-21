# Project Index: 罗源野抱 TOPO (escalade-pwa)

Generated: 2026-01-21

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API Routes (5 个端点)
│   │   ├── beta/          # Beta 视频 CRUD
│   │   ├── feedback/      # 用户反馈
│   │   ├── geo/           # IP 地理定位
│   │   ├── log/           # 客户端错误上报
│   │   └── weather/       # 天气数据 (高德 API)
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/[id]/        # 线路详情页
│   ├── profile/           # 用户设置页
│   ├── sw.ts              # Service Worker (Serwist)
│   └── layout.tsx         # 根布局
├── components/            # React 组件 (27 个)
│   ├── ui/                # shadcn/ui 基础组件
│   └── ...                # 业务组件
├── hooks/                 # 自定义 Hooks (3 个)
├── lib/                   # 工具函数和配置
│   ├── db/                # MongoDB 数据访问层
│   └── themes/            # 主题系统
├── types/                 # TypeScript 类型定义
└── test/                  # 测试工具

scripts/                   # 数据库迁移和维护脚本 (6 个)
doc/                       # 项目文档
public/                    # 静态资源 (PWA icons, manifest)
```

## 🚀 Entry Points

| 入口 | 路径 | 说明 |
|------|------|------|
| 首页 | `src/app/page.tsx` | 岩场列表 (ISR) |
| 线路列表 | `src/app/route/page.tsx` | 全部线路筛选页 |
| 岩场详情 | `src/app/crag/[id]/page.tsx` | 岩场信息 + 地图 |
| 线路详情 | `src/app/route/[id]/page.tsx` | 线路 TOPO + Beta |
| Service Worker | `src/app/sw.ts` | PWA 离线缓存 |

## 📦 Core Modules

### Database Layer
- **Path**: `src/lib/db/index.ts`
- **Exports**: `getAllCrags`, `getCragById`, `getAllRoutes`, `getRouteById`, `getRoutesByCragId`
- **Purpose**: MongoDB CRUD 操作 + 日志记录

### Theme System
- **Path**: `src/lib/themes/`
- **Exports**: `themes`, `getTheme`, `ThemeId`
- **Purpose**: 双主题系统 (light/dark)

### Logger
- **Path**: `src/lib/logger.ts`, `src/lib/client-logger.ts`
- **Exports**: `logger`, `clientLogger`
- **Purpose**: 统一日志系统 (服务端 + 客户端上报)

### Weather Utils
- **Path**: `src/lib/weather-utils.ts`, `src/lib/weather-constants.ts`
- **Exports**: `getClimbingSuitability`, `WEATHER_ICONS`
- **Purpose**: 天气数据处理 + 攀岩适宜度评估

### Cache Config
- **Path**: `src/lib/cache-config.ts`
- **Exports**: `ISR_REVALIDATE`, `SW_CACHE`, `API_CACHE`, `HTTP_CACHE`
- **Purpose**: 统一缓存 TTL 配置

### City Config
- **Path**: `src/lib/city-config.ts`
- **Exports**: `CITIES`, `CityId`, `CityConfig`
- **Purpose**: 多城市配置 (罗源, 厦门)

## 🎨 Key Components

| 组件 | 路径 | 用途 |
|------|------|------|
| `Drawer` | `components/ui/drawer.tsx` | 通用抽屉 (手势关闭) |
| `ImageViewer` | `components/ui/image-viewer.tsx` | 全屏图片 (双指缩放) |
| `AMapContainer` | `components/amap-container.tsx` | 高德地图容器 |
| `WeatherCard` | `components/weather-card.tsx` | 天气卡片 (预报) |
| `CragCard` | `components/crag-card.tsx` | 岩场列表卡片 |
| `FilterDrawer` | `components/filter-drawer.tsx` | 筛选面板 |
| `SearchOverlay` | `components/search-overlay.tsx` | 搜索覆盖层 |
| `AppTabbar` | `components/app-tabbar.tsx` | 底部导航栏 |

## 🔧 Configuration Files

| 文件 | 用途 |
|------|------|
| `next.config.ts` | Next.js 配置 (Serwist PWA) |
| `tailwind.config.ts` | Tailwind CSS v4 配置 |
| `vitest.config.ts` | Vitest 单元测试配置 |
| `playwright-ct.config.ts` | Playwright 组件测试配置 |
| `components.json` | shadcn/ui 配置 |
| `.env.local` | 环境变量 (MongoDB, 高德 API) |

## 📚 Documentation

| 文件 | 内容 |
|------|------|
| `CLAUDE.md` | AI 开发指南 (代码规范) |
| `doc/PROJECT_OVERVIEW.md` | 项目架构详解 |
| `README.md` | 快速开始 |

## 🧪 Test Coverage

- **单元测试**: 19 个文件 (`*.test.ts/tsx`)
- **组件测试**: 1 个文件 (`*.ct.tsx`)
- **覆盖率**: ~34%
- **测试框架**: Vitest + Testing Library + Playwright

### 已测试模块
```
lib/: grade-utils, tokens, filter-constants, beta-constants,
      rate-limit, crag-theme, themes, utils, pinyin-utils,
      weather-utils, city-config
hooks/: use-route-search, use-city-selection
components/: filter-chip, grade-range-selector, drawer,
             crag-card, search-overlay, theme-switcher
```

## 🔗 Key Dependencies

| 依赖 | 版本 | 用途 |
|------|------|------|
| `next` | 16.1.2 | React 框架 (App Router) |
| `react` | 19.2.3 | UI 库 |
| `mongodb` | 7.0.0 | 数据库驱动 |
| `@serwist/next` | 9.5.0 | PWA Service Worker |
| `next-themes` | 0.4.6 | 主题切换 |
| `@amap/amap-jsapi-loader` | 1.0.1 | 高德地图 |
| `lucide-react` | 0.562.0 | 图标库 |
| `pinyin-pro` | 3.28.0 | 拼音搜索 |
| `tailwindcss` | 4.x | CSS 框架 |

## 📝 Quick Start

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 填入 MONGODB_URI 和 NEXT_PUBLIC_AMAP_KEY

# 3. 启动开发服务器
npm run dev

# 4. 运行测试
npm run test        # 单元测试
npm run test:ct     # 组件测试

# 5. 构建生产版本
npm run build
```

## 🌐 API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/beta?routeId=N` | 获取线路 Beta 视频列表 |
| `POST` | `/api/beta` | 提交 Beta 视频 (Rate Limited) |
| `GET` | `/api/weather?lng=X&lat=Y` | 获取天气数据 (1h 缓存) |
| `GET` | `/api/geo` | IP 定位推断城市 |
| `POST` | `/api/log` | 客户端错误上报 |
| `POST` | `/api/feedback` | 用户反馈提交 |

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

interface BetaLink {
  platform: 'xiaohongshu'
  noteId: string
  url: string
}
```

## 🔄 Git Workflow

```
Issue → Feature Branch → PR → CI → Merge
```

- **分支命名**: `feature/issue-{N}-{desc}`
- **PR 关键词**: `Closes #{N}` 自动关闭 Issue
- **CI 检查**: ESLint, TypeScript, Vitest, Playwright

---

**Token Efficiency**: ~3KB (vs 58KB full read = 94% reduction)
