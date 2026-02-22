'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@bloctop/ui/components/input'
import { Drawer } from '@bloctop/ui/components/drawer'
import { useToast } from '@bloctop/ui/components/toast'

interface SearchUser {
  id: string
  name: string
  email: string
}

interface AddManagerDrawerProps {
  isOpen: boolean
  onClose: () => void
  cragId: string
  existingUserIds: Set<string>
  onAdded: () => void
}

/**
 * 添加管理员抽屉 — 邮箱搜索 + 添加权限
 *
 * 从 crag-permissions-panel.tsx 提取的独立组件。
 * 包含防抖搜索（400ms）、AbortController 请求取消、
 * 已有管理员过滤等完整逻辑。
 */
export function AddManagerDrawer({
  isOpen,
  onClose,
  cragId,
  existingUserIds,
  onAdded,
}: AddManagerDrawerProps) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup timer and abort in-flight request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
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
        // Abort previous in-flight search request to prevent stale results
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
          const res = await fetch(
            `/api/editor/search-users?q=${encodeURIComponent(value.trim())}`,
            { signal: controller.signal }
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
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          showToast('搜索用户失败', 'error')
          setResults([])
        } finally {
          if (!controller.signal.aborted) setIsSearching(false)
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
          showToast(data.error || '添加管理员失败', 'error')
          return
        }

        showToast(`已添加 ${user.name || user.email} 为管理员`, 'success')
        // Remove from search results
        setResults((prev) => prev.filter((u) => u.id !== user.id))
        onAdded()
      } catch {
        showToast('添加管理员失败', 'error')
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
      title="添加管理员"
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
              aria-label="清除搜索"
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
