import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/admin/access'
import type { CragPermission } from '@/types'
import { getDatabase } from '@/lib/mongodb'

// ============ Access Control 定义 ============

const statement = {
  ...defaultStatements,
  editor: ["access"] as const,
  crag:   ["create", "update", "delete"] as const,
  route:  ["create", "update", "delete"] as const,
  face:   ["upload", "rename", "delete"] as const,
  beta:   ["approve", "delete"] as const,
} as const

export const ac = createAccessControl(statement)

export const roles = {
  user: ac.newRole({}),

  crag_creator: ac.newRole({
    editor: ["access"],
    crag:   ["create", "update"],
    route:  ["create", "update", "delete"],
    face:   ["upload", "rename", "delete"],
    beta:   ["approve", "delete"],
  }),

  admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
    editor: ["access"],
    crag:   ["create", "update", "delete"],
    route:  ["create", "update", "delete"],
    face:   ["upload", "rename", "delete"],
    beta:   ["approve", "delete"],
  }),
}

// ============ 纯函数 — 无 DB 依赖 ============

/**
 * 判断用户是否可以创建岩场
 */
export function canCreateCrag(userRole: string): boolean {
  return userRole === 'admin' || userRole === 'crag_creator'
}

// ============ DB 查询权限函数 ============

/**
 * 判断用户是否可以编辑指定岩场
 * admin 可编辑所有岩场；creator/manager 可编辑被分配的岩场
 */
export async function canEditCrag(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection<CragPermission>('crag_permissions').findOne({ userId, cragId })
  return perm !== null
}

/**
 * 判断用户是否可以删除指定岩场
 * 只有 admin 和岩场 creator 可以删除
 */
export async function canDeleteCrag(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection<CragPermission>('crag_permissions').findOne({ userId, cragId, role: 'creator' })
  return perm !== null
}

/**
 * 判断用户是否可以管理岩场权限（分配/移除 manager）
 * 只有 admin 和岩场 creator 可以
 */
export async function canManagePermissions(userId: string, cragId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin') return true
  const db = await getDatabase()
  const perm = await db.collection<CragPermission>('crag_permissions').findOne({ userId, cragId, role: 'creator' })
  return perm !== null
}

/**
 * 判断用户是否可以进入编辑器
 * admin/crag_creator 始终可以；有任意 crag_permission 的 user 也可以
 */
export async function canAccessEditor(userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'admin' || userRole === 'crag_creator') return true
  const db = await getDatabase()
  const perm = await db.collection<CragPermission>('crag_permissions').findOne({ userId })
  return perm !== null
}

/**
 * 获取用户可编辑的岩场 ID 列表
 * admin 返回 'all'；其他用户返回 crag_permissions 中的 cragId 列表
 */
export async function getEditableCragIds(userId: string, userRole: string): Promise<string[] | 'all'> {
  if (userRole === 'admin') return 'all'
  const db = await getDatabase()
  const perms = await db.collection<CragPermission>('crag_permissions').find({ userId }).toArray()
  return perms.map(p => p.cragId)
}
