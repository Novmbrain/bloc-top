/**
 * GradeRangeSelector Playwright 组件测试
 * 测试需要真实浏览器环境的复杂交互：
 * - 点选单个等级
 * - 拖动范围选择
 */
import { test, expect } from '@playwright/experimental-ct-react'
import { GradeRangeSelector } from './grade-range-selector'

test.describe('GradeRangeSelector 真实交互测试', () => {
  test('单击应选中单个难度', async ({ mount }) => {
    let selectedGrades: string[] = []

    const component = await mount(
      <GradeRangeSelector
        selectedGrades={selectedGrades}
        onChange={(grades) => {
          selectedGrades = grades
        }}
      />
    )

    // 获取色谱条容器
    const colorBar = component.locator('.touch-none')
    const box = await colorBar.boundingBox()

    if (!box) throw new Error('色谱条未找到')

    // 计算 V5 的位置（第 6 个格子，索引 5）
    const cellWidth = box.width / 14
    const v5X = box.x + cellWidth * 5 + cellWidth / 2

    // 单击 V5
    await component.page().mouse.click(v5X, box.y + box.height / 2)

    // 验证选中了 V5
    await expect(component.getByText('V5')).toBeVisible()
  })

  test('拖动应选择连续范围', async ({ mount }) => {
    let selectedGrades: string[] = []

    const component = await mount(
      <GradeRangeSelector
        selectedGrades={selectedGrades}
        onChange={(grades) => {
          selectedGrades = grades
        }}
      />
    )

    const colorBar = component.locator('.touch-none')
    const box = await colorBar.boundingBox()

    if (!box) throw new Error('色谱条未找到')

    const cellWidth = box.width / 14
    const startX = box.x + cellWidth * 2 + cellWidth / 2  // V2
    const endX = box.x + cellWidth * 5 + cellWidth / 2    // V5
    const y = box.y + box.height / 2

    // 从 V2 拖动到 V5
    await component.page().mouse.move(startX, y)
    await component.page().mouse.down()
    await component.page().mouse.move(endX, y)
    await component.page().mouse.up()

    // 验证显示范围
    await expect(component.getByText('V2 - V5')).toBeVisible()
  })

  test('点击清除按钮应清空选择', async ({ mount }) => {
    let selectedGrades = ['V2', 'V3', 'V4']

    const component = await mount(
      <GradeRangeSelector
        selectedGrades={selectedGrades}
        onChange={(grades) => {
          selectedGrades = grades
        }}
      />
    )

    // 点击清除按钮
    await component.getByText('清除').click()

    // 验证显示"全部难度"
    await expect(component.getByText('全部难度')).toBeVisible()
  })

  test('应渲染所有 14 个难度等级', async ({ mount }) => {
    const component = await mount(
      <GradeRangeSelector
        selectedGrades={[]}
        onChange={() => {}}
      />
    )

    // 验证显示 0-13 的数字（使用 exact: true 避免 '0' 匹配 '10'）
    for (let i = 0; i <= 13; i++) {
      await expect(component.getByText(String(i), { exact: true })).toBeVisible()
    }
  })
})
