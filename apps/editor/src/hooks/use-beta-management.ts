'use client'

import { useState, useCallback } from 'react'
import type { Route, BetaLink } from '@bloctop/shared/types'
import { useToast } from '@bloctop/ui/components/toast'
import type { BetaEditForm } from '@/components/editor/beta-card'

export type { BetaEditForm }

export interface UseBetaManagementOptions {
  setRoutes: React.Dispatch<React.SetStateAction<Route[]>>
}

export function useBetaManagement({ setRoutes }: UseBetaManagementOptions) {
  const { showToast } = useToast()
  const [editingBetaId, setEditingBetaId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BetaEditForm>({
    title: '',
    author: '',
    climberHeight: '',
    climberReach: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingBetaId, setDeletingBetaId] = useState<string | null>(null)

  const updateRouteAndSelected = useCallback(
    (
      routeId: number,
      transform: (r: Route) => Route,
      setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>,
    ) => {
      setRoutes(prev => prev.map(r => r.id === routeId ? transform(r) : r))
      setSelectedRoute(prev => prev && prev.id === routeId ? transform(prev) : prev)
    },
    [setRoutes],
  )

  const handleStartEdit = useCallback((beta: BetaLink) => {
    setEditingBetaId(beta.id)
    setEditForm({
      title: beta.title || '',
      author: beta.author || '',
      climberHeight: beta.climberHeight ? String(beta.climberHeight) : '',
      climberReach: beta.climberReach ? String(beta.climberReach) : '',
    })
  }, [])

  const handleSaveBeta = useCallback(async (
    betaId: string,
    selectedRoute: Route,
    setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>,
  ) => {
    setIsSaving(true)
    try {
      const parsedValues = {
        title: editForm.title.trim() || undefined,
        author: editForm.author.trim() || undefined,
        climberHeight: editForm.climberHeight ? parseInt(editForm.climberHeight, 10) : undefined,
        climberReach: editForm.climberReach ? parseInt(editForm.climberReach, 10) : undefined,
      }
      const res = await fetch('/api/beta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: selectedRoute.id, betaId, ...parsedValues }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }

      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).map(b => b.id === betaId ? { ...b, ...parsedValues } : b),
      }), setSelectedRoute)

      setEditingBetaId(null)
      showToast('Beta 信息已更新', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error', 4000)
    } finally {
      setIsSaving(false)
    }
  }, [editForm, updateRouteAndSelected, showToast])

  const handleDeleteBeta = useCallback(async (
    betaId: string,
    selectedRoute: Route,
    setSelectedRoute: React.Dispatch<React.SetStateAction<Route | null>>,
  ) => {
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

      updateRouteAndSelected(selectedRoute.id, r => ({
        ...r,
        betaLinks: (r.betaLinks || []).filter(b => b.id !== betaId),
      }), setSelectedRoute)

      showToast('Beta 已删除', 'success', 3000)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error', 4000)
    } finally {
      setDeletingBetaId(null)
    }
  }, [updateRouteAndSelected, showToast])

  return {
    editingBetaId,
    setEditingBetaId,
    editForm,
    setEditForm,
    isSaving,
    deletingBetaId,
    handleStartEdit,
    handleSaveBeta,
    handleDeleteBeta,
  }
}
