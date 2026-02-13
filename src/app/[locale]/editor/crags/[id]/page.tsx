'use client'

import { use, useState, useEffect } from 'react'
import {
  Mountain,
  Loader2,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useSession } from '@/lib/auth-client'
import { EditorPageHeader } from '@/components/editor/editor-page-header'
import { CragPermissionsPanel } from '@/components/editor/crag-permissions-panel'
import { AppTabbar } from '@/components/app-tabbar'
import { useBreakAppShellLimit } from '@/hooks/use-break-app-shell-limit'
import type { Crag } from '@/types'

// ==================== Crag Detail Page ====================

export default function CragDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: cragId } = use(params)

  useBreakAppShellLimit()

  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  // ============ State ============

  const [crag, setCrag] = useState<Crag | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)

  // ============ Fetch crag data ============

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCrag() {
      try {
        const res = await fetch(`/api/crags/${cragId}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!data.success || !data.crag) {
          router.push('/editor/crags')
          return
        }
        setCrag(data.crag)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        router.push('/editor/crags')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchCrag()
    return () => controller.abort()
  }, [cragId, router])

  // ============ Determine canManage ============

  useEffect(() => {
    if (!session) return

    if (isAdmin) {
      setCanManage(true)
      return
    }

    const controller = new AbortController()

    // Probe permissions API — 200 means user can manage, 403 means no access
    fetch(`/api/crag-permissions?cragId=${encodeURIComponent(cragId)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) setCanManage(res.ok)
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setCanManage(false)
      })

    return () => controller.abort()
  }, [session, cragId, isAdmin])

  // ============ Loading state ============

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: 'var(--theme-primary)' }}
        />
      </div>
    )
  }

  // ============ Crag not found (handled by redirect, but safety net) ============

  if (!crag) {
    return null
  }

  // ============ Render ============

  return (
    <div
      className="min-h-screen pb-20 lg:pb-0"
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      {/* Header */}
      <EditorPageHeader
        title="岩场详情"
        icon={
          <Mountain
            className="w-5 h-5"
            style={{ color: 'var(--theme-primary)' }}
          />
        }
        isDetailMode={true}
        onBackToList={() => router.push('/editor/crags')}
        listLabel="岩场列表"
      />

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* ==================== Crag Info Card ==================== */}
        <div
          className="glass-light p-5 space-y-4 animate-fade-in-up"
          style={{
            borderRadius: 'var(--theme-radius-xl)',
          }}
        >
          {/* Crag name */}
          <h2
            className="text-xl font-bold"
            style={{ color: 'var(--theme-on-surface)' }}
          >
            {crag.name}
          </h2>

          {/* Info rows */}
          <div className="space-y-3">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: 'var(--theme-primary)' }}
              />
              <span
                className="text-sm"
                style={{ color: 'var(--theme-on-surface-variant)' }}
              >
                {crag.location}
              </span>
            </div>

            {/* Areas count */}
            {crag.areas && crag.areas.length > 0 && (
              <div className="flex items-center gap-3">
                <Layers
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--theme-primary)' }}
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {crag.areas.length} 个区域
                </span>
              </div>
            )}

            {/* Development time */}
            {crag.developmentTime && (
              <div className="flex items-center gap-3">
                <Calendar
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--theme-primary)' }}
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--theme-on-surface-variant)' }}
                >
                  {crag.developmentTime}
                </span>
              </div>
            )}
          </div>

          {/* Description preview */}
          {crag.description && (
            <p
              className="text-sm leading-relaxed line-clamp-3"
              style={{ color: 'var(--theme-on-surface-variant)' }}
            >
              {crag.description}
            </p>
          )}
        </div>

        {/* ==================== Permissions Panel ==================== */}
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <CragPermissionsPanel cragId={cragId} canManage={canManage} />
        </div>
      </div>

      {/* Mobile Tabbar */}
      <div className="lg:hidden">
        <AppTabbar />
      </div>
    </div>
  )
}
