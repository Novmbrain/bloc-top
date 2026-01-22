# 国际化 (i18n) 实现方案

> 符合工业界标准的 Next.js App Router 国际化分阶段实施计划

## 目录

1. [方案概述](#方案概述)
2. [技术选型](#技术选型)
3. [架构设计](#架构设计)
4. [分阶段实施计划](#分阶段实施计划)
5. [文件结构](#文件结构)
6. [核心代码示例](#核心代码示例)
7. [最佳实践](#最佳实践)
8. [SEO 考量](#seo-考量)
9. [测试策略](#测试策略)

---

## 方案概述

### 目标

- **第一阶段**: UI 界面支持中英文切换（数据库内容保持中文）
- **第二阶段**: 未来可扩展支持数据库内容多语言

### 核心原则

| 原则 | 说明 |
|------|------|
| **渐进式** | 分阶段实施，不影响现有功能 |
| **SEO 友好** | URL 路由支持语言前缀 (`/en/crag/...`) |
| **性能优先** | 支持静态生成，最小化客户端 bundle |
| **类型安全** | TypeScript 全面支持，编译时检查 |

---

## 技术选型

### 推荐方案: next-intl

| 对比维度 | next-intl | react-i18next |
|----------|-----------|---------------|
| **App Router 支持** | ✅ 原生设计 | ⚠️ 需要适配 |
| **周下载量** | 792K+ | 3.9M (跨框架) |
| **Bundle 大小** | ~10KB | ~22KB |
| **TypeScript** | ✅ 优秀的类型推断 | ✅ 支持 |
| **静态渲染** | ✅ 原生支持 | ⚠️ 配置复杂 |
| **Server Components** | ✅ 完美支持 | ⚠️ 需要额外配置 |
| **学习曲线** | 低 | 中 |
| **维护活跃度** | ⭐ 高 (2025) | ⭐ 高 |

### 选择理由

1. **Next.js 专用**: next-intl 专为 Next.js 设计，与 App Router 深度集成
2. **ICU 消息格式**: 支持复数、性别、选择等复杂本地化场景
3. **编译时检查**: TypeScript 自动补全翻译 key，避免运行时错误
4. **性能优化**: Server Components 中翻译不会增加客户端 bundle

### 参考资料

- [next-intl 官方文档](https://next-intl.dev/docs/getting-started/app-router)
- [Next.js i18n 最佳实践 2025](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)
- [next-intl vs react-i18next 对比](https://medium.com/better-dev-nextjs-react/the-best-i18n-libraries-for-next-js-app-router-in-2025-21cb5ab2219a)

---

## 架构设计

### URL 路由策略

采用 **Sub-path Routing** (子路径路由)：

```
/          → 重定向到 /zh (默认语言)
/zh        → 中文首页
/en        → 英文首页
/zh/crag/yuan-tong-si → 中文岩场详情
/en/crag/yuan-tong-si → 英文岩场详情（UI 英文，数据中文）
```

### 语言检测优先级

```
1. URL 路径 (/en/..., /zh/...)
2. Cookie (NEXT_LOCALE)
3. Accept-Language 请求头
4. 默认语言 (zh)
```

### 数据处理策略

| 内容类型 | 阶段一 | 阶段二 (未来) |
|----------|--------|---------------|
| **UI 文本** | ✅ 翻译 | ✅ 翻译 |
| **按钮/标签** | ✅ 翻译 | ✅ 翻译 |
| **岩场名称** | 中文原样 | 可选翻译 |
| **线路名称** | 中文原样 | 可选翻译 |
| **描述文本** | 中文原样 | 可选翻译 |

---

## 分阶段实施计划

### 阶段 0: 准备工作 (1-2 小时)

```bash
# 安装依赖
npm install next-intl
```

**任务清单**:
- [ ] 安装 next-intl
- [ ] 创建翻译文件目录结构
- [ ] 配置 next.config.ts

### 阶段 1: 核心配置 (2-3 小时)

**任务清单**:
- [ ] 创建 `src/i18n/routing.ts` - 路由配置
- [ ] 创建 `src/i18n/request.ts` - 请求配置
- [ ] 创建 `src/i18n/navigation.ts` - 导航组件
- [ ] 创建 `src/middleware.ts` - 语言检测中间件
- [ ] 重构 `src/app` 目录为 `src/app/[locale]`

### 阶段 2: 翻译文件 (3-4 小时)

**任务清单**:
- [ ] 创建 `messages/zh.json` - 中文翻译
- [ ] 创建 `messages/en.json` - 英文翻译
- [ ] 提取所有 UI 文本到翻译文件
- [ ] 按模块组织翻译命名空间

### 阶段 3: 组件迁移 (4-6 小时)

**任务清单**:
- [ ] 迁移 Layout 组件
- [ ] 迁移首页组件
- [ ] 迁移岩场详情页
- [ ] 迁移线路列表页
- [ ] 迁移通用组件 (按钮、导航等)

### 阶段 4: 语言切换器 (1-2 小时)

**任务清单**:
- [ ] 创建 `LocaleSwitcher` 组件
- [ ] 集成到导航栏/设置页
- [ ] 处理语言切换时的页面保持

### 阶段 5: SEO 优化 (1-2 小时)

**任务清单**:
- [ ] 配置 `generateMetadata` 多语言
- [ ] 添加 `hreflang` 标签
- [ ] 配置 canonical URLs

### 阶段 6: 测试与验收 (2-3 小时)

**任务清单**:
- [ ] 单元测试翻译 Hook
- [ ] 集成测试语言切换
- [ ] E2E 测试多语言路由
- [ ] 验证 SEO 标签正确性

---

## 文件结构

```
├── messages/
│   ├── zh.json              # 中文翻译
│   └── en.json              # 英文翻译
├── src/
│   ├── i18n/
│   │   ├── routing.ts       # 路由配置 (locales, defaultLocale)
│   │   ├── request.ts       # 请求配置 (getRequestConfig)
│   │   └── navigation.ts    # 导航组件 (Link, useRouter, usePathname)
│   ├── middleware.ts        # 语言检测中间件
│   └── app/
│       └── [locale]/        # 动态语言路由
│           ├── layout.tsx   # 根布局 (NextIntlClientProvider)
│           ├── page.tsx     # 首页
│           ├── crag/
│           │   └── [id]/
│           │       └── page.tsx
│           ├── route/
│           │   └── page.tsx
│           └── profile/
│               └── page.tsx
└── next.config.ts           # Next.js 配置 (i18n 插件)
```

---

## 核心代码示例

### 1. 路由配置 (`src/i18n/routing.ts`)

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['zh', 'en'],
  
  // 默认语言
  defaultLocale: 'zh',
  
  // 默认语言是否显示前缀
  // 'always': /zh/... 和 /en/...
  // 'as-needed': / 和 /en/... (默认语言不带前缀)
  localePrefix: 'always'
});

export type Locale = (typeof routing.locales)[number];
```

### 2. 请求配置 (`src/i18n/request.ts`)

```typescript
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // 验证并获取语言
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // 动态加载翻译文件
    messages: (await import(`../../messages/${locale}.json`)).default,
    // 时区配置
    timeZone: 'Asia/Shanghai',
    // 缺失翻译处理
    onError(error) {
      if (error.code === 'MISSING_MESSAGE') {
        console.warn('[i18n] Missing translation:', error.message);
      } else {
        console.error('[i18n] Error:', error);
      }
    },
    // 缺失翻译时的回退
    getMessageFallback({ namespace, key }) {
      return `${namespace}.${key}`;
    }
  };
});
```

### 3. 导航组件 (`src/i18n/navigation.ts`)

```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const {
  Link,           // 语言感知的 Link 组件
  useRouter,      // 语言感知的 useRouter
  usePathname,    // 获取不带语言前缀的路径
  redirect,       // 服务端重定向
  permanentRedirect,
  getPathname
} = createNavigation(routing);
```

### 4. 中间件 (`src/middleware.ts`)

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // 匹配所有路径，排除：
  // - API 路由 (/api/...)
  // - Next.js 内部路径 (/_next/...)
  // - 静态文件 (*.ico, *.png 等)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
```

### 5. 根布局 (`src/app/[locale]/layout.tsx`)

```typescript
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// 生成静态参数 (SSG)
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 多语言元数据
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  // 可以使用 getTranslations 获取翻译
  return {
    title: locale === 'zh' ? '罗源野抱 TOPO' : 'Luoyuan Bouldering TOPO',
    description: locale === 'zh' 
      ? '福州罗源攀岩线路分享' 
      : 'Bouldering guide for Luoyuan, Fuzhou'
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // 验证语言
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // 启用静态渲染
  setRequestLocale(locale);

  // 获取翻译消息
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 6. 页面组件示例 (`src/app/[locale]/page.tsx`)

```typescript
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  
  // 启用静态渲染
  setRequestLocale(locale);
  
  // 使用翻译
  const t = useTranslations('HomePage');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### 7. 语言切换器 (`src/components/locale-switcher.tsx`)

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English'
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`px-3 py-1 rounded-full text-sm ${
            loc === locale
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-variant text-on-surface-variant'
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
```

### 8. 翻译文件示例

**`messages/zh.json`**:
```json
{
  "Common": {
    "loading": "加载中...",
    "error": "出错了",
    "retry": "重试",
    "back": "返回",
    "search": "搜索",
    "filter": "筛选",
    "all": "全部",
    "cancel": "取消",
    "confirm": "确认"
  },
  "HomePage": {
    "title": "罗源野抱",
    "subtitle": "发现你的下一条线路"
  },
  "CragCard": {
    "routes": "{count} 条线路",
    "gradeRange": "难度范围"
  },
  "CragDetail": {
    "approach": "前往方式",
    "weather": "天气",
    "map": "岩场地图",
    "description": "岩场介绍",
    "exploreRoutes": "开始探索线路",
    "mapHint": "点击导航按钮可跳转高德地图"
  },
  "RouteList": {
    "title": "线路列表",
    "searchPlaceholder": "搜索线路名称...",
    "noResults": "未找到匹配的线路",
    "sortBy": "排序",
    "gradeFilter": "难度筛选"
  },
  "Weather": {
    "good": "适宜攀岩",
    "moderate": "一般",
    "poor": "不适宜",
    "temperature": "温度",
    "humidity": "湿度",
    "wind": "风力"
  },
  "Navigation": {
    "home": "首页",
    "routes": "线路",
    "profile": "我的"
  },
  "LocaleSwitcher": {
    "switchTo": "切换语言"
  }
}
```

**`messages/en.json`**:
```json
{
  "Common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "back": "Back",
    "search": "Search",
    "filter": "Filter",
    "all": "All",
    "cancel": "Cancel",
    "confirm": "Confirm"
  },
  "HomePage": {
    "title": "Luoyuan Bouldering",
    "subtitle": "Discover your next climb"
  },
  "CragCard": {
    "routes": "{count, plural, =1 {# route} other {# routes}}",
    "gradeRange": "Grade Range"
  },
  "CragDetail": {
    "approach": "Getting There",
    "weather": "Weather",
    "map": "Crag Map",
    "description": "Description",
    "exploreRoutes": "Explore Routes",
    "mapHint": "Tap navigation button to open in Amap"
  },
  "RouteList": {
    "title": "Route List",
    "searchPlaceholder": "Search routes...",
    "noResults": "No routes found",
    "sortBy": "Sort by",
    "gradeFilter": "Grade Filter"
  },
  "Weather": {
    "good": "Good for climbing",
    "moderate": "Moderate",
    "poor": "Not recommended",
    "temperature": "Temperature",
    "humidity": "Humidity",
    "wind": "Wind"
  },
  "Navigation": {
    "home": "Home",
    "routes": "Routes",
    "profile": "Profile"
  },
  "LocaleSwitcher": {
    "switchTo": "Switch language"
  }
}
```

---

## 最佳实践

### 1. Server vs Client Components

```typescript
// ✅ 推荐: Server Component 中使用翻译
// src/app/[locale]/crag/[id]/page.tsx
import { useTranslations } from 'next-intl';

export default function CragPage() {
  const t = useTranslations('CragDetail');
  return <h1>{t('title')}</h1>;
}

// ✅ 推荐: 从 Server 传递翻译内容到 Client
// Server Component
function ServerComponent() {
  const t = useTranslations('Button');
  return <ClientButton label={t('submit')} />;
}

// Client Component
'use client';
function ClientButton({ label }: { label: string }) {
  return <button>{label}</button>;
}

// ⚠️ 避免: Client Component 中大量使用 useTranslations
// 这会增加客户端 bundle 大小
```

### 2. 按需加载翻译

```typescript
// 只传递需要的翻译到客户端
import pick from 'lodash/pick';
import { NextIntlClientProvider, useMessages } from 'next-intl';

export default function Layout({ children }) {
  const messages = useMessages();
  
  return (
    <NextIntlClientProvider 
      messages={pick(messages, ['Navigation', 'Common'])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
```

### 3. 类型安全

```typescript
// 创建类型定义 (可选但推荐)
// src/types/i18n.d.ts
import zh from '../../messages/zh.json';

type Messages = typeof zh;

declare global {
  interface IntlMessages extends Messages {}
}
```

### 4. 处理数据库中文内容

```typescript
// 岩场详情页示例
export default function CragPage({ params }) {
  const t = useTranslations('CragDetail');
  const crag = await getCragById(params.id); // 数据库返回中文
  
  return (
    <div>
      {/* UI 文本使用翻译 */}
      <h2>{t('description')}</h2>
      
      {/* 数据库内容保持原样 */}
      <p>{crag.description}</p>
      
      {/* 混合使用 */}
      <span>{t('routes', { count: crag.routeCount })}</span>
    </div>
  );
}
```

---

## SEO 考量

### 1. hreflang 标签

```typescript
// src/app/[locale]/layout.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  
  return {
    alternates: {
      languages: {
        'zh': '/zh',
        'en': '/en',
        'x-default': '/zh'
      }
    }
  };
}
```

### 2. 多语言 Sitemap

```typescript
// src/app/sitemap.ts
import { routing } from '@/i18n/routing';

export default async function sitemap() {
  const crags = await getAllCrags();
  
  const entries = crags.flatMap((crag) => 
    routing.locales.map((locale) => ({
      url: `https://example.com/${locale}/crag/${crag.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8
    }))
  );
  
  return entries;
}
```

### 3. 语言特定的 robots.txt

```typescript
// src/app/robots.ts
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/'
    },
    sitemap: 'https://example.com/sitemap.xml'
  };
}
```

---

## 测试策略

### 1. 单元测试

```typescript
// src/i18n/__tests__/translations.test.ts
import { describe, it, expect } from 'vitest';
import zh from '../../../messages/zh.json';
import en from '../../../messages/en.json';

describe('Translation files', () => {
  it('should have matching keys in all languages', () => {
    const zhKeys = Object.keys(flattenObject(zh)).sort();
    const enKeys = Object.keys(flattenObject(en)).sort();
    
    expect(zhKeys).toEqual(enKeys);
  });
  
  it('should not have empty translations', () => {
    const allValues = Object.values(flattenObject(en));
    const emptyValues = allValues.filter(v => v === '');
    
    expect(emptyValues).toHaveLength(0);
  });
});
```

### 2. 组件测试

```typescript
// src/components/__tests__/locale-switcher.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleSwitcher } from '../locale-switcher';
import { NextIntlClientProvider } from 'next-intl';

describe('LocaleSwitcher', () => {
  it('should display all available locales', () => {
    render(
      <NextIntlClientProvider locale="zh" messages={{}}>
        <LocaleSwitcher />
      </NextIntlClientProvider>
    );
    
    expect(screen.getByText('中文')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
```

---

## 风险与注意事项

### 1. 路由重构风险

- **影响**: 所有页面路径都会添加 `[locale]` 前缀
- **缓解**: 配置中间件自动重定向旧路径

### 2. SEO 影响

- **风险**: 搜索引擎需要重新索引新 URL
- **缓解**: 配置正确的 canonical 和 hreflang 标签

### 3. 缓存失效

- **影响**: ISR 缓存需要按语言分别缓存
- **缓解**: 确保 `generateStaticParams` 包含所有语言

### 4. 第三方组件

- **风险**: 部分第三方组件可能不支持 i18n
- **缓解**: 使用 wrapper 组件包装

---

## 时间估算

| 阶段 | 预估时间 | 风险等级 |
|------|---------|---------|
| 阶段 0: 准备工作 | 1-2h | 低 |
| 阶段 1: 核心配置 | 2-3h | 中 |
| 阶段 2: 翻译文件 | 3-4h | 低 |
| 阶段 3: 组件迁移 | 4-6h | 高 |
| 阶段 4: 语言切换器 | 1-2h | 低 |
| 阶段 5: SEO 优化 | 1-2h | 中 |
| 阶段 6: 测试验收 | 2-3h | 中 |
| **总计** | **14-22h** | - |

---

## 参考资源

- [next-intl 官方文档](https://next-intl.dev/)
- [Next.js 国际化指南](https://nextjs.org/docs/pages/guides/internationalization)
- [ICU 消息格式语法](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [SEO 与 i18n 实现指南](https://dev.to/oikon/seo-and-i18n-implementation-guide-for-nextjs-app-router-dynamic-metadata-and-internationalization-3eol)
