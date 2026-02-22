import { useState, useEffect, useRef } from 'react'
import type { TopoLineOverlayRef } from '@/components/topo-line-overlay'
import type { MultiTopoLineOverlayRef } from '@/components/multi-topo-line-overlay'
import type { TopoPoint } from '@bloctop/shared/types'
import { TOPO_ANIMATION_CONFIG } from '@/lib/topo-constants'

interface UseTopoAnimationOptions {
  isOpen: boolean
  imageLoading: boolean
  topoLine?: TopoPoint[]
  useMultiLineMode: boolean
  imageViewerOpen: boolean
}

/**
 * Manages animation orchestration for topo line overlays.
 *
 * Handles three animation triggers:
 * 1. Drawer open + image loaded → replay drawer overlay
 * 2. Fullscreen viewer opened → replay fullscreen overlay
 * 3. Route change → reset animation state
 */
export function useTopoAnimation({
  isOpen,
  imageLoading,
  topoLine,
  useMultiLineMode,
  imageViewerOpen,
}: UseTopoAnimationOptions) {
  const drawerOverlayRef = useRef<TopoLineOverlayRef>(null)
  const fullscreenOverlayRef = useRef<TopoLineOverlayRef>(null)
  const multiOverlayRef = useRef<MultiTopoLineOverlayRef>(null)
  const multiFullscreenOverlayRef = useRef<MultiTopoLineOverlayRef>(null)

  const [drawerAnimated, setDrawerAnimated] = useState(false)

  const resetAnimation = () => setDrawerAnimated(false)

  // Drawer open + image loaded → trigger animation (single-line mode only)
  useEffect(() => {
    if (isOpen && !imageLoading && !drawerAnimated && topoLine && !useMultiLineMode) {
      const timer = setTimeout(() => {
        drawerOverlayRef.current?.replay()
        setDrawerAnimated(true)
      }, TOPO_ANIMATION_CONFIG.autoPlayDelayDrawer)
      return () => clearTimeout(timer)
    }
  }, [isOpen, imageLoading, drawerAnimated, topoLine, useMultiLineMode])

  // Fullscreen viewer opened → trigger animation (single-line mode only)
  useEffect(() => {
    if (imageViewerOpen && topoLine && !useMultiLineMode) {
      const timer = setTimeout(() => {
        fullscreenOverlayRef.current?.replay()
      }, TOPO_ANIMATION_CONFIG.autoPlayDelayFullscreen)
      return () => clearTimeout(timer)
    }
  }, [imageViewerOpen, topoLine, useMultiLineMode])

  return {
    drawerOverlayRef,
    fullscreenOverlayRef,
    multiOverlayRef,
    multiFullscreenOverlayRef,
    resetAnimation,
  }
}
