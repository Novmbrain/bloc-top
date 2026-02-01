# 设计方案：统一输入框组件

> **日期**: 2026-02-01
> **背景**: IME 修复后所有文本输入框已使用 `CompositionInput`/`CompositionTextarea`，但样式和行为散落在 20+ 处，存在大量重复代码

---

## 1. 现状分析

### 1.1 当前输入框分布

```
CompositionInput (16处)
├── 表单输入 × 14  → 相同样式重复 17 次
│   ├── editor/routes/page.tsx (11处: name, area, FA, setter × 新建+编辑)
│   ├── editor/faces/page.tsx  (3处: customArea, faceId, rename)
│   └── beta-submit-drawer.tsx (1处: url)
└── 搜索输入 × 3   → 相同样式重复 3 次
    ├── search-drawer.tsx
    ├── search-overlay.tsx
    └── route/route-client.tsx

CompositionTextarea (3处)
├── editor/routes/page.tsx (2处: 新建+编辑 description)
└── profile/page.tsx       (1处: feedback)
```

### 1.2 重复代码模式

**表单输入** — 以下样式重复 17 次：
```tsx
<CompositionInput
  type="text"
  value={...}
  onChange={...}
  placeholder="..."
  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200
             focus:ring-2 focus:ring-[var(--theme-primary)]"
  style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
/>
```

**搜索输入** — 以下样式重复 3 次：
```tsx
<CompositionInput
  ref={inputRef}
  type="text"
  placeholder={t('placeholder')}
  value={searchQuery}
  onChange={(value) => onSearchChange(value)}
  className="w-full h-10 pl-10 pr-10 text-sm focus:outline-none"
  style={{ backgroundColor: '...', color: '...' }}
/>
```

---

## 2. 设计目标

1. **消除重复**: 17+ 处相同的 className/style 收敛到一处定义
2. **保持灵活**: 允许覆盖样式和行为，不限制使用场景
3. **IME 安全**: 底层始终使用 `CompositionInput`，开发者无法意外使用原生 `<input>`
4. **最小改动**: 不改变组件 API 的核心设计，只增加预设变体
5. **符合项目风格**: 用 `cva` (class-variance-authority) + 内联 CSS 变量，与现有 `Button` 组件模式一致

---

## 3. 方案设计

### 3.1 组件层级

```
现有:
  CompositionInput  (底层, IME 处理)
  CompositionTextarea

新增:
  Input  (上层, 样式变体 + IME 内置)
  Textarea
```

### 3.2 Input 组件 API

```tsx
// src/components/ui/input.tsx

import { cva, type VariantProps } from 'class-variance-authority'
import { CompositionInput } from './composition-input'

const inputVariants = cva(
  // 基础样式 (所有变体共享)
  'w-full text-sm outline-none transition-all duration-200',
  {
    variants: {
      variant: {
        // 表单输入 (editor 页面的标准输入框)
        form: 'px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)]',
        // 搜索输入 (带图标的搜索框, padding 留给图标)
        search: 'h-10 pl-10 pr-10 focus:outline-none',
        // 无样式 (完全自定义)
        unstyled: '',
      },
      // 大小可选
      size: {
        sm: 'py-1.5 text-xs',
        md: '',  // 默认, 由 variant 控制
        lg: 'py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'form',
      size: 'md',
    },
  }
)

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>,
    VariantProps<typeof inputVariants> {
  onChange: (value: string) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant, size, className, style, ...props }, ref) => {
    // 自动注入主题色 (form/search 变体)
    const themeStyle = variant !== 'unstyled'
      ? {
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-on-surface)',
          ...style,
        }
      : style

    return (
      <CompositionInput
        ref={ref}
        className={cn(inputVariants({ variant, size }), className)}
        style={themeStyle}
        {...props}
      />
    )
  }
)
```

### 3.3 Textarea 组件 API

```tsx
// src/components/ui/textarea.tsx (或合并到 input.tsx)

const textareaVariants = cva(
  'w-full text-sm resize-none outline-none transition-all duration-200',
  {
    variants: {
      variant: {
        form: 'px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)]',
        unstyled: '',
      },
    },
    defaultVariants: { variant: 'form' },
  }
)

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant, className, style, ...props }, ref) => {
    const themeStyle = variant !== 'unstyled'
      ? {
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-on-surface)',
          ...style,
        }
      : style

    return (
      <CompositionTextarea
        ref={ref}
        className={cn(textareaVariants({ variant }), className)}
        style={themeStyle}
        {...props}
      />
    )
  }
)
```

### 3.4 使用示例：重构前后对比

**表单输入 (重构前)**:
```tsx
<CompositionInput
  type="text"
  value={newRoute.name}
  onChange={(v) => setNewRoute(prev => ({ ...prev, name: v }))}
  placeholder="线路名称"
  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200
             focus:ring-2 focus:ring-[var(--theme-primary)]"
  style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
/>
```

**表单输入 (重构后)**:
```tsx
<Input
  value={newRoute.name}
  onChange={(v) => setNewRoute(prev => ({ ...prev, name: v }))}
  placeholder="线路名称"
/>
```

**搜索输入 (重构前)**:
```tsx
<CompositionInput
  ref={inputRef}
  type="text"
  placeholder={t('placeholder')}
  value={searchQuery}
  onChange={(value) => onSearchChange(value)}
  className="w-full h-10 pl-10 pr-10 text-sm focus:outline-none"
  style={{ backgroundColor: '...', color: '...' }}
/>
```

**搜索输入 (重构后)**:
```tsx
<Input
  ref={inputRef}
  variant="search"
  value={searchQuery}
  onChange={(value) => onSearchChange(value)}
  placeholder={t('placeholder')}
/>
```

---

## 4. 影响范围

### 4.1 需要修改的文件

| 文件 | 变更 | 输入框数量 |
|------|------|-----------|
| `src/components/ui/input.tsx` | **新建** | — |
| `src/components/ui/textarea.tsx` | **新建** | — |
| `src/app/[locale]/editor/routes/page.tsx` | 替换 11 input + 2 textarea | 13 |
| `src/app/[locale]/editor/faces/page.tsx` | 替换 3 input | 3 |
| `src/components/search-drawer.tsx` | 替换 1 input | 1 |
| `src/components/search-overlay.tsx` | 替换 1 input | 1 |
| `src/components/beta-submit-drawer.tsx` | 替换 1 input | 1 |
| `src/app/[locale]/route/route-client.tsx` | 替换 1 input | 1 |
| `src/app/[locale]/profile/page.tsx` | 替换 1 textarea | 1 |

**总计**: 新建 2 文件，修改 7 文件，替换 21 处输入框

### 4.2 不需要修改的

| 元素 | 文件 | 原因 |
|------|------|------|
| `<input type="password">` | profile/page.tsx | 数字密码，不需要 IME |
| `<input type="number">` | beta-submit-drawer.tsx | 纯数字输入 |
| `<input type="file">` | editor/faces/page.tsx | 文件选择器 |

---

## 5. 实施步骤

```
Step 1: 创建 Input / Textarea 组件
  ├── src/components/ui/input.tsx
  └── src/components/ui/textarea.tsx

Step 2: 为新组件编写测试
  ├── input.test.tsx (渲染、变体、IME 透传)
  └── textarea.test.tsx

Step 3: 逐文件替换 (从影响最大的开始)
  ├── editor/routes/page.tsx (13处)
  ├── editor/faces/page.tsx (3处)
  └── 其余 5 个文件

Step 4: 运行全量测试确认无回归
  ├── npm run lint
  ├── npm run test:run
  └── npm run test:ct

Step 5: 更新 CLAUDE.md 组件文档
```

---

## 6. 未来防护

### 6.1 ESLint 规则 (可选)

可以添加自定义 ESLint 规则或 lint-staged 检查，禁止直接使用 `<input type="text">` 和 `<textarea>`：

```js
// eslint 自定义规则概念
// 检测 JSX 中直接使用 <input> 而非 <Input> 的情况
'no-restricted-jsx': ['error', {
  elements: [
    { element: 'input', message: '请使用 <Input> 组件 (from @/components/ui/input)' },
    { element: 'textarea', message: '请使用 <Textarea> 组件 (from @/components/ui/textarea)' },
  ]
}]
```

### 6.2 组件文件内注释

```tsx
// composition-input.tsx

/**
 * ⚠️ 底层 IME 处理组件 - 请勿直接使用
 *
 * 应用代码中请使用:
 * - <Input> from '@/components/ui/input'       (文本输入)
 * - <Textarea> from '@/components/ui/textarea'  (多行文本)
 *
 * 这些上层组件已内置 IME 处理 + 主题样式。
 */
```
