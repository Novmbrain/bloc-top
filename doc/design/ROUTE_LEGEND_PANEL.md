# Route Legend Panel (线路图例面板) 设计文档

> 替代眼睛切换按钮，为同岩面多线路提供直觉化的图例导航与完全联动切换体验。

## 1. 背景与动机

### 现有问题

当多条线路共享同一岩面图片时，`RouteDetailDrawer` 顶部有一个 Eye/EyeOff 按钮来切换其他线路的可见性。用户反馈：

1. **含义不明** — 眼睛图标不能传达"显示/隐藏其他线路"的语义
2. **不可发现** — 14px 图标 + 半透明背景，与图片融为一体
3. **无上下文** — 只显示数字（如 "3"），不知道是哪 3 条线路

### 设计目标

用**线路图例面板**替代眼睛按钮，实现：

- **自解释**：用户看到面板就理解"这个岩面上有哪些线路"
- **可操作**：点击图例项即可切换焦点线路，topo 高亮 + 详情区完全联动
- **智能默认**：根据线路数量自动决定是否叠加显示

## 2. 设计决策

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 交互模式 | 图例面板 (Legend Panel) | 同时承担信息展示 + 交互控制，自解释 |
| 联动范围 | 完全联动 | 切换焦点 → topo 高亮 + 详情区同步更新 |
| 默认可见性 | 智能判断 | ≤3 条全显示，>3 条仅当前，减少视觉混乱 |
| 面板位置 | topo 图与详情之间 | 作为"图像→文字"的过渡区 |
| URL 行为 | 不更新 | 纯 `useState` 本地状态，实现简单 |

## 3. 组件架构

### 3.1 组件层级图

```
RouteDetailDrawer
├── Topo 图片区域
│   ├── Image (岩面图片)
│   ├── MultiTopoLineOverlay / TopoLineOverlay (SVG 线路叠加)
│   └── [移除] Eye/EyeOff 按钮              ← 删除
│
├── RouteLegendPanel ★ NEW                    ← 新增组件
│   ├── 线路列表 (每条: 颜色圆点 + 难度 badge + 线路名)
│   └── [条件] "显示全部" 按钮 (>3 条时)
│
├── 线路详情区域 (名称、难度、描述等)          ← 内容随焦点切换
│   ├── 难度标签 + 线路名
│   ├── 位置信息
│   ├── FA / setter 信息
│   └── 描述
│
└── Beta 按钮
```

### 3.2 新组件定义

#### `RouteLegendPanel`

**文件**: `src/components/route-legend-panel.tsx`

```typescript
interface RouteLegendPanelProps {
  /** 同岩面所有有效线路 */
  routes: MultiTopoRoute[]
  /** 当前焦点线路 ID */
  selectedRouteId: number
  /** 线路切换回调 */
  onRouteSelect: (routeId: number) => void
  /** 是否显示所有叠加线路（用于 >3 条时的 toggle） */
  showAllOverlay: boolean
  /** 切换显示所有叠加线路 */
  onToggleShowAll: () => void
  /** 总线路数（含无 topo 数据的），用于判断是否显示 showAll toggle */
  totalRouteCount?: number
}
```

**设计要素**:

| 元素 | 规格 |
|------|------|
| 位置 | topo 图下方，`mb-3`，与详情区间隔 |
| 背景 | `var(--theme-surface-variant)` |
| 圆角 | `var(--theme-radius-lg)` |
| 内间距 | `px-3 py-2` |
| 每行高度 | ~36px (紧凑但可触控) |

**每条线路行**:

```
┌─────────────────────────────────────┐
│  ● V3  猴子捞月                      │  ← 焦点: 全色圆点 + 粗体
│  ○ V5  飞燕走壁                      │  ← 非焦点: 空心圆点 + 普通
│  ○ V2  小石头                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← 分隔线 (>3 条时)
│  ⊕ 显示全部线路                      │  ← 仅 >3 条且 showAllOverlay=false 时
└─────────────────────────────────────┘
```

视觉规格：

| 元素 | 焦点状态 | 非焦点状态 |
|------|---------|-----------|
| 圆点 | 实心 `●`，`w-2.5 h-2.5`，`gradeColor` 填充 | 空心 `○`，`gradeColor` 描边 |
| 难度 badge | `text-xs font-bold`，`gradeColor` 文字 | `text-xs font-medium`，`opacity-60` |
| 线路名 | `text-sm font-semibold`，`on-surface` | `text-sm`，`on-surface-variant` |
| 行背景 | `primary 8%` 淡色高亮 | 透明 |
| 触控反馈 | — | `active:scale-[0.98]` + `active:bg-primary/5` |

## 4. 数据流设计

### 4.1 状态管理

所有新状态存放在 `RouteDetailDrawer` 内部，**不需要新的 Context 或全局状态**。

```typescript
// route-detail-drawer.tsx 内部新增/修改的状态

// [修改] 替代 showOtherRoutes 的新状态
const [showAllOverlay, setShowAllOverlay] = useState(false)

// [新增] 智能默认逻辑
const shouldShowAllByDefault = validSiblingRoutes.length <= 3
const effectiveShowAll = shouldShowAllByDefault || showAllOverlay

// [复用] useMultiLineMode 判断逻辑调整
const useMultiLineMode = hasMultiLines && effectiveShowAll
```

### 4.2 切换联动时序图

```
用户点击图例项 "V5 飞燕走壁"
    │
    ├─① RouteLegendPanel → onRouteSelect(routeId)
    │
    ├─② RouteDetailDrawer.handleRouteSelect(routeId)
    │   ├── 从 siblingRoutes 中查找完整 Route 对象
    │   └── 调用 onRouteChange(newRoute)
    │
    ├─③ 父组件 (route-client.tsx)
    │   └── setSelectedRoute(newRoute)    // 触发 re-render
    │
    ├─④ RouteDetailDrawer re-render
    │   ├── route prop → 新的线路数据
    │   ├── routeColor → 新颜色
    │   ├── Topo 图片 → 不变（同一岩面）
    │   ├── MultiTopoLineOverlay → selectedRouteId 变化 → 高亮切换 + 画线动画
    │   ├── RouteLegendPanel → selectedRouteId 变化 → UI 更新
    │   └── 详情区域 → 显示新线路的名称/难度/描述/FA/setter/beta
    │
    └─⑤ useFaceImage(route) → 同一 faceId → 图片 URL 不变 → 无重新加载
```

**关键观察**: 由于同岩面线路共享同一张图片，`useFaceImage` 返回的 `src` 不会变化，**图片不会闪烁或重新加载**。这是整个设计成立的基础。

### 4.3 与现有 `onRouteChange` 机制的关系

`onRouteChange` 回调**已存在**且在两个调用点已正确连接：

| 调用点 | 文件 | 实现 |
|--------|------|------|
| route-client.tsx | `handleRouteChange` | `setSelectedRoute(route)` |
| search-drawer.tsx | `handleRouteChange` | `setSelectedRoute(route)` |

图例面板的切换会复用 `handleRouteSelect`（已存在于 drawer 中），它调用 `onRouteChange`。**无需修改父组件**。

## 5. 智能默认逻辑

### 5.1 决策矩阵

| 条件 | topo 叠加 | 图例面板 | "显示全部"按钮 |
|------|----------|---------|-------------|
| 同面线路 = 1 | 单线路模式 | 不显示 | — |
| 同面线路 = 2~3 | 默认全部显示 | 显示，无 toggle | — |
| 同面线路 > 3，用户未展开 | 仅焦点线路 | 显示，带 toggle | 显示 |
| 同面线路 > 3，用户已展开 | 全部显示 | 显示，toggle 变为"仅当前" | 隐藏 |

### 5.2 计数逻辑

```typescript
// validSiblingRoutes: 有 topoLine 的线路（可在 topo 上渲染的）
// 智能默认阈值
const SMART_DEFAULT_THRESHOLD = 3

const shouldShowAllByDefault = validSiblingRoutes.length <= SMART_DEFAULT_THRESHOLD
```

## 6. 修改清单

### 6.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/components/route-legend-panel.tsx` | 图例面板组件 |

### 6.2 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/route-detail-drawer.tsx` | ① 移除 Eye/EyeOff 按钮（drawer 内 + fullscreen 内）<br>② 移除 `showOtherRoutes` state，替换为 `showAllOverlay` + 智能默认逻辑<br>③ 在 topo 图与详情区之间插入 `<RouteLegendPanel>`<br>④ 调整 `useMultiLineMode` 逻辑<br>⑤ 移除 `Eye`/`EyeOff` import |
| `src/components/multi-topo-line-overlay.tsx` | 无需修改 — 已支持 `selectedRouteId` 动态切换 + 自动播放动画 |
| `src/components/topo-line-overlay.tsx` | 无需修改 — 作为 fallback 在单线路模式下使用 |
| `messages/zh.json` | 新增 `sameFaceRoutes` / `showAllRoutes` 翻译 key，可移除 `showOtherRoutes` / `hideOtherRoutes` |
| `messages/en.json` | 同上 |
| `messages/fr.json` | 同上 |

### 6.3 不修改的文件

| 文件 | 原因 |
|------|------|
| `route-client.tsx` | `handleRouteChange` + `siblingRoutes` 已满足需求 |
| `search-drawer.tsx` | 同上 |
| `editor/routes/page.tsx` | 保留编辑器的眼睛按钮不变 |
| `topo-constants.ts` | 无需新增常量 |
| `route-utils.ts` | `getSiblingRoutes` 逻辑不变 |

## 7. 视觉设计

### 7.1 图例面板 - 亮色主题

```
┌─────────────────────────────────────────────────┐
│  ● V3  猴子捞月                                  │ ← surface-variant bg,
│  ────────────────────────────────────────────── │    radius-lg
│  ○ V5  飞燕走壁                                  │
│  ────────────────────────────────────────────── │
│  ○ V2  小石头                                    │
└─────────────────────────────────────────────────┘
```

焦点行：
```css
background: color-mix(in srgb, var(--theme-primary) 8%, transparent);
border-left: 3px solid {gradeColor};  /* 可选: 左边框强调 */
```

### 7.2 图例面板 - 暗色主题 (Dracula)

保持同样的结构，利用 Dracula 配色变量自动适配。焦点行使用 `primary 12%` 混合 surface。

### 7.3 动画规格

| 动画 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 焦点切换高亮 | `background-color`, `opacity` | 200ms | `ease-out` |
| 线路画线动画 | `stroke-dashoffset` | 800ms | `ease-out` (已有) |
| 面板出现 | `opacity`, `transform` | 300ms | `ease-out` |

### 7.4 交互状态

```
默认:    文字 on-surface-variant, 圆点空心
Hover:   背景 primary/5，文字 on-surface (desktop only)
Active:  scale-[0.98]
焦点:    背景 primary/8，文字 on-surface + font-semibold，圆点实心
```

## 8. 边界情况

| 场景 | 行为 |
|------|------|
| 同面只有 1 条线路 | 不显示图例面板，单线路模式 |
| 同面 0 条有效 topo 线路 | 不显示图例面板 |
| 线路名称很长 | `truncate` 单行截断，`max-w` 限制 |
| 同面 >10 条线路 | 图例面板可滚动 (`max-h` + `overflow-y-auto`) |
| 切换线路时图片闪烁 | 不会 — 同 faceId 共享同一图片 URL |
| 从面板切换 → 再通过其他方式导航到不同线路 | `selectedRoute` 变化 → 面板自动更新焦点 |
| 线路无 faceId（fallback 到 area 匹配） | `getSiblingRoutes` 已处理，面板逻辑不受影响 |
| 面板项被点击但 `onRouteChange` 为 undefined | `handleRouteSelect` 已有 null check |

## 9. i18n 翻译

### 新增翻译 key

```json
// messages/zh.json - RouteDetail 命名空间
{
  "sameFaceRoutes": "同面线路",
  "showAllRoutes": "显示全部",
  "showCurrentOnly": "仅看当前"
}

// messages/en.json
{
  "sameFaceRoutes": "Routes on this face",
  "showAllRoutes": "Show all",
  "showCurrentOnly": "Current only"
}

// messages/fr.json
{
  "sameFaceRoutes": "Voies sur cette face",
  "showAllRoutes": "Tout afficher",
  "showCurrentOnly": "Actuelle uniquement"
}
```

### 可移除的翻译 key

- `showOtherRoutes` — 被 `showAllRoutes` 替代
- `hideOtherRoutes` — 被 `showCurrentOnly` 替代

> 注意：编辑器中的 `title` 属性使用硬编码中文（"隐藏其他线路" / "显示其他线路"），不受此次修改影响。

## 10. 实现步骤建议

```
Step 1: 创建 RouteLegendPanel 组件
        - 纯展示 + 事件回调
        - 支持焦点高亮、hover/active 状态
        - 智能默认阈值逻辑

Step 2: 集成到 RouteDetailDrawer
        - 移除 Eye/EyeOff 按钮 (drawer 内 + fullscreen 内)
        - 替换 showOtherRoutes → showAllOverlay + 智能默认
        - 插入 RouteLegendPanel 到 topo 图下方

Step 3: 更新翻译文件
        - 新增 3 个 key × 3 语言 = 9 条翻译
        - 移除 2 个旧 key × 3 语言 = 6 条翻译

Step 4: 更新测试
        - 修改 route-detail-drawer.test.tsx 中的 Eye 按钮测试
        - 添加 RouteLegendPanel 渲染和交互测试

Step 5: 验证
        - 同面 1/2/3/4+ 条线路的各种场景
        - 亮色/暗色主题
        - 移动端/桌面端
```

## 附录 A: 现有数据流参考

```
getSiblingRoutes(route, allRoutes)
  ├── 优先: cragId + faceId 匹配
  ├── 回退: cragId + area 匹配 (无 faceId 时)
  └── 过滤: topoLine.length >= 2

route-client.tsx
  ├── siblingRoutes = getSiblingRoutes(selectedRoute, cityFilteredRoutes)
  └── <RouteDetailDrawer siblingRoutes={siblingRoutes} onRouteChange={handleRouteChange} />

search-drawer.tsx
  ├── siblingRoutes = getSiblingRoutes(selectedRoute, allRoutes)
  └── <RouteDetailDrawer siblingRoutes={siblingRoutes} onRouteChange={handleRouteChange} />
```

## 附录 B: 相关文件索引

| 文件 | 职责 |
|------|------|
| `src/components/route-detail-drawer.tsx` | 线路详情抽屉（主改造目标） |
| `src/components/multi-topo-line-overlay.tsx` | 多线路 SVG 叠加层 |
| `src/components/topo-line-overlay.tsx` | 单线路 SVG 叠加层 |
| `src/lib/route-utils.ts` | `getSiblingRoutes` 兄弟线路查询 |
| `src/lib/tokens.ts` | `getGradeColor` 难度颜色映射 |
| `src/lib/topo-constants.ts` | Topo 渲染/动画常量 |
| `src/hooks/use-face-image.ts` | 岩面图片缓存 hook |
| `messages/*.json` | i18n 翻译文件 |
