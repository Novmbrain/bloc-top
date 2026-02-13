# 寻岩记 (BlocTop) - 项目索引

> 更新于 2026-02-13 | 攀岩线路分享 PWA 应用（野外抱石指南）

---

## 目录

- [项目概览](#项目概览)
- [目录结构](#目录结构)
- [页面路由](#页面路由)
- [API 路由](#api-路由)
- [组件清单](#组件清单)
- [Hooks 清单](#hooks-清单)
- [工具库清单](#工具库清单)
- [类型系统](#类型系统)
- [主题系统](#主题系统)
- [测试覆盖](#测试覆盖)
- [文档索引](#文档索引)
- [配置文件](#配置文件)

---

## 项目概览

| 项 | 值 |
|---|---|
| 框架 | Next.js 16.1.2 + App Router + ISR |
| 数据库 | MongoDB Atlas (原生驱动) |
| 样式 | Tailwind CSS v4 + shadcn/ui (new-york) |
| 主题 | next-themes (Dracula 配色 + iOS 毛玻璃) |
| 认证 | better-auth (Magic Link + Passkey/WebAuthn + 密码) |
| PWA | Serwist (Service Worker) |
| 测试 | Vitest + Testing Library + Playwright |
| CI/CD | 本地 pre-push hook (Nx) + Vercel |
| 地图 | 高德地图 JS API 1.4.15 |
| 国际化 | next-intl ^4.7.0 (`[locale]` 路由, zh/en/fr) |
| 图片存储 | Cloudflare R2 (`img.bouldering.top`) |

---

## 目录结构

```
src/
├── app/                       # Next.js App Router 页面 & API
│   ├── [locale]/              #   国际化路由
│   │   ├── crag/[id]/         #   岩场详情
│   │   ├── route/             #   线路列表
│   │   ├── login/             #   登录页 (Magic Link + Passkey)
│   │   ├── auth/              #   认证辅助 (verify, passkey-setup, security-setup)
│   │   ├── profile/           #   用户页 (头像/账号/反馈)
│   │   ├── editor/            #   编辑器 (faces, routes, betas, crags, cities)
│   │   ├── offline/           #   离线模式页面
│   │   └── intro/             #   介绍页
│   └── api/                   #   22 个 API 路由
├── components/                # React 组件
│   ├── ui/           (10)     #   shadcn/ui 基础组件
│   └── editor/        (7)     #   编辑器专用组件
├── lib/                       # 工具函数 & 数据库
│   ├── db/                    #   数据访问层
│   ├── face-image-cache/      #   岩面图片缓存层
│   └── themes/                #   主题定义
├── hooks/            (16)     # 自定义 React Hooks
├── types/             (1)     # TypeScript 类型定义
├── i18n/              (3)     # 国际化配置
└── test/              (2)     # 测试设置
scripts/              (13)     # 数据库迁移/备份脚本
playwright/                    # Playwright 组件测试配置
doc/                  (29)     # 项目文档 (含 plans/, data-flow/, design/)
messages/              (3)     # i18n 翻译文件 (zh, en, fr)
```

---

## 页面路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/[locale]` | `HomePage` | 首页 - 岩场列表 (ISR 30天) |
| `/[locale]/crag/[id]` | `CragDetailPage` | 岩场详情 - 线路/天气/地图 (SSG) |
| `/[locale]/route` | `RouteListPage` | 线路列表 - 筛选搜索 |
| `/[locale]/intro` | `IntroPage` | 应用介绍 - 滚动动画 |
| `/[locale]/login` | `LoginPage` | 登录 - Magic Link + Passkey + 密码 |
| `/[locale]/auth/verify` | `VerifyPage` | Magic Link 验证中间页 |
| `/[locale]/auth/passkey-setup` | `PasskeySetupPage` | Passkey 注册引导 |
| `/[locale]/auth/security-setup` | `SecuritySetupPage` | 安全设置引导 |
| `/[locale]/profile` | `ProfilePage` | 用户设置 - 头像/主题/缓存/反馈 |
| `/[locale]/editor` | `TopoEditorPage` | 编辑器入口 (admin) |
| `/[locale]/editor/faces` | `EditorFacesPage` | 岩面管理 - R2 上传 |
| `/[locale]/editor/routes` | `EditorRoutesPage` | 线路标注 - Topo 绘制/删除 |
| `/[locale]/editor/betas` | `EditorBetasPage` | Beta 视频管理 |
| `/[locale]/editor/crags` | `EditorCragsPage` | 岩场管理 |
| `/[locale]/editor/crags/[id]` | `EditorCragDetailPage` | 单岩场编辑 |
| `/[locale]/editor/cities` | `EditorCitiesPage` | 城市/地级市管理 |
| `/[locale]/offline` | `OfflinePage` | 离线首页 - IndexedDB |
| `/[locale]/offline/crag/[id]` | `OfflineCragDetailPage` | 离线岩场详情 |
| `/[locale]/offline/route/[id]` | `OfflineRouteDetailPage` | 离线线路详情 |

**布局文件:**
| 路径 | 说明 |
|------|------|
| `layout.tsx` | 根布局 - 字体/PWA/viewport |
| `[locale]/layout.tsx` | 国际化布局 - Provider 嵌套 |
| `[locale]/editor/layout.tsx` | 编辑器布局 - session+admin 权限守卫 |

---

## API 路由

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/auth/[...all]` | better-auth catch-all (登录/注册/session/passkey) |
| POST | `/api/auth/set-password` | 设置/更新密码 |

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/avatar` | 上传头像 (裁剪后, ≤2MB) |
| DELETE | `/api/user/avatar` | 删除头像 |
| GET | `/api/user/avatar/[userId]` | 获取头像二进制 (HTTP 缓存 24h) |

### 数据 CRUD

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| GET | `/api/crags` | 获取所有岩场 | - |
| GET/PATCH | `/api/crags/[id]` | 获取/更新单个岩场 | - |
| GET | `/api/crags/[id]/routes` | 获取岩场线路 | - |
| PATCH | `/api/crags/[id]/areas` | 更新岩场区域列表 | - |
| GET | `/api/crags/[id]/version` | 岩场数据版本号 (离线过期检测) | - |
| GET/POST | `/api/routes` | 获取/创建线路 | - |
| GET/PATCH/DELETE | `/api/routes/[id]` | 获取/更新/删除线路 | - |
| GET/POST/PATCH/DELETE | `/api/faces` | 管理岩面照片 (R2) | - |
| POST | `/api/upload` | 上传 Topo 图片到 R2 (≤5MB) | - |
| GET/POST | `/api/beta` | Beta 视频链接 | ✅ |
| GET/POST | `/api/cities` | 城市列表/创建 (admin) | - |
| PATCH/DELETE | `/api/cities/[id]` | 更新/删除城市 (admin) | - |
| GET/POST | `/api/prefectures` | 地级市列表/创建 (admin) | - |
| PATCH/DELETE | `/api/prefectures/[id]` | 更新/删除地级市 (admin) | - |

### 辅助

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| GET | `/api/weather?lng=&lat=` | 天气 + 攀岩适宜度 (1h缓存) | - |
| GET | `/api/geo` | IP 定位 → 推断城市 | - |
| POST | `/api/feedback` | 提交反馈 | ✅ 3/min |
| POST | `/api/visit` | 记录访问 | - |
| POST | `/api/log` | 客户端错误上报 | ✅ 20/min |
| POST | `/api/revalidate` | 手动触发 ISR 重验证 | - |

---

## 组件清单

### 基础 UI 组件 (`src/components/ui/`)

| 文件 | 组件 | 关键 Props |
|------|------|-----------|
| button.tsx | `Button` | `variant`, `size`, `asChild` |
| composition-input.tsx | `CompositionInput` | `onChange`, `value` (IME 兼容) |
| composition-input.tsx | `CompositionTextarea` | `onChange`, `value` (IME 兼容) |
| drawer.tsx | `Drawer` | `isOpen`, `onClose`, `height`, `title` |
| image-viewer.tsx | `ImageViewer` | `isOpen`, `onClose`, `src`, `alt`, `topSlot` |
| segmented-control.tsx | `SegmentedControl<T>` | `options`, `value`, `onChange`, `size` |
| skeleton.tsx | `Skeleton` | `className` |
| input.tsx | `Input` | 输入框 (IME 兼容, unstyled variant) |
| textarea.tsx | `Textarea` | 文本域 (IME 兼容) |
| toast.tsx | `useToast()`, `ToastProvider` | — |

### 功能组件 (`src/components/`)

| 文件 | 组件 | 说明 |
|------|------|------|
| app-tabbar.tsx | `AppTabbar` | 底部导航栏 (毛玻璃) |
| amap-container.tsx | `AMapContainer` | 高德地图容器 |
| crag-card.tsx | `CragCard` | 岩场卡片 (玻璃态 + 主题色) |
| crag-card-skeleton.tsx | `CragCardSkeleton` | 岩场骨架屏 |
| route-card-skeleton.tsx | `RouteCardSkeleton` | 线路骨架屏 |
| route-detail-drawer.tsx | `RouteDetailDrawer` | 线路详情抽屉 (多线路切换) |
| filter-chip.tsx | `FilterChip`, `FilterChipGroup` | 筛选芯片 (单选/多选) |
| filter-drawer.tsx | `FilterDrawer` | 筛选面板抽屉 |
| grade-range-selector.tsx | `GradeRangeSelector` | 难度区间选择器 |
| grade-range-selector-vertical.tsx | `GradeRangeSelectorVertical` | 竖向难度选择器 |
| floating-search.tsx | `FloatingSearch` | 浮动搜索按钮 |
| floating-search-input.tsx | `FloatingSearchInput` | 浮动搜索输入 |
| search-overlay.tsx | `SearchOverlay` | 搜索覆盖层 |
| search-drawer.tsx | `SearchDrawer` | 搜索抽屉 |
| beta-list-drawer.tsx | `BetaListDrawer` | Beta 视频列表 |
| beta-submit-drawer.tsx | `BetaSubmitDrawer` | Beta 视频提交表单 |
| topo-line-overlay.tsx | `TopoLineOverlay` | Topo 单线路 SVG 叠加 (动态 viewBox) |
| multi-topo-line-overlay.tsx | `MultiTopoLineOverlay` | Topo 多线路叠加 |
| route-legend-panel.tsx | `RouteLegendPanel` | 同面多线路图例面板 (智能显示) |
| route-filter-bar.tsx | `RouteFilterBar` | 线路筛选栏 |
| weather-badge.tsx | `WeatherBadge` | 天气温度角标 |
| weather-card.tsx | `WeatherCard` | 天气详情卡 |
| weather-strip.tsx | `WeatherStrip` | 首页天气条 |
| city-selector.tsx | `CitySelector` | 城市选择器 (地级市分组) |
| empty-city.tsx | `EmptyCity` | 城市无数据空状态 |
| user-avatar.tsx | `UserAvatar` | 用户头像 (图片 → 首字母 → 图标 fallback) |
| security-drawer.tsx | `SecurityDrawer` | 账号安全设置 (头像裁剪/Passkey/密码/登出) |
| maintenance-banner.tsx | `MaintenanceBanner` | 维护公告横幅 |
| download-button.tsx | `DownloadButton` | 离线下载按钮 |
| offline-cache-manager.tsx | `OfflineCacheSection` | 离线缓存管理 |
| offline-download-provider.tsx | `OfflineDownloadProvider` | 离线下载上下文 |
| offline-indicator.tsx | `OfflineIndicator` | 离线状态横幅 |
| install-prompt.tsx | `InstallPrompt` | PWA 安装提示 |
| sw-update-prompt.tsx | `SWUpdatePrompt` | SW 更新提示 |
| theme-provider.tsx | `ThemeProvider` | 主题上下文 |
| theme-switcher.tsx | `ThemeSwitcher` | 主题切换器 |
| locale-detector.tsx | `LocaleDetector` | 语言检测 |
| locale-switcher.tsx | `LocaleSwitcher`, `LocaleSegmented`, `LocaleSelect` | 语言切换 |
| contextual-hint.tsx | `ContextualHint` | 上下文提示 |
| face-image-provider.tsx | `FaceImageProvider` | 岩面图片缓存 Context Provider |
| face-thumbnail-strip.tsx | `FaceThumbnailStrip` | 岩面缩略图条 (横滑) |

### 编辑器组件 (`src/components/editor/`)

| 文件 | 组件 | 说明 |
|------|------|------|
| crag-selector.tsx | `CragSelector` | 岩场选择 |
| route-card.tsx | `RouteCard` | 编辑器线路卡片 (含删除) |
| progress-ring.tsx | `ProgressRing` | 环形进度 |
| fullscreen-topo-editor.tsx | `FullscreenTopoEditor` | 全屏 Topo 绘制 (动态 viewBox) |
| editor-page-header.tsx | `EditorPageHeader` | 编辑器页面 Header (动态返回) |
| area-select.tsx | `AreaSelect` | 区域选择器 |
| beta-card.tsx | `BetaCard` | Beta 视频卡片 |

---

## Hooks 清单

| 文件 | Hook | 说明 |
|------|------|------|
| use-city-selection.ts | `useCitySelection()` | 城市选择 (localStorage + IP) |
| use-climber-body-data.ts | `useClimberBodyData()` | 攀岩者身高臂展 |
| use-contextual-hint.ts | `useContextualHint()` | 一次性提示控制 |
| use-crag-routes.ts | `useCragRoutes()` | 岩场线路数据 |
| use-delayed-loading.ts | `useDelayedLoading()` | 延迟骨架屏 (防闪烁) |
| use-face-image.ts | `useFaceImageCache()` | 岩面图片缓存 Hook (订阅失效) |
| use-locale-preference.ts | `useLocalePreference()` | 语言偏好 (IP 检测 + 缓存) |
| use-media-query.ts | `useMediaQuery()` | 响应式媒体查询 (SSR 安全) |
| use-offline-download.ts | `useOfflineDownload()` | 离线下载 (IndexedDB + Cache API) |
| use-offline-mode.ts | `useOfflineMode()`, `useOnlineStatus()`, `useShouldShowOfflineHint()` | 网络状态监控 |
| use-passkey-management.ts | `usePasskeyManagement()` | Passkey 列表/添加/删除 |
| use-platform-detect.ts | `usePlatformDetect()` | 平台/浏览器检测 |
| use-route-search.ts | `useRouteSearch()`, `matchRouteByQuery()`, `filterRoutesByQuery()` | 五级优先级线路搜索 (拼音) |
| use-scroll-reveal.ts | `useScrollReveal()` | 滚动触发动画 (IntersectionObserver) |
| use-weather.ts | `useWeather()` | 天气数据获取 |
| use-break-app-shell-limit.ts | `useBreakAppShellLimit()` | 突破 app-shell 宽度限制 |

---

## 工具库清单

### 核心工具 (`src/lib/`)

| 文件 | 主要导出 | 说明 |
|------|---------|------|
| utils.ts | `cn()` | 类名合并 (clsx + tailwind-merge) |
| mongodb.ts | `getDatabase()`, `clientPromise` | MongoDB 连接管理 |
| auth.ts | `getAuth()` | better-auth server config (lazy singleton) |
| auth-client.ts | `useSession`, `signIn`, `signOut`, `getSession` | better-auth React client |
| email-templates.ts | `generateMagicLinkEmail()` | Magic Link 邮件 HTML 模板 |
| passkey-providers.ts | `getPasskeyProvider()` | Passkey 平台适配 |
| logger.ts | `logger`, `createModuleLogger()` | 服务端结构化日志 |
| client-logger.ts | `clientLogger`, `createClientLogger()` | 客户端日志 → `/api/log` |
| cache-config.ts | `ISR_REVALIDATE`, `SW_CACHE`, `API_CACHE` 等 | 统一缓存 TTL |
| rate-limit.ts | `checkRateLimit()` | 内存级 IP 限流 (固定窗口) |
| request-utils.ts | `getClientIp()`, `sanitizePathSegment()` | HTTP 请求工具 |
| constants.ts | `IMAGE_BASE_URL`, `getRouteTopoUrl()` 等 | R2 图片 URL 生成 |
| tokens.ts | `gradeColors`, `getGradeColor()` | V 等级颜色映射 |

### 功能工具

| 文件 | 主要导出 | 说明 |
|------|---------|------|
| grade-utils.ts | `parseGrade()`, `compareGrades()` | V-Scale 难度解析 |
| filter-constants.ts | `V_GRADES`, `GRADE_GROUPS`, `FILTER_PARAMS` | 筛选配置 |
| weather-constants.ts | `WEATHER_ICONS`, `CLIMBING_THRESHOLDS` | 天气图标/阈值 |
| weather-utils.ts | `evaluateClimbingCondition()` | 攀岩适宜度评估 |
| beta-constants.ts | `BETA_PLATFORMS`, `extractXiaohongshuNoteId()` | Beta 平台工具 |
| topo-constants.ts | `TOPO_LINE_CONFIG`, `computeViewBox()` | Topo SVG 常量 + 动态 viewBox |
| topo-utils.ts | `bezierCurve()`, `scalePoints()`, `normalizePoint()` | Topo 绘制工具 |
| route-utils.ts | `getSiblingRoutes()` | 共面线路查找 |
| editor-utils.ts | `preloadImage()`, `GRADE_OPTIONS` | 编辑器工具 |
| city-utils.ts | `findCityById()`, `findCityByAdcode()`, `findNearestCity()` | 城市工具 (纯同步) |
| coordinate-utils.ts | `gcj02ToWgs84()`, `wgs84ToGcj02()` | GCJ-02/WGS-84 坐标转换 |
| crag-theme.ts | `getCragTheme()` | 岩场主题 (图标/accent) |
| offline-storage.ts | `saveCragOffline()`, `getCragOffline()` 等 | IndexedDB 离线存储 |
| api-error-codes.ts | `API_ERROR_CODES`, `createErrorResponse()` | API 错误码 |
| editor-areas.ts | `getAreasForCrag()`, `updateAreasAfterRename()` | 编辑器区域管理 |

### 岩面图片缓存层 (`src/lib/face-image-cache/`)

| 文件 | 主要导出 | 说明 |
|------|---------|------|
| types.ts | `FaceKey`, `CacheEntry` | 缓存类型定义 |
| cache-service.ts | `FaceImageCacheService` | 缓存核心：URL 版本化、订阅失效 |
| index.ts | `faceImageCache` | 单例导出 |

### 数据访问层 (`src/lib/db/`)

| 函数 | 说明 |
|------|------|
| `getAllCrags()` | 获取所有岩场 |
| `getCragById(id)` | 获取单个岩场 |
| `getAllRoutes()` | 获取所有线路 |
| `getRouteById(id)` | 获取单条线路 |
| `getRoutesByCragId(cragId)` | 获取岩场线路 |
| `createRoute(data)` | 创建线路 |
| `updateRoute(id, data)` | 更新线路 |
| `deleteRoute(id)` | 删除线路 (级联清理 Beta) |
| `updateCragAreas(cragId, areas)` | 更新岩场区域列表 |
| `upsertAvatar(userId, data, type)` | 上传/更新头像 (同步 user.image) |
| `getAvatar(userId)` | 获取头像二进制 |
| `deleteAvatar(userId)` | 删除头像 (清除 user.image) |
| `createFeedback(data)` | 创建反馈 |
| `recordVisit(data)` | 记录访问 |
| `getVisitStats()` | 获取访问统计 |

---

## 类型系统

核心类型定义在 `src/types/index.ts`:

| 类型 | 说明 | 关键字段 |
|------|------|---------|
| `Crag` | 岩场 | `id`, `name`, `cityId`, `coordinates`, `approachPaths`, `areas` |
| `Route` | 线路 | `id`, `name`, `grade`, `cragId`, `faceId`, `topoLine`, `betaLinks` |
| `TopoPoint` | Topo 标注点 | `x`, `y` (归一化坐标 0-1) |
| `BetaLink` | Beta 视频 | `platform`, `noteId`, `url`, `climberHeight` |
| `User` | 用户 | `id`, `email`, `role`, `image` (头像 URL) |
| `CityConfig` | 城市配置 | `id`, `name`, `adcode`, `coordinates`, `prefectureId` |
| `PrefectureConfig` | 地级市 | `id`, `name`, `districts[]`, `defaultDistrict` |
| `Coordinates` | 坐标 | `lng`, `lat` |
| `ApproachPath` | 接近路径 | `points`, `color` |
| `WeatherData` | 天气数据 | `WeatherLive`, `WeatherForecast[]`, `ClimbingCondition` |
| `DownloadProgress` | 下载进度 | `status`, `progress` |
| `ClimbingSuitability` | 攀岩适宜度 | `'ideal'` \| `'good'` \| `'fair'` \| `'poor'` |
| `BetaPlatform` | Beta 平台 | `'xiaohongshu'` |

---

## 主题系统

| 模式 | 值 | 配色 |
|------|---|------|
| 日间 | `light` | 紫色主色调，明亮清爽，iOS 毛玻璃 |
| 暗夜 | `dark` | Dracula 配色 (`#282A36` 背景, `#BD93F9` 主色) |
| 自动 | `system` | 跟随系统偏好 (默认) |

**毛玻璃层级**: `glass-light` → `glass` → `glass-md` → `glass-heavy`

主题变量通过 CSS 变量 (`--theme-*`, `--glass-*`) 控制，定义在 `globals.css`。

---

## 测试覆盖

| 层级 | 工具 | 命令 |
|------|------|------|
| 单元测试 | Vitest | `npm run test` |
| 组件测试 | Vitest + Testing Library | `npm run test` |
| 浏览器测试 | Playwright | `npm run test:ct` |
| 覆盖率 | Vitest | `npm run test:coverage` |
| CI (全部) | Nx | `npm run ci` |

**56 个测试文件**，覆盖模块：`grade-utils`, `tokens`, `filter-constants`, `beta-constants`, `rate-limit`, `crag-theme`, `themes/index`, `utils`, `weather-constants`, `weather-utils`, `topo-utils`, `topo-constants`, `constants`, `editor-utils`, `editor-areas`, `city-utils`, `coordinate-utils`, `client-logger`, `offline-storage`, `request-utils`, `api-error-codes`, `route-utils`, `face-image-cache`, `filter-chip`, `grade-range-selector`, `drawer`, `crag-card`, `search-overlay`, `composition-input`, `input`, `textarea`, `segmented-control`, `beta-list-drawer`, `beta-submit-drawer`, `city-selector`, `download-button`, `filter-drawer`, `locale-switcher`, `theme-switcher`, `weather-badge`, `weather-card`, `weather-strip`, `route-detail-drawer`, `route-legend-panel`, `crag-detail-client`, `crags/route`, `offline/page`，以及 hooks: `use-offline-mode`, `use-climber-body-data`, `use-route-search`, `use-weather`, `use-city-selection`, `use-contextual-hint`, `use-delayed-loading`, `use-platform-detect`, `use-media-query`

---

## 文档索引

### 架构文档 (`doc/`)

| 文件 | 说明 |
|------|------|
| PROJECT_OVERVIEW.md | 项目全面技术文档 |
| PROJECT_INDEX.md | 项目索引 (本文件) |
| AUTH_SYSTEM.md | 认证系统架构 (Magic Link + Passkey + 密码) |
| FACE_IMAGE_CACHE_ARCHITECTURE.md | 岩面图片缓存层架构 |
| TECH_MEMO_IME_COMPOSITION_FIX.md | IME 输入法修复技术备忘 |
| DESIGN_UNIFIED_INPUT.md | 统一输入组件设计 |
| TOPO_LINE_RESEARCH.md | Topo 线路绘制研究 |
| TEST_COVERAGE_PLAN.md | 测试覆盖计划 |
| UI_UX_REVIEW.md | UI/UX 审查 |
| i18n-implementation-plan.md | 国际化实现计划 |

### 数据流文档 (`doc/data-flow/`)

| 文件 | 说明 |
|------|------|
| ROUTE_RENDERING.md | 线路渲染数据流 (Bloc → Topo → SVG) |
| CITY_CRAG_ISOLATION.md | 城市→岩场数据隔离与多城市扩展 |
| WEATHER_CACHE_I18N_ANALYSIS.md | 天气缓存与 i18n 分析 |

### 设计文档 (`doc/design/`)

| 文件 | 说明 |
|------|------|
| ROUTE_LEGEND_PANEL.md | 同面多线路图例面板设计规格 |

### 实现计划 (`doc/plans/`)

| 文件 | 说明 |
|------|------|
| 2026-02-13-prefecture-level-browsing-design.md | 地级市级浏览设计 |
| 2026-02-12-auth-magic-link-passkey.md | 认证系统实现 |
| 2026-02-12-auth-magic-link-passkey-PLAN.md | 认证系统方案评审 |
| 2026-02-12-editor-crag-management.md | 编辑器岩场管理 |
| 2026-02-12-coordinate-precision-gcj02.md | GCJ-02 坐标精度 |
| 2026-02-12-multi-city-prefecture-architecture.md | 多城市地级市架构 |
| 2026-02-12-route-legend-panel.md | 线路图例面板 |
| 2026-02-12-weather-i18n-client-translation.md | 天气模块客户端翻译 |
| 2026-02-11-react-best-practices-audit.md | React 最佳实践审计 |
| 2026-02-07-city-backend-improvements.md | 城市后端改进 |
| 2026-02-06-offline-stale-detection.md | 离线过期检测 |
| 2026-02-06-editor-form-ux.md | 编辑器表单 UX |
| 2026-02-06-editor-beta-refactor.md | 编辑器 Beta 重构 |
| 2026-02-06-editor-perf-optimization.md | 编辑器性能优化 |
| 2026-02-06-crag-hero-collapse.md | 岩场 Hero 折叠 |

---

## 配置文件

| 文件 | 说明 |
|------|------|
| `next.config.ts` | Next.js 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `vitest.config.ts` | Vitest 测试配置 |
| `playwright-ct.config.ts` | Playwright 组件测试配置 |
| `eslint.config.mjs` | ESLint 规则 (含 IME input 限制) |
| `postcss.config.mjs` | PostCSS 配置 |
| `components.json` | shadcn/ui 组件配置 |
| `vercel.json` | Vercel 部署配置 |
| `nx.json` | Nx 构建缓存配置 |
| `.nvmrc` | Node 版本锁定 (≥20.9.0) |
| `.env.example` | 环境变量模板 |
| `public/manifest.json` | PWA Manifest |

---

## 脚本清单 (`scripts/`)

| 文件 | 说明 |
|------|------|
| seed.ts | 数据迁移 (开发/生产) |
| seed-beta.ts | Beta 视频数据填充 |
| backup-db.ts | 数据库备份 (源→备份库) |
| backup-to-db.ts | 数据库备份到 DB |
| check-backup.ts | 备份完整性检查 |
| check-routes.ts | 线路数据校验 |
| copy-db-to-prod.ts | 开发→生产数据同步 |
| init-visits.ts | 初始化访问统计 |
| migrate-add-cityid.ts | 添加 cityId 字段迁移 |
| migrate-cityid-index.ts | cityId 索引迁移 |
| migrate-coordinates.ts | 坐标数据迁移 |
| migrate-r2-face-keys.ts | R2 岩面 key 迁移 |
| migrate-r2-face-to-area.ts | R2 岩面按区域迁移 |
