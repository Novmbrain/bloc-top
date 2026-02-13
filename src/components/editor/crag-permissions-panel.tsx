'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users,
  Search,
  Plus,
  Loader2,
  X,
  Trash2,
  Crown,
  UserCog,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Drawer } from '@/components/ui/drawer'
import { useToast } from '@/components/ui/toast'
import type { CragPermissionRole } from '@/types'

// ==================== Types ====================

interface PermissionUser {
  name: string
  email: string
}

interface PermissionRecord {
  userId: string
  cragId: string
  role: CragPermissionRole
  assignedBy: string
  createdAt: string
  user: PermissionUser
}

interface SearchUser {
  id: string
  name: string
  email: string
}

// ==================== Props ====================

interface CragPermissionsPanelProps {
  cragId: string
  canManage: boolean
}

// ==================== PermissionRow ====================

function PermissionRow({
  permission,
  canManage,
  onRemove,
  isRemoving,
}: {
  permission: PermissionRecord
  canManage: boolean
  onRemove: (userId: string) => void
  isRemoving: boolean
}) {
  const isCreator = permission.role === 'creator'

  return (
    <div
      className="flex items-center justify-between gap-3 p-3 transition-all duration-200"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderRadius: 'var(--theme-radius-lg)',
      }}
    >
      {/* User info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isCreator
              ? 'color-mix(in srgb, var(--theme-warning) 20%, transparent)'
              : 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
          }}
        >
          {isCreator ? (
            <Crown
              className="w-4 h-4"
              style={{ color: 'var(--theme-warning)' }}
            />
          ) : (
            <UserCog
              className="w-4 h-4"
              style={{ color: 'var(--theme-primary)' }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--theme-on-surface)' }}
            >
              {permission.user.name || permission.user.email}
            </span>
            <Badge
              className="shrink-0 text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: isCreator
                  ? 'color-mix(in srgb, var(--theme-warning) 20%, transparent)'
                  : 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
                color: isCreator
                  ? 'var(--theme-warning)'
                  : 'var(--theme-primary)',
                border: 'none',
              }}
            >
              {isCreator ? '创建者' : '管理者'}
            </Badge>
          </div>
          <p
            className="text-xs truncate"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            {permission.user.email}
          </p>
        </div>
      </div>

      {/* Remove button (only for managers, and only if canManage) */}
      {canManage && !isCreator && (
        <button
          type="button"
          onClick={() => onRemove(permission.userId)}
          disabled={isRemoving}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-50"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
          }}
          aria-label="移除权限"
        >
          {isRemoving ? (
            <Loader2
              className="w-3.5 h-3.5 animate-spin"
              style={{ color: 'var(--theme-error)' }}
            />
          ) : (
            <Trash2
              className="w-3.5 h-3.5"
              style={{ color: 'var(--theme-error)' }}
            />
          )}
        </button>
      )}
    </div>
  )
}

// ==================== AddManagerDrawer ====================

function AddManagerDrawer({
  isOpen,
  onClose,
  cragId,
  existingUserIds,
  onAdded,
}: {
  isOpen: boolean
  onClose: () => void
  cragId: string
  existingUserIds: Set<string>
  onAdded: () => void
}) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (!value.trim() || value.trim().length < 2) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/editor/search-users?q=${encodeURIComponent(value.trim())}`
          )
          const data = await res.json()
          if (data.success) {
            // Filter out users who already have permissions
            const filtered = (data.users as SearchUser[]).filter(
              (u) => !existingUserIds.has(u.id)
            )
            setResults(filtered)
          } else {
            setResults([])
          }
        } catch {
          showToast('搜索用户失败', 'error')
          setResults([])
        } finally {
          setIsSearching(false)
        }
      }, 400)
    },
    [existingUserIds, showToast]
  )

  // Add manager
  const handleAdd = useCallback(
    async (user: SearchUser) => {
      setAddingUserId(user.id)

      try {
        const res = await fetch('/api/crag-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            cragId,
            role: 'manager',
          }),
        })

        const data = await res.json()
        if (!data.success) {
          showToast(data.error || '添加管理者失败', 'error')
          return
        }

        showToast(`已添加 ${user.name || user.email} 为管理者`, 'success')
        // Remove from search results
        setResults((prev) => prev.filter((u) => u.id !== user.id))
        onAdded()
      } catch {
        showToast('添加管理者失败', 'error')
      } finally {
        setAddingUserId(null)
      }
    },
    [cragId, showToast, onAdded]
  )

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setIsSearching(false)
    }
  }, [isOpen])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      height="half"
      showHandle
      title="添加管理者"
      showCloseButton
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          />
          <Input
            variant="search"
            value={query}
            onChange={handleSearch}
            placeholder="搜索邮箱..."
            style={{
              backgroundColor: 'var(--theme-surface)',
              color: 'var(--theme-on-surface)',
              borderRadius: 'var(--theme-radius-xl)',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X
                className="w-4 h-4"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              />
            </button>
          )}
        </div>

        {/* Search hint */}
        {!query && (
          <p
            className="text-xs text-center py-4"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            输入邮箱搜索用户 (至少 2 个字符)
          </p>
        )}

        {/* Loading */}
        {isSearching && (
          <div className="flex items-center justify-center py-6">
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: 'var(--theme-primary)' }}
            />
          </div>
        )}

        {/* Results */}
        {!isSearching && query.length >= 2 && results.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            未找到匹配的用户
          </p>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-2">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 p-3"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderRadius: 'var(--theme-radius-lg)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--theme-on-surface)' }}
                  >
                    {user.name || user.email}
                  </p>
                  {user.name && (
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--theme-on-surface-variant)' }}
                    >
                      {user.email}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAdd(user)}
                  disabled={addingUserId === user.id}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                    color: 'var(--theme-on-primary)',
                  }}
                >
                  {addingUserId === user.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    '添加'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ==================== CragPermissionsPanel ====================

export function CragPermissionsPanel({
  cragId,
  canManage,
}: CragPermissionsPanelProps) {
  const { showToast } = useToast()
  const [permissions, setPermissions] = useState<PermissionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/crag-permissions?cragId=${encodeURIComponent(cragId)}`
      )
      const data = await res.json()
      if (data.success) {
        setPermissions(data.permissions)
      }
    } catch {
      // Silent fail on initial load — panel will show empty state
    } finally {
      setIsLoading(false)
    }
  }, [cragId])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Remove manager
  const handleRemove = useCallback(
    async (userId: string) => {
      setRemovingUserId(userId)

      try {
        const res = await fetch('/api/crag-permissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cragId }),
        })

        const data = await res.json()
        if (!data.success) {
          showToast(data.error || '移除失败', 'error')
          return
        }

        showToast('已移除管理者', 'success')
        setPermissions((prev) => prev.filter((p) => p.userId !== userId))
      } catch {
        showToast('移除失败', 'error')
      } finally {
        setRemovingUserId(null)
      }
    },
    [cragId, showToast]
  )

  // Existing user IDs for filtering search results
  const existingUserIds = new Set(permissions.map((p) => p.userId))

  // Sort: creators first, then managers
  const sortedPermissions = [...permissions].sort((a, b) => {
    if (a.role === 'creator' && b.role !== 'creator') return -1
    if (a.role !== 'creator' && b.role === 'creator') return 1
    return 0
  })

  return (
    <div
      className="glass-light p-4 space-y-4"
      style={{
        borderRadius: 'var(--theme-radius-xl)',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users
            className="w-4 h-4"
            style={{ color: 'var(--theme-primary)' }}
          />
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            权限管理
          </h3>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
              color: 'var(--theme-primary)',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            添加管理者
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: 'var(--theme-primary)' }}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && permissions.length === 0 && (
        <div
          className="text-center py-6"
          style={{ color: 'var(--theme-on-surface-variant)' }}
        >
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">暂无权限记录</p>
        </div>
      )}

      {/* Permission rows */}
      {!isLoading && sortedPermissions.length > 0 && (
        <div className="space-y-2">
          {sortedPermissions.map((perm) => (
            <PermissionRow
              key={perm.userId}
              permission={perm}
              canManage={canManage}
              onRemove={handleRemove}
              isRemoving={removingUserId === perm.userId}
            />
          ))}
        </div>
      )}

      {/* Add manager drawer */}
      {canManage && (
        <AddManagerDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          cragId={cragId}
          existingUserIds={existingUserIds}
          onAdded={fetchPermissions}
        />
      )}
    </div>
  )
}
