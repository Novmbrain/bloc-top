# Routes + Betas 模块合并设计文档

**日期**: 2026-02-19
**范围**: `apps/editor/src/app/routes/page.tsx`（主要）+ `betas/page.tsx`（只读参考）
**动机**: 岩场管理者需要在 Routes / Betas / Faces 三个模块间反复选择同一个 crag→area→route，造成重复导航。将 Beta 视频管理内嵌到线路标注页，消除一次跳转。

---

## 用户故事

**现在**:
> 编辑者选好岩场 → 进入 Routes 页标注 Topo → 返回 Hub → 进入 Betas 页 → **重新选择同一岩场、区域、线路** → 编辑 Beta

**合并后**:
> 编辑者选好岩场 → 进入 Routes 页 → 选中线路 → 右栏 Tab 切换 → 直接编辑 Beta，无需返回 Hub

---

## 架构决策

### 方案选择：Tab 切换（已确认）

右栏线路编辑面板顶部加 Tab 栏，在 "Topo 标注" 和 "Beta 视频" 间切换。

**放弃的方案**:
- 折叠区块 — 两块内容同时可见，但 Topo 画布很高，会把 Beta 区块推到屏幕外，体验差
- 独立页面（二级路由） — 破坏现有的 URL 结构和 back 行为

### Phase 2 空岩面状态：内嵌上传（已确认）

当前区域无任何岩面照片时，Topo Tab 直接显示 `ImageUploadZone`，避免跳转到 Faces 模块。

---

## Phase 1 详细设计：Routes + Beta Tab

### 新增状态

```typescript
// routes/page.tsx 顶层
const [activeTab, setActiveTab] = useState<'topo' | 'beta'>('topo')

// 切换线路时重置 Tab
const handleSelectRoute = useCallback((route: Route) => {
  setSelectedRoute(route)
  setActiveTab('topo')      // ← 新增：切换线路时回到 Topo Tab
  setShowEditorPanel(true)
}, [...])
```

### 新增 import

```typescript
import { useBetaManagement } from '@/hooks/use-beta-management'
import { BetaCard } from '@/components/editor/beta-card'
import { BetaSubmitDrawer } from '@/components/beta-submit-drawer'
import { Play } from 'lucide-react'
```

### Hook 接入

```typescript
const {
  editingBetaId, setEditingBetaId,
  editForm, setEditForm,
  isSaving, deletingBetaId,
  handleStartEdit, handleSaveBeta, handleDeleteBeta,
} = useBetaManagement({ setRoutes })

const [showBetaSubmitDrawer, setShowBetaSubmitDrawer] = useState(false)

const handleBetaSubmitSuccess = useCallback((newBeta: BetaLink) => {
  if (!selectedRoute) return
  setRoutes(prev => prev.map(r =>
    r.id === selectedRoute.id
      ? { ...r, betaLinks: [...(r.betaLinks || []), newBeta] }
      : r
  ))
  setSelectedRoute(prev => prev && prev.id === selectedRoute.id
    ? { ...prev, betaLinks: [...(prev.betaLinks || []), newBeta] }
    : prev
  )
}, [selectedRoute, setRoutes])
```

### Tab 栏 UI（插入到路线标题 div 之后）

```tsx
{/* Tab 切换 */}
<div className="flex glass-light rounded-xl p-1 gap-1">
  {(['topo', 'beta'] as const).map(tab => {
    const label = tab === 'topo' ? 'Topo 标注' : `Beta 视频${selectedRoute.betaLinks?.length ? ` (${selectedRoute.betaLinks.length})` : ''}`
    return (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: activeTab === tab ? 'var(--theme-primary)' : undefined,
          color: activeTab === tab ? 'var(--theme-on-primary)' : 'var(--theme-on-surface-variant)',
        }}
      >
        {label}
      </button>
    )
  })}
</div>
```

### Beta Tab 内容（复用 betas/page.tsx 的右栏逻辑）

```tsx
{activeTab === 'beta' && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
        Beta 视频 ({selectedRoute.betaLinks?.length || 0})
      </h3>
      <button onClick={() => setShowBetaSubmitDrawer(true)} ...>
        <Plus className="w-4 h-4" /> 添加 Beta
      </button>
    </div>
    {/* BetaCard 列表或空状态 */}
  </div>
)}
```

### 放置位置

在 `rightPanel` const 的路线编辑面板分支（第 538 行开始的 `<div className="space-y-4">`）中：

```
路线标题 header
↓
[新增] Tab 切换栏
↓
{activeTab === 'topo' && (
  岩面选择器
  Topo 画布
  线路信息编辑表单
  保存/删除按钮
)}
{activeTab === 'beta' && (
  Beta 列表
)}
```

---

## Phase 2 详细设计：Topo Tab 内嵌岩面上传

### 触发条件

```typescript
const showInlineUpload = activeTab === 'topo'
  && !isLoadingFaces
  && areaFaceGroups.length === 0
  && !!selectedRoute
```

### 内嵌 UI（替换原来的 FaceSelector + 空 TopoPreview）

```tsx
{showInlineUpload ? (
  <InlineFaceUpload
    cragId={selectedCragId!}
    area={selectedRoute.area}
    onUploadSuccess={(newFaceId) => {
      setR2Faces(prev => [...prev, { faceId: newFaceId, area: selectedRoute.area }])
      editor.handleFaceSelect(newFaceId)
      editor.handleOpenFullscreen()
    }}
  />
) : (
  <>
    <FaceSelector ... />
    <TopoPreview ... />
  </>
)}
```

### InlineFaceUpload 组件

新建 `apps/editor/src/components/editor/inline-face-upload.tsx`：

```typescript
interface InlineFaceUploadProps {
  cragId: string
  area: string                              // 只读，来自 selectedRoute.area
  onUploadSuccess: (faceId: string) => void
}
```

内部复用 `useFaceUpload` hook，简化版（只支持新建，不支持覆盖确认）：
- `ImageUploadZone`（拖拽/点击上传 + 预览）
- faceId 文本输入（格式：小写英文+连字符，如 `zhu-qiang`）
- 区域显示（只读 badge）
- [上传并开始标注] 按钮

---

## 文件变更清单

| 文件 | 变更 | 行数影响 |
|------|------|---------|
| `routes/page.tsx` | 新增 Tab UI + Beta 内容块 + hook 接入 | +150 行 |
| `components/editor/inline-face-upload.tsx` | 新建（Phase 2） | +100 行 |
| `betas/page.tsx` | 不变（继续保留作为独立入口） | 0 |

---

## 测试策略

### 新增测试

**`routes/page.tsx` 相关（集成）**:
- Tab 默认为 `topo`
- 切换 `selectedRoute` 后 Tab 重置为 `topo`
- Tab 计数正确反映 `betaLinks.length`

**`inline-face-upload.tsx`（单元）**:
- faceId 格式校验（拒绝含空格/大写）
- 上传成功时调用 `onUploadSuccess(faceId)`
- 上传失败显示 toast error

---

## 实施顺序

1. **Phase 1a**: 新增 `activeTab` 状态 + Tab 栏 UI（仅切换器，无内容）
2. **Phase 1b**: 接入 `useBetaManagement` + Beta Tab 内容
3. **Phase 1c**: 写测试验证 Tab 行为
4. **Phase 2a**: 新建 `InlineFaceUpload` 组件 + 写测试
5. **Phase 2b**: 在 `routes/page.tsx` 集成 `showInlineUpload` 逻辑
