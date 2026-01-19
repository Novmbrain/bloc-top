# Project Index: 罗源野抱 TOPO

> 福州罗源攀岩线路分享 PWA 应用（野外抱石攀岩指南）

Generated: 2026-01-18

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (Pages)
│   ├── page.tsx           # 首页 - 岩场列表
│   ├── layout.tsx         # 根布局
│   ├── loading.tsx        # 全局加载骨架屏
│   ├── sw.ts              # Service Worker (Serwist)
│   ├── api/
│   │   ├── beta/          # Beta 视频 API
│   │   └── weather/       # 天气 API (高德地图)
│   ├── crag/[id]/         # 岩场详情页
│   ├── route/             # 线路列表页 (含专用 loading.tsx)
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
│   ├── weather-constants.ts # 天气配置 (缓存TTL, 默认坐标)
│   ├── weather-utils.ts   # 天气工具 (攀岩适宜度评估)
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
| API | `/api/weather` | 天气查询 (高德地图) |
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
| 天气常量 | `lib/weather-constants.ts` | 天气图标/阈值/坐标 |
| 天气评估 | `lib/weather-utils.ts` | 攀岩适宜度评估算法 |

### UI 组件
| 组件 | 路径 | 用途 |
|------|------|------|
| Drawer | `components/ui/drawer.tsx` | 通用抽屉 (手势关闭) |
| ImageViewer | `components/ui/image-viewer.tsx` | 全屏图片 (双指缩放) |
| FilterChip | `components/filter-chip.tsx` | 筛选芯片 |
| GradeRangeSelector | `components/grade-range-selector.tsx` | 难度色谱条 (点击+拖动) |
| AppTabbar | `components/app-tabbar.tsx` | 底部导航 |
| WeatherStrip | `components/weather-strip.tsx` | 首页天气条 |
| WeatherBadge | `components/weather-badge.tsx` | 岩场卡片天气角标 |
| WeatherCard | `components/weather-card.tsx` | 详情页天气卡片 |
| AMapContainer | `components/amap-container.tsx` | 高德地图容器 |

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

## 🌤️ Weather System

### API 调用流程
```
岩场 GPS 坐标 (lng, lat)
        ↓
高德逆地理编码 API → 获取 adcode (城市编码)
        ↓
高德天气 API → 获取天气数据
        ↓
攀岩适宜度评估 → 返回完整天气信息
```

### 攀岩适宜度等级
| 等级 | 颜色 | 条件 |
|------|------|------|
| 🟢 极佳 | 绿色 | 12-25°C, 湿度 30-60%, 晴/多云, 风力 ≤3级 |
| 🔵 良好 | 蓝色 | 8-28°C, 湿度 25-70%, 可阴天, 风力 ≤4级 |
| 🟡 一般 | 黄色 | 5-32°C, 湿度 20-80%, 微风 |
| 🔴 不宜 | 红色 | 雨雪雷电, <5°C 或 >32°C, 湿度 >85% |

### 环境变量
| 变量 | 用途 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_AMAP_KEY` | 高德地图 API Key | 同时用于地图展示和天气查询 |

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
| @amap/amap-jsapi-loader | 1.0.1 | 高德地图 JS API |

---

## 📊 Codebase Stats

| 指标 | 值 |
|------|-----|
| TypeScript 文件 | 64 |
| 测试文件 | 13 |
| 代码行数 | ~9,900 |
| 组件数量 | 27 |
| API 端点 | 2 |

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
| 2026-01-18 | 天气功能 - 首页天气条 + 岩场卡片角标 + 详情页天气卡 |
| 2026-01-18 | 高德地图集成 - 岩场位置地图展示 |
| 2026-01-18 | 攀岩适宜度评估 - 基于温湿度/天气/风力 |
| 2026-01-18 | CSP 配置优化 - 支持高德地图瓦片域名 |
| 2026-01-18 | 难度选择器复合多选 (点击切换 + 拖动范围) |
| 2026-01-18 | 线路列表颜色统一 (饱和色背景) |
| 2026-01-18 | 难度选择器乐观更新 (防止闪回) |
| 2026-01-18 | 统一骨架屏样式 + 专用 loading 页面 |
| 2026-01-18 | 线路列表排序功能 (难度升序/降序) |
| 2026-01-17 | PWA 图标 + 品牌更名为"寻岩记" |

---

## 📚 Documentation

| 文档 | 说明 |
|------|------|
| `CLAUDE.md` | AI 助手指南 (简洁) |
| `doc/PROJECT_OVERVIEW.md` | 详细技术文档 |
| `PROJECT_INDEX.md` | 本索引文件 |
