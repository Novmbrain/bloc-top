import { useState, useMemo } from 'react'
import type { Route, RouteTopoAnnotation } from '@bloctop/shared/types'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'
import { getTopoAnnotations } from '@/lib/topo-annotations'

export interface OverlayMode {
  /** Whether the current route has a valid topo line (>= 2 points) */
  hasTopoLine: boolean
  /** Whether the route has multiple topo annotations (multi-image carousel) */
  hasMultiAnnotations: boolean
  /** The resolved list of topo annotations (may be synthesized from legacy fields) */
  topoAnnotations: RouteTopoAnnotation[]
  /** Sibling routes with valid topo data, mapped to MultiTopoRoute shape */
  validSiblingRoutes: MultiTopoRoute[]
  /** Whether multi-line overlay is available (2+ sibling routes with topoLine) */
  hasMultiLines: boolean
  /** Whether user has toggled "show all overlay" (for >3 sibling routes) */
  showAllOverlay: boolean
  /** Toggle show-all overlay state */
  toggleShowAllOverlay: () => void
  /** Whether to render multi-line mode (composed from hasMultiLines + effectiveShowAll) */
  useMultiLineMode: boolean
}

/**
 * Derives overlay display mode from route data.
 *
 * Encapsulates the 5-boolean derivation chain that determines which
 * topo rendering mode to use: single line, multi-annotation carousel,
 * or multi-line overlay.
 */
export function useOverlayMode(
  route: Route | null,
  siblingRoutes?: Route[]
): OverlayMode {
  const [showAllOverlay, setShowAllOverlay] = useState(false)

  const hasTopoLine = Boolean(route?.topoLine && route.topoLine.length >= 2)

  const topoAnnotations = route ? getTopoAnnotations(route) : []
  const hasMultiAnnotations = topoAnnotations.length > 1

  const validSiblingRoutes = useMemo((): MultiTopoRoute[] => {
    if (!siblingRoutes || siblingRoutes.length <= 1) return []
    return siblingRoutes
      .filter(r => r.topoLine && r.topoLine.length >= 2)
      .map(r => ({
        id: r.id,
        name: r.name,
        grade: r.grade,
        topoLine: r.topoLine!,
        topoTension: r.topoTension,
      }))
  }, [siblingRoutes])

  const hasMultiLines = validSiblingRoutes.length > 1 && hasTopoLine

  // Smart default: <=3 routes show all, >3 requires manual toggle
  const shouldShowAllByDefault = validSiblingRoutes.length <= 3
  const effectiveShowAll = shouldShowAllByDefault || showAllOverlay

  const useMultiLineMode = hasMultiLines && effectiveShowAll

  const toggleShowAllOverlay = () => setShowAllOverlay(prev => !prev)

  return {
    hasTopoLine,
    hasMultiAnnotations,
    topoAnnotations,
    validSiblingRoutes,
    hasMultiLines,
    showAllOverlay,
    toggleShowAllOverlay,
    useMultiLineMode,
  }
}
