// src/components/route-legend-panel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { RouteLegendPanel } from './route-legend-panel'
import type { MultiTopoRoute } from '@/components/multi-topo-line-overlay'

const topoLine = [{ x: 0, y: 0 }, { x: 1, y: 1 }]

const twoRoutes: MultiTopoRoute[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', topoLine },
  { id: 2, name: '飞燕走壁', grade: 'V5', topoLine },
]

const fourRoutes: MultiTopoRoute[] = [
  { id: 1, name: '猴子捞月', grade: 'V3', topoLine },
  { id: 2, name: '飞燕走壁', grade: 'V5', topoLine },
  { id: 3, name: '小石头', grade: 'V2', topoLine },
  { id: 4, name: '大力士', grade: 'V7', topoLine },
]

describe('RouteLegendPanel', () => {
  const defaultProps = {
    routes: twoRoutes,
    selectedRouteId: 1,
    onRouteSelect: vi.fn(),
    showAllOverlay: false,
    onToggleShowAll: vi.fn(),
  }

  describe('渲染', () => {
    it('应渲染所有线路名称', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.getByText('猴子捞月')).toBeInTheDocument()
      expect(screen.getByText('飞燕走壁')).toBeInTheDocument()
    })

    it('应渲染所有线路的难度等级', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.getByText('V3')).toBeInTheDocument()
      expect(screen.getByText('V5')).toBeInTheDocument()
    })

    it('≤3 条线路时不应显示 showAll toggle', () => {
      render(<RouteLegendPanel {...defaultProps} />)
      expect(screen.queryByText('showAllRoutes')).not.toBeInTheDocument()
      expect(screen.queryByText('showCurrentOnly')).not.toBeInTheDocument()
    })
  })

  describe('>3 条线路时的 toggle', () => {
    it('showAllOverlay=false 时应显示 showAllRoutes 按钮', () => {
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          showAllOverlay={false}
        />
      )
      expect(screen.getByText('showAllRoutes')).toBeInTheDocument()
    })

    it('showAllOverlay=true 时应显示 showCurrentOnly 按钮', () => {
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          showAllOverlay={true}
        />
      )
      expect(screen.getByText('showCurrentOnly')).toBeInTheDocument()
    })

    it('点击 toggle 按钮应调用 onToggleShowAll', () => {
      const onToggleShowAll = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          routes={fourRoutes}
          onToggleShowAll={onToggleShowAll}
        />
      )
      fireEvent.click(screen.getByText('showAllRoutes'))
      expect(onToggleShowAll).toHaveBeenCalledOnce()
    })
  })

  describe('交互', () => {
    it('点击非焦点线路应调用 onRouteSelect', () => {
      const onRouteSelect = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          onRouteSelect={onRouteSelect}
        />
      )
      fireEvent.click(screen.getByText('飞燕走壁'))
      expect(onRouteSelect).toHaveBeenCalledWith(2)
    })

    it('点击焦点线路不应调用 onRouteSelect', () => {
      const onRouteSelect = vi.fn()
      render(
        <RouteLegendPanel
          {...defaultProps}
          onRouteSelect={onRouteSelect}
        />
      )
      fireEvent.click(screen.getByText('猴子捞月'))
      expect(onRouteSelect).not.toHaveBeenCalled()
    })
  })
})
