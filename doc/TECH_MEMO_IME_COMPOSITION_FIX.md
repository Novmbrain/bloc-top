# 技术备忘录：React 受控输入与 IME 中文输入冲突

> **项目**: 罗源野抱 TOPO PWA
> **日期**: 2026-02-01
> **Issue**: [#133](https://github.com/Novmbrain/escalade-pwa/issues/133)
> **PR**: [#135](https://github.com/Novmbrain/escalade-pwa/pull/135)
> **影响范围**: 所有中文输入框 (线路编辑器、搜索、反馈等)
> **修复耗时**: ~4 小时 (含诊断、修复、ESLint 适配、CI 调试)

---

## 1. 问题描述

在线路编辑器 (`/editor/routes`) 中，使用中文输入法（拼音、手机预测输入）时，**输入框内容被清空，无法输入中文**。英文直接输入不受影响。

**复现步骤**:
1. 打开 `/editor/routes` → 新增线路
2. 点击"线路名称"输入框
3. 使用中文输入法输入拼音，选词
4. **预期**: 中文字符出现在输入框
5. **实际**: 输入法候选词消失，输入框被清空

---

## 2. 根因分析

### 2.1 IME 输入的浏览器事件流

```
用户按键 "n", "i", "h", "a", "o"
    ↓
compositionstart        ← 输入法激活，开始组合
    ↓
input (value="n")       ← 浏览器更新 DOM
input (value="ni")
input (value="niha")
input (value="nihao")
compositionupdate       ← 候选词变化
    ↓
用户选词 "你好"
    ↓
compositionend          ← 输入法结束，最终值 "你好"
input (value="你好")    ← 最终 input 事件
```

### 2.2 React 受控输入的冲突机制

```
                    React 受控模式
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    ▼                    ▼                    ▼
用户输入 "n"       onChange 触发          React 重渲染
    │            value 仍为 ""          用旧 value="" 覆盖 DOM
    │                                        │
    ▼                                        ▼
IME 组合态中                          输入框被清空！
"拼音消失"                            候选词丢失
```

**核心矛盾**: React 的受控模式在每次渲染时用 `value` prop 覆盖 DOM 值。但 IME 组合期间，浏览器需要**临时控制**输入框内容来显示拼音/候选词。React 的强制覆盖打断了 IME 的正常工作。

这是 React 的**已知长期问题** ([facebook/react#3926](https://github.com/facebook/react/issues/3926), 2015 年提出; [facebook/react#8683](https://github.com/facebook/react/issues/8683), 2017 年追踪)，至今未在框架层面解决。

---

## 3. 修复方案

### 3.1 核心思路：localValue 缓冲层

在 React 受控值和 DOM 之间插入一个**内部状态缓冲层** `localValue`：

```
外部 value prop ──→ localValue state ──→ DOM input
                       ↑
                  IME 期间独立更新
                  compositionEnd 才同步回父组件
```

### 3.2 最终实现 (`CompositionInput`)

```tsx
// src/components/ui/composition-input.tsx

export const CompositionInput = forwardRef(
  function CompositionInput({ onChange, value, ...props }, ref) {
    const [localValue, setLocalValue] = useState(value ?? '')
    const [prevExternal, setPrevExternal] = useState(value)
    const isComposing = useRef(false)

    // ① 派生状态：外部 value 变化时同步（非 IME 期间）
    if (value !== prevExternal) {
      setPrevExternal(value)
      if (!isComposing.current) {
        setLocalValue(value ?? '')
      }
    }

    // ② onChange：始终更新 localValue，仅非 IME 时通知父组件
    const handleChange = useCallback((e) => {
      const newValue = e.target.value
      setLocalValue(newValue)           // DOM 始终响应
      if (!isComposing.current) {
        onChange(newValue)               // 非 IME 时才通知父组件
      }
    }, [onChange])

    // ③ compositionEnd：IME 结束，同步最终值给父组件
    const handleCompositionEnd = useCallback((e) => {
      isComposing.current = false
      const finalValue = e.currentTarget.value
      setLocalValue(finalValue)
      onChange(finalValue)               // 最终值通知父组件
    }, [onChange])

    return (
      <input
        ref={ref}
        {...props}
        value={localValue}              // 用 localValue 而非外部 value
        onChange={handleChange}
        onCompositionStart={() => { isComposing.current = true }}
        onCompositionEnd={handleCompositionEnd}
      />
    )
  }
)
```

### 3.3 关键设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| `isComposing` 用 `useRef` | ✅ ref | 不需要触发重渲染，且需跨事件持久化 |
| `prevExternal` 用 `useState` | ✅ state | 在渲染期间比较，不能用 ref（ESLint 禁止） |
| 外部同步用派生状态 | ✅ render-time if | 不能用 useEffect（ESLint 禁止 setState in effect） |
| `onChange` 签名 `(value: string)` | ✅ 简化 | 比原生 `ChangeEvent` 更易用，适合表单场景 |

---

## 4. ESLint 适配之旅

### 4.1 React 19 的新 ESLint 规则

`eslint-plugin-react-hooks@7.x` 引入了两条严格规则：

| 规则 | 禁止的行为 | React 的理由 |
|------|-----------|-------------|
| `react-hooks/set-state-in-effect` | 在 `useEffect` 内同步调用 `setState` | 导致级联渲染，影响性能 |
| `react-hooks/refs` | 在渲染期间读写 `ref.current` | ref 变更不触发重渲染，可能导致不一致 |

### 4.2 方案演进

```
方案 A: useEffect + setState (传统模式)
  useEffect(() => {
    if (!isComposing.current) setLocalValue(value ?? '')
  }, [value])
  ❌ 被 react-hooks/set-state-in-effect 拦截

方案 B: 渲染期间读 useRef (getDerivedStateFromProps 模式)
  const prevValue = useRef(value)
  if (value !== prevValue.current) { ... }
  ❌ 被 react-hooks/refs 拦截 (不允许渲染期间读 ref)

方案 C ✅: 派生状态 + useState 追踪 + eslint-disable (最终方案)
  const [prevExternal, setPrevExternal] = useState(value)
  if (value !== prevExternal) {
    setPrevExternal(value)
    if (!isComposing.current) { // eslint-disable-line react-hooks/refs
      setLocalValue(value ?? '')
    }
  }
  ✅ ESLint 通过 (仅 isComposing.current 需要 disable，这是合理的)
```

### 4.3 为什么 `isComposing` 必须用 ref

`isComposing` 不能用 `useState` 替代，因为：
1. **频率高**：`compositionstart/end` 可能在快速输入时频繁触发
2. **不需要重渲染**：IME 状态是事件处理的内部标志，不影响 UI
3. **时序敏感**：`setState` 是异步批处理的，会导致 `handleChange` 中读到过期的状态

因此对 `isComposing.current` 的渲染期间访问加了 `eslint-disable-line`，并注释说明原因。

---

## 5. 其他修复点

### 5.1 onChange 中不做字符清洗

岩面重命名输入框原先在 `onChange` 中做 `replace(/[^...]/g, '')`：

```tsx
// ❌ 旧代码 (main 分支)：IME 期间会破坏中间态
onChange={(value) => setRenameValue(
  value.toLowerCase().replace(/[^\u4e00-\u9fffa-z0-9-]/g, '')
)}

// ✅ 新代码：输入时不干预，失焦时再清洗
onChange={(value) => setRenameValue(value)}
onBlur={(e) => {
  const cleaned = e.target.value.toLowerCase()
    .replace(/[^\u4e00-\u9fffa-z0-9-]/g, '')
  setRenameValue(cleaned)
}}
```

**原则**: IME 组合期间的中间值包含拼音字母，做 replace 会误删内容。清洗应延迟到 `onBlur` 或 `onSubmit`。

### 5.2 统一使用 CompositionInput

所有可能输入中文的输入框都替换为 `CompositionInput` / `CompositionTextarea`：
- 线路编辑器：名称、区域、FA、定线者、描述
- 岩面编辑器：重命名
- 搜索框
- Beta 视频提交表单
- 反馈表单

---

## 6. 测试策略

### 6.1 自动化测试（Vitest）

`composition-input.test.tsx` 覆盖 9 个测试用例：
- 基本渲染和值显示
- `onChange` 回调触发
- IME 组合期间不触发 `onChange`
- `compositionEnd` 触发最终值回调
- 外部 `value` 同步
- `forwardRef` 正确传递

### 6.2 自动化测试的局限

Playwright 的 `pressSequentially` **不触发真实的 IME 组合事件**（`compositionstart/end`），只是逐字符输入。因此自动化测试**无法验证 IME 修复的核心场景**。

### 6.3 手动测试清单

| 设备 | 输入法 | 测试项 |
|------|--------|--------|
| iPhone | iOS 原生拼音 | 拼音输入 → 选词 → 预测文本 |
| Android | Gboard 中文 | 拼音输入 → 滑动输入 → 语音输入 |
| Mac | 系统拼音 | 全拼 → 双拼 → 五笔 |
| Windows | 微软拼音 | 全拼 → 联想输入 |

**特别注意 iOS**：iOS 原生键盘的 `input` 事件可能在 `compositionend` **之前**触发，与 Android/桌面顺序不同。

---

## 7. 经验教训

### 7.1 技术层面

1. **React 受控输入 + IME = 已知坑**，自 2015 年存在，框架未修复。任何需要中文输入的 React 应用都应预防性使用 `CompositionInput` 模式。

2. **React 19 ESLint 规则非常严格**，传统的 `useEffect` + `setState` 同步外部 prop 模式不再被允许。需要用**渲染期间的派生状态**（类似 class 组件的 `getDerivedStateFromProps`）来替代。

3. **不要在 onChange 中做字符清洗**——IME 中间态包含拼音/候选词，正则替换会破坏输入流程。清洗应放在 `onBlur` 或 `onSubmit`。

### 7.2 流程层面

1. **缺少 pre-commit hook** 导致 ESLint 错误直到 CI 才被发现。已补充 `husky` + `lint-staged` 配置 ([PR #136](https://github.com/Novmbrain/escalade-pwa/pull/136))。

2. **合并冲突需关注语义**：main 分支的 `onChange` 内联清洗与 feature 分支的 `onBlur` 清洗方案冲突，合并时必须选择 IME 兼容的方案。

---

## 8. 相关 Commit 记录

| Commit | 说明 |
|--------|------|
| `593d0e4` | 所有中文输入框使用 `CompositionInput` |
| `8a27437` | 添加 `localValue` 内部状态 |
| `caab305` | 解决合并冲突，保留 `onBlur` 清洗 |
| `64f8d35` | 替换 `useEffect` 为派生状态模式，修复 ESLint |
| `51cbbf9` | 添加 `husky` + `lint-staged` |

---

## 9. 参考资料

- [React Issue #8683 - IME Composition in Controlled Components](https://github.com/facebook/react/issues/8683) — React 官方 issue，2017 年至今未关闭
- [React Issue #3926 - onChange fires before composition ends](https://github.com/facebook/react/issues/3926) — 最早的相关 issue (2015)
- [react-hooks/set-state-in-effect 规则文档](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect) — React 官方 ESLint 规则说明
- [React Issue #34743 - set-state-in-effect overly strict?](https://github.com/facebook/react/issues/34743) — 社区对规则过严的讨论
- [MDN: compositionstart event](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionstart_event) — Web 标准参考
- [中文輸入法與 React 文字輸入框的問題與解決方案](https://eddychang.me/blog/react-chinese-ime-issue) — 中文社区解决方案总结
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — React 官方指南：何时不需要 Effect
