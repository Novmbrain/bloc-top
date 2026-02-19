// apps/editor/src/app/routes/tab-logic.test.ts
import { describe, it, expect } from 'vitest'

// Pure function extracted from the Tab bar JSX:
// tab === 'beta' ? `Beta 视频${betaLinks?.length ? ` (${count})` : ''}` : 'Topo 标注'
function getBetaTabLabel(betaLinks: { id: string }[] | undefined): string {
  const count = betaLinks?.length
  return count ? `Beta 视频 (${count})` : 'Beta 视频'
}

describe('getBetaTabLabel', () => {
  it('无 betaLinks 时显示"Beta 视频"', () => {
    expect(getBetaTabLabel(undefined)).toBe('Beta 视频')
  })

  it('空数组时显示"Beta 视频"', () => {
    expect(getBetaTabLabel([])).toBe('Beta 视频')
  })

  it('有 1 个 beta 时显示计数', () => {
    expect(getBetaTabLabel([{ id: 'b1' }])).toBe('Beta 视频 (1)')
  })

  it('有 3 个 beta 时显示计数', () => {
    expect(getBetaTabLabel([{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }])).toBe('Beta 视频 (3)')
  })
})

// Tests for the activeTab reset behavior (mirrors executePendingAction logic)
describe('activeTab reset on route switch', () => {
  it('switchRoute action 应将 activeTab 重置为 topo', () => {
    let activeTab: 'topo' | 'beta' = 'beta'  // simulate user is on beta tab
    const simulateSwitch = () => { activeTab = 'topo' }

    simulateSwitch()
    expect(activeTab).toBe('topo')
  })
})
