'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Search,
  X,
  Play,
  Loader2,
  Plus,
} from 'lucide-react'
import { AppTabbar } from '@/components/app-tabbar'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { Input } from '@/components/ui/input'
import type { Route, BetaLink } from '@/types'
import { getGradeColor } from '@/lib/tokens'
import { useToast } from '@/components/ui/toast'
import { matchRouteByQuery } from '@/hooks/use-route-search'
import { useCragRoutes } from '@/hooks/use-crag-routes'
import { CragSelector } from '@/components/editor/crag-selector'
import { RouteCard } from '@/components/editor/route-card'
import { deriveAreas } from '@/lib/editor-areas'
import { BetaSubmitDrawer } from '@/components/beta-submit-drawer'
import { BetaCard, type BetaEditForm } from '@/components/editor/beta-card'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'

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
  const [editForm, setEditForm] = useState<BetaEditForm>({ title: '', author: '', climberHeight: '', climberReach: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingBetaId, setDeletingBetaId] = useState<string | null>(null)

  // ============ 添加 Beta ============
  const [showSubmitDrawer, setShowSubmitDrawer] = useState(false)

  // ============ UI 状态 ============
  const [showRightPanel, setShowRightPanel] = useState(false)

  const { showToast } = useToast()

  // ============ 桌面端突破 app-shell 宽度限制 ============
  useBreakAppShellLimit()

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

  // ============ 同步 routes + selectedRoute 辅助 ============
  const updateRouteAndSelected = useCallback(
    (routeId: number, transform: (r: Route) => Route) => {
      setRoutes(prev => prev.map(r => r.id === routeId ? transform(r) : r))
      setSelectedRoute(prev => prev && prev.id === routeId ? transform(prev) : prev)
    },
    [setRoutes],
  )

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
      const newValues = {
        title: editForm.title.trim() || undefined,
        author: editForm.author.trim() || undefined,
        climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
        climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
      }
      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).map(b =>
          b.id === betaId ? { ...b, ...newValues } : b
        ),
      }))

      setEditingBetaId(null)
      showToast('Beta 信息已更新', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error', 4000)
    } finally {
      setIsSaving(false)
    }
  }, [selectedRoute, editForm, updateRouteAndSelected, showToast])

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
      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).filter(b => b.id !== betaId),
      }))

      showToast('Beta 已删除', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
    } finally {
      setDeletingBetaId(null)
    }
  }, [selectedRoute, updateRouteAndSelected, showToast])

  // ============ 添加 Beta 成功回调 (乐观更新) ============
  const handleBetaSubmitSuccess = useCallback((newBeta: BetaLink) => {
    if (!selectedRoute) return
    updateRouteAndSelected(selectedRoute.id, r => ({
      ...r,
      betaLinks: [...(r.betaLinks || []), newBeta],
    }))
  }, [selectedRoute, updateRouteAndSelected])

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
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm ${selectedArea === null ? '' : 'glass-light'}`}
                  style={{
                    backgroundColor: selectedArea === null ? 'var(--theme-primary)' : undefined,
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
                      className={`px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 font-medium text-sm ${selectedArea === area ? '' : 'glass-light'}`}
                      style={{
                        backgroundColor: selectedArea === area ? 'var(--theme-primary)' : undefined,
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
                className="text-center py-8 glass-light"
                style={{
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
      <EditorPageHeader
        title="Beta 管理"
        icon={<Play className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />}
        isDetailMode={showRightPanel}
        onBackToList={() => { setShowRightPanel(false); setSelectedRoute(null) }}
        listLabel="线路列表"
      />

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

