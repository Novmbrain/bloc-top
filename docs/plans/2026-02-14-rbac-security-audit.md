# RBAC 安全审计计划：验证岩场级权限隔离

## 背景

验证一个被分配了特定岩场管理权限的用户（manager 或 creator），是否能够修改自己**没有权限**的岩场。

## Phase 0: 代码审计发现（已完成）

### 权限检查函数 (`src/lib/permissions.ts`)

| 函数 | 用途 | 逻辑 |
|------|------|------|
| `canEditCrag(userId, cragId, role)` | 编辑岩场/线路/岩面 | admin → true; 查 crag_permissions; fallback 查 crags.createdBy |
| `canDeleteCrag(userId, cragId, role)` | 删除岩场 | admin → true; 仅 creator 角色 |
| `canManagePermissions(userId, cragId, role)` | 管理权限 | 同 canDeleteCrag |
| `getEditableCragIds(userId, role)` | 编辑器列表过滤 | admin → 'all'; 查所有 crag_permissions |

### 受保护的 API 路由（全部已验证）

- `PATCH /api/crags/[id]` — canEditCrag ✅
- `PATCH /api/crags/[id]/areas` — canEditCrag ✅
- `POST /api/routes` — canEditCrag(cragId from body) ✅
- `PATCH/DELETE /api/routes/[id]` — canEditCrag(cragId from existing route) ✅
- `GET/PATCH/DELETE /api/faces` — canEditCrag ✅
- `POST /api/upload` — canEditCrag ✅
- `PATCH/DELETE /api/beta` — canEditCrag(cragId from route lookup) ✅

### 潜在关注点

1. **`canEditCrag` 的 createdBy fallback**：如果用户恰好是某个岩场的 `createdBy` 但没有 permission 记录，仍可编辑——这是设计意图，非 bug
2. **cragId 来源可信性**：部分路由的 cragId 来自请求体（POST /api/routes），理论上用户可构造任意 cragId，但 `canEditCrag` 会在数据库层面验证
3. **Beta 和 Route 的间接查询**：PATCH/DELETE beta 先查 route 获取 cragId，再检查权限——如果 route 不存在会返回 404，不会绕过

---

## Phase 1: 编写权限隔离单元测试

**目标**: 在 `src/lib/permissions.test.ts` 中增加专门的"越权访问"测试用例

### 测试场景

```
场景 A: manager 尝试编辑无权限的岩场
  - 用户 U1 是 crag-A 的 manager
  - U1 调用 canEditCrag(U1, crag-B, 'user') → 应返回 false

场景 B: creator 尝试编辑无权限的岩场
  - 用户 U2 是 crag-A 的 creator
  - U2 调用 canEditCrag(U2, crag-B, 'crag_creator') → 应返回 false

场景 C: creator 尝试删除无权限的岩场
  - U2 调用 canDeleteCrag(U2, crag-B, 'crag_creator') → 应返回 false

场景 D: manager 尝试管理权限
  - U1 (manager of crag-A) 调用 canManagePermissions(U1, crag-A, 'user') → 应返回 false

场景 E: getEditableCragIds 只返回有权限的岩场
  - U1 有 crag-A 和 crag-C 的权限
  - getEditableCragIds(U1, 'user') → 应只返回 ['crag-A', 'crag-C']

场景 F: createdBy fallback 不应跨岩场泄漏
  - U3 是 crag-A 的 createdBy（但无 permission 记录）
  - canEditCrag(U3, crag-B, 'user') → 应返回 false（crag-B 的 createdBy 不是 U3）
```

### 文件
- 修改: `src/lib/permissions.test.ts`
- 参考现有 mock 模式（已有 mockCollection, vi.mock 等）

### 验证
- `npm run test:run -- src/lib/permissions.test.ts` 全部通过

---

## Phase 2: 编写 API 级集成测试

**目标**: 模拟真实 HTTP 请求，验证 API 层面的权限隔离

### 测试文件
- 新建: `src/app/api/routes/route.security.test.ts`（或在现有测试文件中添加）

### 测试场景

```
场景 1: Manager 创建线路到无权限岩场
  POST /api/routes { cragId: 'unauthorized-crag', ... }
  → 期望 403

场景 2: Manager 更新属于无权限岩场的线路
  PATCH /api/routes/[id] { name: 'hacked' }
  (其中 route 属于 unauthorized-crag)
  → 期望 403

场景 3: Manager 删除属于无权限岩场的线路
  DELETE /api/routes/[id]
  → 期望 403

场景 4: Manager 上传图片到无权限岩场
  POST /api/upload { cragId: 'unauthorized-crag' }
  → 期望 403

场景 5: Manager 修改无权限岩场的 areas
  PATCH /api/crags/[id]/areas
  → 期望 403
```

### Mock 策略
- Mock `requireAuth` 返回 `{ userId: 'test-user', role: 'user' }`
- Mock `canEditCrag` / DB 层，让 test-user 仅对 'crag-A' 有权限
- 参考现有测试: `src/app/api/editor/crags/route.test.ts`

### 验证
- `npm run test:run -- route.security.test` 全部通过

---

## Phase 3: 手动渗透测试脚本（可选）

**目标**: 在开发环境中用真实 HTTP 请求验证

### 测试步骤

1. 启动 dev server (`npm run dev`)
2. 用测试账号登录，确认该账号是某岩场的 manager
3. 用 curl/httpie 携带 session cookie，尝试：

```bash
# 尝试修改无权限岩场
curl -X PATCH http://localhost:3000/api/crags/OTHER_CRAG_ID \
  -H "Cookie: $SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "hacked"}'
# 期望: 403

# 尝试给无权限岩场添加线路
curl -X POST http://localhost:3000/api/routes \
  -H "Cookie: $SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"cragId": "OTHER_CRAG_ID", "name": "test", "grade": "V0"}'
# 期望: 403
```

### 验证
- 所有请求返回 403 `{ success: false, error: '权限不足' }`

---

## Phase 4: 总结报告

### 验证清单

- [ ] 单元测试：6 个越权场景全部返回 false/拒绝
- [ ] API 测试：5 个越权请求全部返回 403
- [ ] （可选）手动渗透测试通过
- [ ] 无 anti-pattern：grep 确认没有遗漏 canEditCrag 检查的变更路由

### Anti-pattern 检查命令

```bash
# 查找所有 PATCH/POST/DELETE handler，确认都有 canEditCrag 或 canDeleteCrag
grep -n "canEditCrag\|canDeleteCrag\|canManagePermissions" src/app/api/**/*.ts

# 查找可能遗漏权限检查的变更路由（有 requireAuth 但没有 canEdit*）
grep -rn "requireAuth" src/app/api/ --include="*.ts" -l
```

---

## 执行建议

- **Phase 1 最重要**：单元测试覆盖权限函数的隔离性，成本低、价值高
- **Phase 2 推荐执行**：API 级测试是防回归的关键防线
- **Phase 3 可选**：手动测试适合最终验收，但自动化测试更可靠
