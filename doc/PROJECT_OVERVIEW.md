# 寻岩记 (BlocTop) 项目技术文档

> 攀岩线路分享 PWA 应用技术全景

---

## 一、项目定位

这是一个**攀岩线路分享 PWA 应用**，核心功能：
- 展示福州罗源的攀岩岩场和线路
- 支持离线使用（PWA）
- 移动端优先的响应式设计

---

## 二、技术栈速览

| 层级 | 技术 | 版本 | 作用 |
|------|------|------|------|
| 框架 | Next.js | 16.1.2 | App Router + SSG |
| UI | React | 19 | 组件化开发 |
| 样式 | Tailwind CSS | v4 | 原子化 CSS |
| 组件库 | shadcn/ui | - | 可复用 UI 组件 |
| PWA | Serwist | 9.5 | Service Worker 管理 |
| 图标 | lucide-react | - | 轻量图标库 |

---

## 三、项目结构

```
src/
├── app/                    # 📄 页面层 (Next.js App Router)
│   ├── page.tsx           # 首页 - 岩场列表
│   ├── layout.tsx         # 根布局 (字体、PWA 组件注入)
│   ├── globals.css        # 全局样式 + 设计令牌
│   ├── sw.ts              # Service Worker (Serwist)
│   ├── loading.tsx        # 加载状态页面
│   ├── error.tsx          # 全局错误边界
│   ├── not-found.tsx      # 404 处理
│   ├── crag/[id]/         # 岩场详情 (动态路由)
│   │   ├── page.tsx       # 服务端生成元数据
│   │   ├── crag-detail-client.tsx
│   │   └── error.tsx
│   ├── route/[id]/        # 线路详情 (动态路由)
│   │   ├── page.tsx
│   │   ├── route-detail-client.tsx
│   │   └── error.tsx
│   └── profile/           # 用户页面
│
├── components/            # 🧩 组件层
│   ├── ui/                # shadcn 基础组件 (Button, Card, Skeleton)
│   ├── app-tabbar.tsx     # 底部导航栏 (毛玻璃效果)
│   ├── crag-card.tsx      # 岩场卡片
│   ├── crag-card-skeleton.tsx
│   ├── floating-search.tsx # 浮动搜索按钮
│   ├── search-overlay.tsx # 全屏搜索覆盖层
│   ├── offline-indicator.tsx  # 离线状态横幅
│   ├── sw-update-prompt.tsx   # SW 更新提示弹窗
│   ├── install-prompt.tsx # PWA 安装提示卡片
│   └── route-card-skeleton.tsx
│
├── data/                  # 📊 数据层 (静态)
│   ├── crags.ts           # 岩场数据 (2个岩场)
│   └── routes.ts          # 线路数据 (47条线路)
│
├── hooks/                 # 🪝 自定义 Hooks
│   └── use-route-search.ts # 三级优先级搜索算法
│
├── lib/                   # 🔧 工具库
│   ├── utils.ts           # cn() 类名合并工具
│   ├── tokens.ts          # 设计令牌 + 难度等级颜色
│   └── grade-utils.ts     # 难度等级处理工具
│
└── types/index.ts         # 📝 TypeScript 类型定义
```

---

## 四、核心概念详解

### 4.1 App Router 路由系统

```
/                    → app/page.tsx           (首页)
/crag/yuan-tong-si   → app/crag/[id]/page.tsx (动态路由)
/route/123           → app/route/[id]/page.tsx
/profile             → app/profile/page.tsx
```

**关键点：**
- `[id]` 是动态段，Next.js 会将 URL 中的值传入组件
- `generateStaticParams()` 让这些页面在构建时预渲染（SSG）
- 这意味着访问 `/crag/yuan-tong-si` 时，页面已经生成好了

### 4.2 数据流（无后端）

```
静态数据 (crags.ts / routes.ts)
        ↓
    导入到组件
        ↓
    useState / useMemo 处理
        ↓
    渲染 UI
```

项目没有后端 API，所有数据都是硬编码的。这对于内容稳定的应用很合适。

### 4.3 核心数据接口

```typescript
interface Crag {
  id: string              // 'yuan-tong-si', 'ba-jing-cun'
  name: string            // '圆通寺'
  location: string        // 具体地址
  developmentTime: string // '2019年4月'
  description: string     // 详细描述
  approach: string        // 接近方式 (导航指南)
  coverImages?: string[]  // 可选封面图
}

interface Route {
  id: number
  name: string            // 线路名称
  grade: string           // V0-V13 或 "？"
  cragId: string          // 关联岩场
  area: string            // 区域名
  setter?: string         // 路线设置者
  FA?: string             // 首攀者 (First Ascent)
  description?: string    // 线路描述
  image?: string          // TOPO 图 URL
}
```

### 4.4 数据查询函数

```typescript
// crags.ts
getCragById(id)        // 单个查询
getAllCrags()          // 全部查询

// routes.ts
getRouteById(id)       // 单个查询
getRoutesByCragId(id)  // 按岩场筛选
getAllRoutes()         // 全部查询
```

---

## 五、样式系统 (主题系统)

### 5.1 CSS 变量结构

在 `globals.css` 中定义了设计令牌，使用 `--theme-*` 前缀支持主题切换：

**主题颜色变量 (支持 minimal/outdoor 两种主题)：**
```css
--theme-primary              /* 主色 */
--theme-on-primary           /* 主色上的文本 */
--theme-primary-container    /* 浅色容器背景 */
--theme-on-primary-container /* 容器内文本 */

--theme-surface              /* 背景 */
--theme-surface-variant      /* 变体背景 (稍暗) */
--theme-on-surface           /* 表面文本 */
--theme-on-surface-variant   /* 变体文本 */

--theme-outline              /* 边框 */
--theme-outline-variant      /* 变体边框 */

--theme-warning              /* 警告色 */
--theme-error                /* 错误色 */
--theme-success              /* 成功色 */
```

**主题圆角和阴影：**
```css
--theme-radius-sm/md/lg/xl/full  /* 主题感知圆角 */
--theme-shadow-sm/md/lg          /* 主题感知阴影 */
--theme-transition               /* 主题过渡动画 */
```

**通用令牌 (非主题相关)：**
```css
/* 间距 (8px 基础) */
--space-xs: 0.25rem  /* 4px */
--space-sm: 0.5rem   /* 8px */
--space-md: 0.75rem  /* 12px */
--space-lg: 1rem     /* 16px */
--space-xl: 1.5rem   /* 24px */

/* 基础圆角 */
--radius-xs/sm/md/lg/xl: 0.25-1.75rem
```

### 5.2 在组件中使用

```tsx
// 使用主题变量 (推荐 style 属性)
<div style={{
  backgroundColor: 'var(--theme-primary)',
  color: 'var(--theme-on-primary)',
  borderRadius: 'var(--theme-radius-xl)',
}}>
```

CSS 变量让主题色可以统一管理，通过 `data-theme` 属性切换主题。

### 5.3 自定义动画

```css
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {             /* 骨架屏闪烁 */
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes scale-in {            /* 缩放淡入 */
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
```

### 5.4 难度等级颜色 (tokens.ts)

```typescript
gradeColors: {
  V0: '#4CAF50',   // 绿
  V1-V3: 黄-橙系
  V4-V6: 橙-红系
  V7-V9: 红-紫系
  V10-V13: 蓝-青系
  '？': '#9E9E9E'  // 灰色
}

GRADE_GROUPS: [
  { label: '入门', range: 'V0-V3' },
  { label: '进阶', range: 'V4-V6' },
  { label: '高级', range: 'V7-V9' },
  { label: '精英', range: 'V10+' }
]
```

---

## 六、PWA 功能实现

### 6.1 Service Worker (Serwist)

**位置**: `src/app/sw.ts`

```typescript
// CacheFirst 策略 + 过期管理
const cosImageCache: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "topo-image-*.cos.ap-guangzhou.myqcloud.com",
  handler: new CacheFirst({
    cacheName: "cos-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,           // 最多缓存 200 张
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天过期
        purgeOnQuotaError: true,   // 空间不足时清理
      }),
    ],
  }),
};
```

**配置** (`next.config.ts`):
```typescript
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});
```

### 6.2 PWA 特性实现

| 特性 | 实现 | 文件 |
|------|------|------|
| 离线检测 | useSyncExternalStore + online/offline 事件 | offline-indicator.tsx |
| 安装提示 | beforeinstallprompt 事件 + 自定义 UI | install-prompt.tsx |
| 更新检测 | Service Worker 'updatefound' + 'controllerchange' | sw-update-prompt.tsx |
| 图片缓存 | CacheFirst 策略 + ExpirationPlugin | sw.ts |
| 预缓存 | defaultCache (HTML/JS/CSS) | sw.ts |

### 6.3 Manifest 配置

```json
{
  "name": "罗源野抱 TOPO",
  "display": "standalone",        // 原生应用体验
  "background_color": "#fefbff",
  "theme_color": "#667eea",
  "orientation": "portrait",
  "icons": [                       // 192x192 + 512x512
    { "purpose": "any maskable" }  // 自适应图标
  ]
}
```

---

## 七、组件架构与模式

### 7.1 页面层级

```
app/
├── page.tsx (首页)
│   ├── CragCard × N
│   ├── FloatingSearch → SearchOverlay
│   ├── InstallPrompt
│   └── AppTabbar
├── crag/[id]/page.tsx (岩场详情)
│   └── CragDetailClient (大型组件)
│       ├── 图片轮播区
│       ├── 线路列表
│       └── 其他信息
├── route/[id]/page.tsx (线路详情)
│   └── RouteDetailClient
│       ├── TOPO 图展示
│       ├── 线路信息
│       └── 元数据
└── profile/page.tsx (用户页面)
```

### 7.2 底部导航栏 (app-tabbar.tsx)

```
┌─────────────────────────────────────────┐
│  毛玻璃背景 (bg-white/80 backdrop-blur) │
│                                         │
│   🏠        ⛰️         👤              │
│  [药丸]                                 │  ← 选中时显示
│   首页      线路       我的             │
└─────────────────────────────────────────┘
```

选中状态实现：
- 药丸背景：`bg-[var(--theme-primary-container)]`
- 图标放大：`scale-110`
- 图标变色：`colors.primary`
- 文字加粗：`font-semibold`

### 7.3 提示组件模式

**底部弹窗模式 (sw-update-prompt.tsx):**
```tsx
<div className="fixed bottom-20 left-4 right-4 z-50" style={{
  backgroundColor: 'var(--theme-primary)',
  color: 'var(--theme-on-primary)',
  borderRadius: 'var(--theme-radius-xl)',
}}>
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-10 h-10 rounded-full" style={{
      backgroundColor: 'color-mix(in srgb, var(--theme-on-primary) 20%, transparent)'
    }}>
      <Icon />
    </div>
    <div className="flex-1">
      <p className="font-medium">标题</p>
      <p className="text-sm" style={{ opacity: 0.8 }}>描述</p>
    </div>
    <button onClick={onClose}><X /></button>
  </div>
  <div className="flex gap-2 mt-3">
    <button style={{
      backgroundColor: 'var(--theme-on-primary)',
      color: 'var(--theme-primary)',
    }}>主要操作</button>
  </div>
</div>
```

**顶部横幅模式 (offline-indicator.tsx):**
```tsx
<div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2">
  <Icon className="w-4 h-4" />
  <span className="text-sm font-medium">提示信息</span>
</div>
```

### 7.4 加载状态模式

```tsx
{isLoading ? (
  <Skeleton className="h-20 w-full" />  // 骨架屏
) : (
  <ActualContent />
)}
```

---

## 八、高级功能实现

### 8.1 搜索算法 (use-route-search.ts)

**三级优先级排序：**

```typescript
1级: 匹配类型
  - 完全匹配 (a === b)
  - 连续部分匹配 (indexOf)
  - 非连续匹配 (字符匹配)

2级: 匹配位置
  - 越靠左越优先

3级: ID 排序
  - 保持稳定性
```

**示例：**
```
query: "鱼"
结果排序:
  1. "鱼尔" (完全 → 位置0)
  2. "年年有鱼" (连续 → 位置3)
  3. "虎纠鱼丸" (连续 → 位置2)
```

### 8.2 难度等级处理 (grade-utils.ts)

```typescript
parseGrade('V5')           // → 5
compareGrades('V3', 'V7')  // → -4
calculateGradeRange(grades) // → 'V2 - V8'
getGradeDisplayColor(grade) // → { bg, text }
getGradeDescription(grade)  // → '中级'
```

### 8.3 图片加载策略

```typescript
// 线路详情页
const topoImage = `${COS_BASE_URL}/${cragId}/${encodeURIComponent(name)}.jpg`

// 状态处理
[imageLoading] → Skeleton
[imageError]   → ImageOff 图标
[imageLoaded]  → 显示图片
```

---

## 九、安全性与性能

### 9.1 安全头部 (next.config.ts)

```typescript
X-Frame-Options: DENY                              // 防止嵌入
X-Content-Type-Options: nosniff                    // MIME 类型保护
Referrer-Policy: strict-origin-when-cross-origin   // 引用政策
Content-Security-Policy: [详细配置]                // CSP
Permissions-Policy: geolocation=(), ...            // 权限限制
```

### 9.2 图片优化

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "img.bouldering.top"
    }
  ],
  formats: ["image/avif", "image/webp"]  // 现代格式
}
```

### 9.3 缓存策略

- **HTML/JS/CSS**: defaultCache (Serwist)
- **R2 图片**: CacheFirst 30 天，最多 200 张
- **浏览器缓存**: 由 CDN 配置 (public 资源)

---

## 十、关键文件速查表

| 想改什么 | 去哪个文件 |
|----------|------------|
| 添加新岩场 | `src/data/crags.ts` |
| 添加新线路 | `src/data/routes.ts` |
| 修改主题色 | `src/app/globals.css` 中的 `--theme-*` |
| 修改底部导航 | `src/components/app-tabbar.tsx` |
| 修改首页布局 | `src/app/page.tsx` |
| 修改搜索逻辑 | `src/hooks/use-route-search.ts` |
| 修改难度颜色 | `src/lib/tokens.ts` 中的 `gradeColors` |
| 修改 PWA 缓存 | `src/app/sw.ts` |
| 修改 SEO 元数据 | 各页面的 `generateMetadata()` |

---

## 十一、常用命令

```bash
npm run dev      # 启动开发服务器 (Turbopack 热更新)
npm run build    # 构建生产版本 (Webpack)
npm run start    # 运行生产版本
npm run lint     # ESLint 代码检查
npx shadcn@latest add <component>  # 添加 shadcn/ui 组件
```

---

## 十二、关键技术决策

| 决策 | 理由 |
|------|------|
| Next.js 16 App Router | 服务端优先、SEO 友好、SSG 支持 |
| Serwist | 比 Workbox 更现代、Next.js 集成更好 |
| 静态数据 | 岩场数据稳定、减少依赖、本地优先 |
| Tailwind v4 | 最新性能优化、CSS 变量支持 |
| Material Design 3 | 统一的设计系统、易于维护 |
| CacheFirst + 过期 | 平衡用户体验与数据新鲜度 |

---

## 十三、代码量统计

```
关键文件统计:

数据层 (~100 行)
├── crags.ts           - 2 个岩场数据
└── routes.ts          - 47 条线路数据

类型系统 (~60 行)
└── types/index.ts

工具库 (~170 行)
├── utils.ts           - cn() 函数
├── tokens.ts          - 设计令牌 + 颜色映射
└── grade-utils.ts     - 难度等级工具

页面层 (~600 行)
├── app/page.tsx       - 首页
├── crag/[id]/         - 岩场详情
└── route/[id]/        - 线路详情

组件层 (~800 行)
├── app-tabbar.tsx     - 底部导航
├── crag-card.tsx      - 岩场卡片
├── search-overlay.tsx - 搜索覆盖
└── [其他组件]

Hook 与 PWA (~180 行)
├── use-route-search.ts - 搜索 Hook
└── sw.ts              - Service Worker

样式系统 (~220 行)
└── globals.css        - 设计令牌 + 动画

总计: ~2,300 行 TypeScript/React 代码
```

---

## 总结

这是一个**高质量的生产级 PWA 应用**，具备：

1. **清晰的架构**: 数据、组件、页面分层
2. **完整的 PWA**: 离线支持、安装、更新
3. **优秀的 UX**: 流畅动画、加载状态、搜索体验
4. **现代技术栈**: Next.js 16、React 19、Tailwind v4
5. **类型安全**: 严格的 TypeScript
6. **SEO 友好**: SSG + 动态元数据
7. **可维护性**: 清晰的文件组织、设计令牌系统
