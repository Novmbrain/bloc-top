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

describe('RouteLegendPanel', () => {
  const defaultProps = {
    routes: twoRoutes,
    selectedRouteId: 1,
    onRouteSelect: vi.fn(),
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
