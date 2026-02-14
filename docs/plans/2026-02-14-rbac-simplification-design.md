# RBAC 简化设计：合并角色体系

## 目标

将当前 3 用户角色 × 2 岩场角色 简化为 2 × 1，降低用户理解成本。

## 简化后角色体系

### 用户级 (`user.role`)

| 角色 | UI 标签 | 能力 |
|------|---------|------|
| `admin` | 系统管理员 | 创建岩场、管理用户、分配岩场管理员、编辑所有岩场 |
| `user` | 普通用户 | 浏览；被分配为岩场管理员后可编辑该岩场 |

删除 `crag_creator` 角色。

### 岩场级 (`crag_permissions.role`)

| 角色 | UI 标签 | 能力 |
|------|---------|------|
| `manager` | 管理员 | 编辑岩场信息、线路、岩面、Beta |

删除 `creator` 角色。权限管理（添加/移除管理员）仅 admin 可操作。

## 需要修改的文件

### 类型定义
- `src/types/index.ts` — `UserRole` 去掉 `'crag_creator'`，`CragPermissionRole` 去掉 `'creator'`

### 权限函数
- `src/lib/permissions.ts`
  - 删除 `roles.crag_creator` AC 定义
  - `canCreateCrag` → 仅 admin
  - `canAccessEditor` → 去掉 crag_creator 分支
  - `canDeleteCrag` → 仅 admin（已是）
  - `canManagePermissions` → 仅 admin（去掉 creator 检查）

### API 路由
- `src/app/api/crags/route.ts` — POST 创建岩场：仅 admin
- `src/app/api/crag-permissions/route.ts` — POST/DELETE：仅 admin
- `src/app/api/editor/crags/route.ts` — badge 逻辑调整

### UI 页面
- `src/app/[locale]/editor/crags/page.tsx` — badge 标签：系统管理员 / 管理员
- `src/app/[locale]/editor/users/page.tsx` — 角色选择：2 个选项（admin / user）
- `src/components/editor/crag-permissions-panel.tsx` — 去掉 creator/manager 区分

### 测试
- `src/lib/permissions.test.ts` — 更新角色测试用例
- `src/app/api/editor/crags/route.test.ts` — 更新测试
- `src/app/api/crags/[id]/areas/route.test.ts` — 更新 crag_creator 引用

### 数据库迁移
- `crag_permissions` 集合：将所有 `role: 'creator'` 更新为 `role: 'manager'`
- `user` 集合：将所有 `role: 'crag_creator'` 更新为 `role: 'user'`

### 文档
- `CLAUDE.md` — 更新 RBAC 章节
- `doc/RBAC_DESIGN.md` — 更新角色定义
- `doc/AUTH_SYSTEM.md` — 更新 RBAC 部分
