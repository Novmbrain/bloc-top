'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { AppTabbar } from '@/components/app-tabbar'
import { useToast } from '@/components/ui/toast'
import { useSession } from '@/lib/auth-client'
import { authClient } from '@/lib/auth-client'
import { useRouter } from '@/i18n/navigation'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import type { UserRole } from '@/types'

const PAGE_SIZE = 20

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: '系统管理员', variant: 'default' },
  user: { label: '普通用户', variant: 'outline' },
}

interface UserItem {
  id: string
  name: string
  email: string
  image: string | null
  role: string
  createdAt: string
  banned: boolean
}

export default function UserManagementPage() {
  useBreakAppShellLimit()
  const { showToast } = useToast()
  const { data: session, isPending: isSessionPending } = useSession()
  const router = useRouter()
  const userRole = (session?.user as { role?: string })?.role || 'user'

  // Admin guard
  useEffect(() => {
    if (!isSessionPending && userRole !== 'admin') {
      router.replace('/editor')
    }
  }, [isSessionPending, userRole, router])

  // Data state
  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Role change state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [changingRole, setChangingRole] = useState(false)

  // Fetch users
  const fetchUsers = useCallback(async (search: string, pageOffset: number) => {
    setLoading(true)
    try {
      const { data } = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset: pageOffset,
          ...(search ? { searchValue: search, searchField: 'email' as const, searchOperator: 'contains' as const } : {}),
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
      })
      if (data) {
        // better-auth User type is close to UserItem but includes extra fields; safe to cast
        setUsers(data.users as unknown as UserItem[])
        setTotal(data.total)
      }
    } catch {
      showToast('加载用户列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Initial load
  useEffect(() => {
    if (!isSessionPending && userRole === 'admin') {
      fetchUsers('', 0)
    }
  }, [isSessionPending, userRole, fetchUsers])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setOffset(0)
      fetchUsers(value, 0)
    }, 300)
  }

  // Pagination
  const handlePrev = () => {
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    setOffset(newOffset)
    fetchUsers(searchQuery, newOffset)
  }
  const handleNext = () => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchUsers(searchQuery, newOffset)
  }

  // Role change
  const handleSetRole = async (role: UserRole) => {
    if (!selectedUser) return
    setChangingRole(true)
    try {
      await authClient.admin.setRole({
        userId: selectedUser.id,
        role: role as 'user' | 'admin',
      })
      showToast(`已将 ${selectedUser.email} 的角色设为 ${ROLE_CONFIG[role].label}`, 'success')
      setSelectedUser(null)
      // Refresh list
      fetchUsers(searchQuery, offset)
    } catch {
      showToast('修改角色失败', 'error')
    } finally {
      setChangingRole(false)
    }
  }

  // Loading / guard states
  if (isSessionPending || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--theme-primary)' }} />
      </div>
    )
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <EditorPageHeader
        title="用户管理"
        icon={<Users className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={false}
        onBackToList={() => {}}
        listLabel="用户列表"
      />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--theme-on-surface-variant)' }} />
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="搜索邮箱..."
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
          共 {total} 位用户 {searchQuery && `(搜索: "${searchQuery}")`}
        </p>

        {/* User List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--theme-primary)' }} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
            {searchQuery ? '无匹配用户' : '暂无用户'}
          </p>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <UserCard
                key={user.id}
                user={user}
                isCurrentUser={user.id === session?.user?.id}
                onChangeRole={() => setSelectedUser(user)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePrev}
              disabled={offset === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all disabled:opacity-30"
              style={{ color: 'var(--theme-primary)' }}
            >
              <ChevronLeft className="w-4 h-4" /> 上一页
            </button>
            <span className="text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={offset + PAGE_SIZE >= total}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all disabled:opacity-30"
              style={{ color: 'var(--theme-primary)' }}
            >
              下一页 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Role Change Drawer */}
      {selectedUser && (
        <RoleChangeDrawer
          user={selectedUser}
          isChanging={changingRole}
          onSelect={handleSetRole}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}

// ==================== User Card ====================

function UserCard({
  user,
  isCurrentUser,
  onChangeRole,
}: {
  user: UserItem
  isCurrentUser: boolean
  onChangeRole: () => void
}) {
  const role = (user.role || 'user') as UserRole
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.user

  return (
    <div
      className="glass-light p-4 flex items-center justify-between"
      style={{ borderRadius: 'var(--theme-radius-lg)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate" style={{ color: 'var(--theme-on-surface)' }}>
            {user.name || '未设置'}
          </span>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--theme-on-surface-variant)' }}>
          {user.email}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.7 }}>
          注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      <button
        onClick={onChangeRole}
        disabled={isCurrentUser}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 disabled:opacity-30"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
          color: 'var(--theme-primary)',
        }}
        title={isCurrentUser ? '不能修改自己的角色' : '修改角色'}
      >
        <Shield className="w-3.5 h-3.5" />
        修改角色
      </button>
    </div>
  )
}

// ==================== Role Change Drawer ====================

function RoleChangeDrawer({
  user,
  isChanging,
  onSelect,
  onClose,
}: {
  user: UserItem
  isChanging: boolean
  onSelect: (role: UserRole) => void
  onClose: () => void
}) {
  const currentRole = (user.role || 'user') as UserRole
  const roles: UserRole[] = ['admin', 'user']

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-heavy w-full max-w-lg p-6 animate-drawer-in"
        style={{ borderRadius: 'var(--theme-radius-xl) var(--theme-radius-xl) 0 0' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>
            修改角色
          </h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--theme-on-surface-variant)' }}>
          {user.name || user.email}
        </p>

        <div className="space-y-2">
          {roles.map(role => {
            const config = ROLE_CONFIG[role]
            const isActive = role === currentRole
            return (
              <button
                key={role}
                onClick={() => onSelect(role)}
                disabled={isChanging || isActive}
                className="w-full p-4 rounded-xl text-left transition-all active:scale-[0.99] disabled:opacity-50"
                style={{
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--theme-primary) 20%, transparent)'
                    : 'var(--theme-surface)',
                  border: isActive ? '1px solid var(--theme-primary)' : '1px solid transparent',
                  color: 'var(--theme-on-surface)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{config.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-on-surface-variant)' }}>
                      {role === 'admin' && '全部权限：创建岩场、管理用户、分配岩场管理员'}
                      {role === 'user' && '浏览为主，被分配为岩场管理员后可编辑对应岩场'}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-xs font-medium" style={{ color: 'var(--theme-primary)' }}>
                      当前
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {isChanging && (
          <div className="flex justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--theme-primary)' }} />
          </div>
        )}
      </div>
    </div>
  )
}
