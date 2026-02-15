/**
 * filter-constants.ts 单元测试
 * 测试筛选功能的核心数据逻辑
 */
import { describe, it, expect } from 'vitest'
import {
  V_GRADES,
  GRADE_GROUPS,
  getGradesByValue,
  getGradesByValues,
  FILTER_PARAMS,
  DEFAULT_SORT_DIRECTION,
} from './filter-constants'

describe('V_GRADES', () => {
  it('应包含 V0 到 V13 共 14 个难度等级', () => {
    expect(V_GRADES).toHaveLength(14)
    expect(V_GRADES[0]).toBe('V0')
    expect(V_GRADES[13]).toBe('V13')
  })

  it('难度等级应按顺序排列', () => {
    for (let i = 0; i < V_GRADES.length; i++) {
      expect(V_GRADES[i]).toBe(`V${i}`)
    }
  })
})

describe('GRADE_GROUPS', () => {
  it('应为每个 V 等级生成对应的配置', () => {
    expect(GRADE_GROUPS).toHaveLength(14)
  })

  it('每个配置应包含正确的 label、value、grades 和 color', () => {
    const v5Group = GRADE_GROUPS.find(g => g.value === 'V5')
    expect(v5Group).toBeDefined()
    expect(v5Group!.label).toBe('V5')
    expect(v5Group!.grades).toEqual(['V5'])
    expect(v5Group!.color).toBeDefined()
    expect(typeof v5Group!.color).toBe('string')
  })
})

describe('getGradesByValue', () => {
  it('应返回匹配的难度等级数组', () => {
    expect(getGradesByValue('V0')).toEqual(['V0'])
    expect(getGradesByValue('V5')).toEqual(['V5'])
    expect(getGradesByValue('V13')).toEqual(['V13'])
  })

  it('不存在的值应返回空数组', () => {
    expect(getGradesByValue('V99')).toEqual([])
    expect(getGradesByValue('')).toEqual([])
    expect(getGradesByValue('invalid')).toEqual([])
  })

  it('应返回新数组而非引用', () => {
    const result1 = getGradesByValue('V5')
    const result2 = getGradesByValue('V5')
    expect(result1).not.toBe(result2)
    expect(result1).toEqual(result2)
  })
})

describe('getGradesByValues', () => {
  it('应返回多个值对应的所有难度等级', () => {
    expect(getGradesByValues(['V0', 'V1', 'V2'])).toEqual(['V0', 'V1', 'V2'])
    expect(getGradesByValues(['V5'])).toEqual(['V5'])
  })

  it('空数组应返回空数组', () => {
    expect(getGradesByValues([])).toEqual([])
  })

  it('应过滤掉无效值', () => {
    // 无效值会返回空数组，flatMap 会自动过滤
    expect(getGradesByValues(['V0', 'invalid', 'V1'])).toEqual(['V0', 'V1'])
  })

  it('应支持不连续的选择', () => {
    expect(getGradesByValues(['V0', 'V5', 'V10'])).toEqual(['V0', 'V5', 'V10'])
  })
})

describe('FILTER_PARAMS', () => {
  it('应包含所有必要的参数名', () => {
    expect(FILTER_PARAMS.CRAG).toBe('crag')
    expect(FILTER_PARAMS.GRADE).toBe('grade')
    expect(FILTER_PARAMS.QUERY).toBe('q')
    expect(FILTER_PARAMS.SORT).toBe('sort')
  })
})

describe('DEFAULT_SORT_DIRECTION', () => {
  it('默认排序应为升序（从简单到难）', () => {
    expect(DEFAULT_SORT_DIRECTION).toBe('asc')
  })
})
