'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ArrowLeft,
  Search,
  X,
  Play,
  Loader2,
  Mountain,
  ExternalLink,
  Pencil,
  Trash2,
  Save,
  Plus,
  BookHeart,
  Ruler,
  MoveHorizontal,
  User,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { AppTabbar } from '@/components/app-tabbar'
import { Input } from '@/components/ui/input'
import type { Route, BetaLink } from '@/types'
import { getGradeColor } from '@/lib/tokens'
import { useToast } from '@/components/ui/toast'
import { matchRouteByQuery } from '@/hooks/use-route-search'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { CragSelector } from '@/components/editor/crag-selector'
import { RouteCard } from '@/components/editor/route-card'
import { deriveAreas } from '@/lib/editor-areas'
import { BETA_PLATFORMS } from '@/lib/beta-constants'
import { BetaSubmitDrawer } from '@/components/beta-submit-drawer'

/**
 * Beta 管理页面
 * 左栏：岩场/线路选择，右栏：Beta 列表编辑
 */
export default function BetaEditorPage() {
  const {
    crags, routes, setRoutes, selectedCragId, setSelectedCragId,
    isLoadingCrags, isLoadingRoutes, stats,
  } = useCragRoutes()

  // ============ 选择状态 ============
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ============ 编辑状态 ============
  const [editingBetaId, setEditingBetaId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string; author: string; climberHeight: string; climberReach: string
  }>({ title: '', author: '', climberHeight: '', climberReach: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingBetaId, setDeletingBetaId] = useState<string | null>(null)

  // ============ 添加 Beta ============
  const [showSubmitDrawer, setShowSubmitDrawer] = useState(false)

  // ============ UI 状态 ============
  const [showRightPanel, setShowRightPanel] = useState(false)

  const { showToast } = useToast()

  // ============ 桌面端突破 app-shell 宽度限制 ============
  useEffect(() => {
    const shell = document.getElementById('app-shell')
    if (!shell) return
    const original = shell.style.maxWidth
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = (mq: MediaQueryList | MediaQueryListEvent) => {
      shell.style.maxWidth = mq.matches ? 'none' : original
    }
    update(mediaQuery)
    mediaQuery.addEventListener('change', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
      shell.style.maxWidth = original
    }
  }, [])

  // ============ 派生数据 ============
  const selectedCrag = useMemo(() => crags.find(c => c.id === selectedCragId), [crags, selectedCragId])
  const areas = useMemo(
    () => deriveAreas(routes, selectedCragId, selectedCrag),
    [routes, selectedCrag, selectedCragId],
  )

  const areaRoutes = useMemo(() => {
    if (!selectedArea) return routes
    return routes.filter(r => r.area === selectedArea)
  }, [routes, selectedArea])

  const filteredRoutes = useMemo(() => {
    if (!searchQuery) return areaRoutes
    const query = searchQuery.trim().toLowerCase()
    return areaRoutes.filter((r) => {
      if (matchRouteByQuery(r, query)) return true
      if (r.area?.toLowerCase().includes(query)) return true
      if (r.grade.toLowerCase().includes(query)) return true
      return false
    })
  }, [areaRoutes, searchQuery])

  // ============ 切换岩场 ============
  const handleSelectCrag = useCallback((id: string) => {
    setSelectedCragId(id)
    setSelectedRoute(null)
    setSelectedArea(null)
    setShowRightPanel(false)
  }, [setSelectedCragId])

  // ============ 选择线路 ============
  const handleSelectRoute = useCallback((route: Route) => {
    setSelectedRoute(route)
    setEditingBetaId(null)
    setShowRightPanel(true)
  }, [])

  // ============ 开始编辑 Beta ============
  const handleStartEdit = useCallback((beta: BetaLink) => {
    setEditingBetaId(beta.id)
    setEditForm({
      title: beta.title || '',
      author: beta.author || '',
      climberHeight: beta.climberHeight ? String(beta.climberHeight) : '',
      climberReach: beta.climberReach ? String(beta.climberReach) : '',
    })
  }, [])

  // ============ 保存 Beta 编辑 ============
  const handleSaveBeta = useCallback(async (betaId: string) => {
    if (!selectedRoute) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/beta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute.id,
          betaId,
          title: editForm.title.trim() || undefined,
          author: editForm.author.trim() || undefined,
          climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
          climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }

      // 更新本地状态
      setRoutes(prev => prev.map(r => {
        if (r.id !== selectedRoute.id) return r
        const updatedBetas = (r.betaLinks || []).map(b => {
          if (b.id !== betaId) return b
          return {
            ...b,
            title: editForm.title.trim() || undefined,
            author: editForm.author.trim() || undefined,
            climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
            climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
          }
        })
        return { ...r, betaLinks: updatedBetas }
      }))

      // 同步 selectedRoute
      setSelectedRoute(prev => {
        if (!prev) return prev
        const updatedBetas = (prev.betaLinks || []).map(b => {
          if (b.id !== betaId) return b
          return {
            ...b,
            title: editForm.title.trim() || undefined,
            author: editForm.author.trim() || undefined,
            climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
            climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
          }
        })
        return { ...prev, betaLinks: updatedBetas }
      })

      setEditingBetaId(null)
      showToast('Beta 信息已更新', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error', 4000)
    } finally {
      setIsSaving(false)
    }
  }, [selectedRoute, editForm, setRoutes, showToast])

  // ============ 删除 Beta ============
  const handleDeleteBeta = useCallback(async (betaId: string) => {
    if (!selectedRoute) return
    setDeletingBetaId(betaId)
    try {
      const res = await fetch('/api/beta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: selectedRoute.id, betaId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '删除失败')
      }

      // 更新本地状态
      setRoutes(prev => prev.map(r => {
        if (r.id !== selectedRoute.id) return r
        return { ...r, betaLinks: (r.betaLinks || []).filter(b => b.id !== betaId) }
      }))
      setSelectedRoute(prev => {
        if (!prev) return prev
        return { ...prev, betaLinks: (prev.betaLinks || []).filter(b => b.id !== betaId) }
      })

      showToast('Beta 已删除', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
    } finally {
      setDeletingBetaId(null)
    }
  }, [selectedRoute, setRoutes, showToast])

  // ============ 添加 Beta 成功回调 ============
  const handleBetaSubmitSuccess = useCallback(() => {
    // 重新加载线路数据以获取新 beta
    if (!selectedCragId) return
    fetch(`/api/crags/${selectedCragId}/routes`)
      .then(res => res.json())
      .then(data => {
        if (data.routes) {
          setRoutes(data.routes)
          // 更新 selectedRoute
          if (selectedRoute) {
            const updated = (data.routes as Route[]).find(r => r.id === selectedRoute.id)
            if (updated) setSelectedRoute(updated)
          }
        }
      })
      .catch(() => {})
  }, [selectedCragId, selectedRoute, setRoutes])

  // ============ Beta 统计 (用于 CragSelector) ============
  const betaStats = useMemo(() => {
    const withBeta = routes.filter(r => r.betaLinks && r.betaLinks.length > 0)
    return {
      total: routes.length,
      marked: withBeta.length,
      progress: routes.length > 0 ? (withBeta.length / routes.length) * 100 : 0,
    }
  }, [routes])

  // ============ 左栏 ============
  const leftPanel = (
    <div className="flex flex-col h-full">
      <CragSelector
        crags={crags}
        selectedCragId={selectedCragId}
        isLoading={isLoadingCrags}
        onSelect={handleSelectCrag}
        stats={betaStats}
      />

      {selectedCragId && (
        <>
          {/* Area 芯片选择器 */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5 px-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
              选择区域
            </label>
            {isLoadingRoutes ? (
              <div className="flex items-center justify-center py-4" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <div className="w-5 h-5 animate-spin"><Loader2 className="w-full h-full" /></div>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button
                  onClick={() => { setSelectedArea(null); setSelectedRoute(null); setShowRightPanel(false) }}
                  className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm"
                  style={{
                    backgroundColor: selectedArea === null ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                    color: selectedArea === null ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                  }}
                >
                  全部 ({routes.length})
                </button>
                {areas.map(area => {
                  const count = routes.filter(r => r.area === area).length
                  return (
                    <button
                      key={area}
                      onClick={() => { setSelectedArea(area); setSelectedRoute(null); setShowRightPanel(false) }}
                      className="px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm"
                      style={{
                        backgroundColor: selectedArea === area ? 'var(--theme-primary)' : 'var(--theme-surface-variant)',
                        color: selectedArea === area ? 'var(--theme-on-primary)' : 'var(--theme-on-surface)',
                      }}
                    >
                      {area} ({count})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 搜索 */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--theme-on-surface-variant)' }} />
            <Input
              variant="search"
              placeholder="搜索线路..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-12 pr-10 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--theme-surface-variant)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full" style={{ backgroundColor: 'var(--theme-outline)' }}>
                <X className="w-4 h-4" style={{ color: 'var(--theme-on-surface)' }} />
              </button>
            )}
          </div>

          {/* 线路列表 */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">未找到匹配线路</p>
              </div>
            ) : (
              filteredRoutes.map((route) => (
                <div key={route.id} className="relative">
                  <RouteCard
                    route={route}
                    isSelected={selectedRoute?.id === route.id}
                    onClick={() => handleSelectRoute(route)}
                  />
                  {/* Beta 数量角标 */}
                  {route.betaLinks && route.betaLinks.length > 0 && (
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--theme-primary)',
                        color: 'var(--theme-on-primary)',
                      }}
                    >
                      {route.betaLinks.length} Beta
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )

  // ============ 右栏 ============
  const rightPanel = (
    <div className="h-full overflow-y-auto">
      {!selectedRoute ? (
        <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-on-surface-variant)' }}>
          <Play className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">选择线路查看 Beta</p>
          <p className="text-sm">从左侧列表选择要管理的线路</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
          {/* 线路标题 */}
          <div
            className="flex items-center gap-3 p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface))',
              borderRadius: 'var(--theme-radius-xl)',
              border: `2px solid ${getGradeColor(selectedRoute.grade)}`,
            }}
          >
            <Play className="w-5 h-5" style={{ color: getGradeColor(selectedRoute.grade) }} />
            <div className="flex-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>
                {selectedRoute.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--theme-on-surface-variant)' }}>
                {selectedRoute.area} · {selectedRoute.grade}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: getGradeColor(selectedRoute.grade) }}>
              {selectedRoute.grade}
            </div>
          </div>

          {/* Beta 列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--theme-on-surface)' }}>
                Beta 视频 ({selectedRoute.betaLinks?.length || 0})
              </h3>
              <button
                onClick={() => setShowSubmitDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'var(--theme-on-primary)',
                }}
              >
                <Plus className="w-4 h-4" />
                添加 Beta
              </button>
            </div>

            {(!selectedRoute.betaLinks || selectedRoute.betaLinks.length === 0) ? (
              <div
                className="text-center py-8"
                style={{
                  backgroundColor: 'var(--theme-surface-variant)',
                  borderRadius: 'var(--theme-radius-xl)',
                  color: 'var(--theme-on-surface-variant)',
                }}
              >
                <Play className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无 Beta 视频</p>
                <button
                  onClick={() => setShowSubmitDrawer(true)}
                  className="text-sm font-medium mt-2 inline-block"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  添加第一个 Beta →
                </button>
              </div>
            ) : (
              selectedRoute.betaLinks.map((beta) => (
                <BetaCard
                  key={beta.id}
                  beta={beta}
                  isEditing={editingBetaId === beta.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onStartEdit={() => handleStartEdit(beta)}
                  onCancelEdit={() => setEditingBetaId(null)}
                  onSave={() => handleSaveBeta(beta.id)}
                  onDelete={() => handleDeleteBeta(beta.id)}
                  isSaving={isSaving}
                  isDeleting={deletingBetaId === beta.id}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ============ 渲染 ============
  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: 'var(--theme-surface)' }}>
      <header
        className="sticky top-0 z-40 px-4 lg:px-6 py-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-surface) 85%, transparent)',
          borderBottom: '1px solid var(--theme-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl lg:max-w-none mx-auto">
          <Link
            href="/editor"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
            style={{ color: 'var(--theme-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--theme-on-surface)' }}>Beta 管理</h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl lg:max-w-none mx-auto px-4 lg:px-6 py-4">
        {/* 桌面端双栏 */}
        <div className="hidden lg:flex lg:gap-6 lg:h-[calc(100vh-73px)]">
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden">
            {leftPanel}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {rightPanel}
          </div>
        </div>

        {/* 移动端 */}
        <div className="lg:hidden">
          {!showRightPanel ? (
            leftPanel
          ) : selectedRoute ? (
            <div className="space-y-4 animate-fade-in-up">
              <button
                onClick={() => { setShowRightPanel(false); setSelectedRoute(null) }}
                className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{ color: 'var(--theme-primary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">返回线路列表</span>
              </button>
              {rightPanel}
            </div>
          ) : null}
        </div>
      </div>

      {/* 添加 Beta 抽屉 */}
      {selectedRoute && (
        <BetaSubmitDrawer
          isOpen={showSubmitDrawer}
          onClose={() => setShowSubmitDrawer(false)}
          routeId={selectedRoute.id}
          routeName={selectedRoute.name}
          onSuccess={handleBetaSubmitSuccess}
        />
      )}

      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}

// ============ Beta 卡片组件 ============

function BetaCard({
  beta,
  isEditing,
  editForm,
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  beta: BetaLink
  isEditing: boolean
  editForm: { title: string; author: string; climberHeight: string; climberReach: string }
  setEditForm: React.Dispatch<React.SetStateAction<typeof editForm>>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  isSaving: boolean
  isDeleting: boolean
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const platformInfo = BETA_PLATFORMS[beta.platform]

  return (
    <div
      className="p-4 transition-all duration-200"
      style={{
        backgroundColor: 'var(--theme-surface-variant)',
        borderRadius: 'var(--theme-radius-xl)',
        border: isEditing ? '2px solid var(--theme-primary)' : '1px solid var(--theme-outline-variant)',
      }}
    >
      {/* 头部：平台 + URL + 操作按钮 */}
      <div className="flex items-center gap-2 mb-3">
        <BookHeart className="w-4 h-4 flex-shrink-0" style={{ color: platformInfo?.color || 'var(--theme-on-surface-variant)' }} />
        <span className="text-xs font-medium" style={{ color: platformInfo?.color }}>{platformInfo?.name || beta.platform}</span>
        <a
          href={beta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs truncate flex-1 min-w-0"
          style={{ color: 'var(--theme-primary)' }}
        >
          <span className="truncate">{beta.url}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onStartEdit}
              className="p-1.5 rounded-lg transition-all duration-200 active:scale-95"
              style={{ color: 'var(--theme-primary)' }}
              title="编辑"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg transition-all duration-200 active:scale-95"
              style={{ color: 'var(--theme-error)' }}
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div
          className="flex items-center gap-2 p-3 mb-3 animate-fade-in-up"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-error) 12%, var(--theme-surface))',
            borderRadius: 'var(--theme-radius-lg)',
          }}
        >
          <span className="text-sm flex-1" style={{ color: 'var(--theme-error)' }}>确定删除此 Beta？</span>
          <button
            onClick={() => { setShowDeleteConfirm(false); onDelete() }}
            disabled={isDeleting}
            className="px-3 py-1 rounded-lg text-sm font-medium text-white transition-all active:scale-95"
            style={{ backgroundColor: 'var(--theme-error)' }}
          >
            {isDeleting ? '删除中...' : '确定'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-3 py-1 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
          >
            取消
          </button>
        </div>
      )}

      {isEditing ? (
        /* 编辑模式 */
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-on-surface-variant)' }}>标题</label>
            <Input
              value={editForm.title}
              onChange={(v) => setEditForm(prev => ({ ...prev, title: v }))}
              placeholder="Beta 标题"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
              <User className="w-3 h-3 inline mr-1" />作者
            </label>
            <Input
              value={editForm.author}
              onChange={(v) => setEditForm(prev => ({ ...prev, author: v }))}
              placeholder="昵称"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <Ruler className="w-3 h-3 inline mr-1" />身高 (cm)
              </label>
              {/* eslint-disable-next-line no-restricted-syntax -- type="number" has no IME composition */}
              <input
                type="number"
                value={editForm.climberHeight}
                onChange={(e) => setEditForm(prev => ({ ...prev, climberHeight: e.target.value }))}
                placeholder="170"
                min={100}
                max={250}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderRadius: 'var(--theme-radius-lg)',
                  color: 'var(--theme-on-surface)',
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-on-surface-variant)' }}>
                <MoveHorizontal className="w-3 h-3 inline mr-1" />臂长 (cm)
              </label>
              {/* eslint-disable-next-line no-restricted-syntax -- type="number" has no IME composition */}
              <input
                type="number"
                value={editForm.climberReach}
                onChange={(e) => setEditForm(prev => ({ ...prev, climberReach: e.target.value }))}
                placeholder="170"
                min={100}
                max={250}
                className="w-full px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderRadius: 'var(--theme-radius-lg)',
                  color: 'var(--theme-on-surface)',
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancelEdit}
              className="flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-on-surface)' }}
            >
              取消
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 py-2 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-on-primary)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</> : <><Save className="w-4 h-4" /> 保存</>}
            </button>
          </div>
        </div>
      ) : (
        /* 展示模式 */
        <div className="space-y-1.5">
          {beta.title && (
            <p className="text-sm font-medium" style={{ color: 'var(--theme-on-surface)' }}>{beta.title}</p>
          )}
          {beta.author && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
              <User className="w-3 h-3" />
              <span>{beta.author}</span>
            </div>
          )}
          {(beta.climberHeight || beta.climberReach) && (
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--theme-on-surface-variant)' }}>
              {beta.climberHeight && (
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  {beta.climberHeight}cm
                </span>
              )}
              {beta.climberReach && (
                <span className="flex items-center gap-1">
                  <MoveHorizontal className="w-3 h-3" />
                  臂长 {beta.climberReach}cm
                </span>
              )}
            </div>
          )}
          {!beta.title && !beta.author && !beta.climberHeight && !beta.climberReach && (
            <p className="text-xs" style={{ color: 'var(--theme-on-surface-variant)', opacity: 0.6 }}>
              无额外信息
            </p>
          )}
        </div>
      )}
    </div>
  )
}
