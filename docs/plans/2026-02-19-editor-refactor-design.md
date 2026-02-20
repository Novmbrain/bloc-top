# Editor 重构设计文档

**日期**: 2026-02-19
**范围**: `apps/editor/src` 全部大型文件
**策略**: 方案 A+B — Hooks 提取业务逻辑 + 子组件拆分 JSX 面板

---

## 现状分析

| 文件 | 行数 | 主要问题 |
|------|------|----------|
| `app/faces/page.tsx` | 1167 | 7 个职责混合：R2加载、上传/压缩、删除、重命名、区域管理、双栏渲染、两个确认弹窗 |
| `app/routes/page.tsx` | 790 | 已部分重构（hooks 已提取），仍有大型左右栏 JSX inline |
| `app/cities/page.tsx` | 699 | 组件已有内部分层但全在一个文件，无独立测试 |
| `app/crags/[id]/page.tsx` | 600 | 编辑表单逻辑内联 |
| `app/betas/page.tsx` | 457 | CRUD handler 内联，无 hook 抽象 |

---

## 目标架构

```
apps/editor/src/
├── hooks/
│   ├── use-face-data.ts          [新建] R2 face列表加载 + CRUD (upload/delete/rename)
│   ├── use-face-upload.ts        [新建] 文件拖拽/选择 + 压缩 + 预览状态
│   ├── use-beta-management.ts    [新建] beta 编辑状态 + save/delete API 调用
│   ├── use-route-creation.ts     [已有]
│   ├── use-route-editor.ts       [已有]
│   ├── use-dirty-guard.ts        [已有]
│   └── use-crag-routes.ts        [已有]
└── components/editor/
    ├── face-list-panel.tsx       [新建] 左栏：area筛选器 + face列表
    ├── face-detail-panel.tsx     [新建] 右栏：查看已有face + 重命名 + 更换照片
    ├── face-creation-panel.tsx   [新建] 右栏：新建face表单 + 上传区
    ├── image-upload-zone.tsx     [新建] 可复用上传区（拖拽/点击/预览）
    ├── overwrite-confirm-dialog.tsx [新建] 覆盖确认弹窗
    ├── delete-face-dialog.tsx    [新建] 删除岩面确认弹窗
    ├── city-card.tsx             [新建] 城市行卡片组件
    ├── city-form-modal.tsx       [新建] 城市创建/编辑表单弹窗
    ├── prefecture-form-modal.tsx [新建] 地级市创建/编辑表单弹窗
    ├── confirm-dialog.tsx        [已有]
    ├── topo-preview.tsx          [已有]
    └── ...
```

---

## 测试策略

**原则**: 先写测试 → 验证当前行为 → 重构 → 确认测试通过

**测试框架**: Vitest + `@testing-library/react` (renderHook) + `vi.fn()` mock fetch

### 新增测试文件

#### `hooks/use-face-data.test.ts`

| 测试用例 | 验证点 |
|---------|--------|
| `loadFaces` - 成功 | 解析响应，更新 `r2Faces` 状态 |
| `loadFaces` - AbortError 被静默忽略 | 不更新状态，不抛出异常 |
| `handleDeleteFace` - 成功 | 缓存失效调用、本地状态移除、toast |
| `handleDeleteFace` - 失败 | 状态回滚，toast error |
| `handleRenameFace` - 成功 | 旧/新 faceId 缓存失效、routes 状态更新 |
| `handleRenameFace` - 格式不合法 | 早期返回，toast error |

#### `hooks/use-face-upload.test.ts`

| 测试用例 | 验证点 |
|---------|--------|
| `handleFile` - 非图片 | showToast error |
| `handleFile` - 图片 | 设置 previewUrl |
| `handleUpload` - 新建时校验 | faceId 空/格式错误时 setFormErrors |
| `doUpload` - 小文件 | 不压缩，直接 formData 上传 |
| `doUpload` - 大文件(>5MB) | 动态 import imageCompression，进度回调 |
| `doUpload` - 覆盖检测 | checkOnly=true 请求存在 → setShowOverwriteConfirm |

#### `hooks/use-beta-management.test.ts`

| 测试用例 | 验证点 |
|---------|--------|
| `handleSaveBeta` - 成功 | PATCH 请求，本地 betaLinks 更新 |
| `handleSaveBeta` - 失败 | toast error，状态不变 |
| `handleDeleteBeta` - 成功 | DELETE 请求，betaLinks 过滤 |
| `updateRouteAndSelected` | 同时更新 routes + selectedRoute |

#### `components/editor/city-form-modal.test.tsx`

| 测试用例 | 验证点 |
|---------|--------|
| 必填字段为空时提交 | toast "请填写必填字段" |
| 坐标格式非法 | toast "坐标格式无效" |
| 新建成功 | POST /api/cities, onSaved() 被调用 |
| 编辑成功 | PATCH /api/cities/:id, id 字段禁用 |

#### `components/editor/prefecture-form-modal.test.tsx`

| 测试用例 | 验证点 |
|---------|--------|
| 必填字段验证 | toast error |
| 保存成功（编辑） | PATCH 请求 + onSaved() |
| 保存成功（新建） | POST 请求 + onSaved() |

---

## 实施顺序

### Phase 1: 写测试（针对现有代码）

在任何重构前，先为以下逻辑写测试：
1. `faces/page.tsx` 中的 `faceGroups` useMemo 派生数据
2. `faces/page.tsx` 中的 `doUpload` / `handleDeleteFace` / `handleRenameFace`
3. `betas/page.tsx` 中的 `handleSaveBeta` / `handleDeleteBeta`
4. `cities/page.tsx` 中的 `CityFormModal` / `PrefectureFormModal`

### Phase 2: faces/page.tsx 重构

**2a** 提取 `use-face-upload.ts`（拖拽/压缩/上传逻辑，约 120 行）
**2b** 提取 `use-face-data.ts`（R2加载 + CRUD，约 150 行）
**2c** 提取 `ImageUploadZone` 组件（拖拽区 + 预览，约 60 行，面板间复用）
**2d** 提取 `FaceCreationPanel` + `FaceDetailPanel` + `FaceListPanel` 组件
**2e** 提取 `OverwriteConfirmDialog` + `DeleteFaceDialog`

### Phase 3: betas/page.tsx 重构

**3a** 提取 `use-beta-management.ts`（CRUD 状态 + handlers，约 100 行）
**3b** 提取左栏 `BetaRouteList` 组件，右栏 `BetaDetailPanel` 组件

### Phase 4: cities/page.tsx 重构

**4a** 将 `CityCard` 移至 `components/editor/city-card.tsx`
**4b** 将 `CityFormModal` 移至 `components/editor/city-form-modal.tsx`
**4c** 将 `PrefectureFormModal` 移至 `components/editor/prefecture-form-modal.tsx`

### Phase 5: crags/[id]/page.tsx 重构

**5a** 读取该文件，制定拆分方案（暂缓到 Phase 4 完成后）

---

## 关键约定

1. **每个 Phase 完成后运行** `pnpm --filter @bloctop/editor test:run` 确认测试通过
2. **Hook 命名**：`use-face-data.ts`（连字符）, 函数名 `useFaceData`（驼峰）
3. **组件文件位置**：全部在 `components/editor/` 下，不建子目录
4. **props 类型**：在组件文件内定义 interface，不抽独立 types 文件（避免过早抽象）
5. **测试文件位置**：紧靠被测文件（与 hooks/ 文件同目录）
