import type { TopoPoint } from '@/types'

/**
 * 贝塞尔曲线生成算法
 * 将点数组转换为 SVG 路径字符串
 *
 * 算法说明：
 * - 两点时直接连线
 * - 多点时使用二次贝塞尔曲线 (Q 命令)
 * - 每个中间点作为控制点，曲线终点是当前点和下一点的中点
 * - 最后用 T 命令（平滑二次贝塞尔）连接到真正的终点
 */
export function bezierCurve(points: TopoPoint[]): string {
  if (points.length < 2) return ''

  // 起点：M (Move to)
  let path = `M ${points[0].x} ${points[0].y}`

  if (points.length === 2) {
    // 两点直接连线
    path += ` L ${points[1].x} ${points[1].y}`
    return path
  }

  // 多点使用二次贝塞尔曲线
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]

    // 计算当前点和下一点的中点（作为曲线终点）
    const midX = (current.x + next.x) / 2
    const midY = (current.y + next.y) / 2

    // Q 命令：控制点 (current) + 终点 (mid)
    path += ` Q ${Math.round(current.x)} ${Math.round(current.y)}`
    path += ` ${Math.round(midX)} ${Math.round(midY)}`
  }

  // 最后一段：用 T 命令平滑连接到终点
  const last = points[points.length - 1]
  path += ` T ${Math.round(last.x)} ${Math.round(last.y)}`

  return path
}

/**
 * 坐标缩放：归一化坐标 (0-1) → 目标尺寸坐标
 */
export function scalePoints(
  points: TopoPoint[],
  width: number,
  height: number
): TopoPoint[] {
  return points.map((p) => ({
    x: p.x * width,
    y: p.y * height,
  }))
}

/**
 * 坐标归一化：实际坐标 → 归一化坐标 (0-1)
 */
export function normalizePoint(
  x: number,
  y: number,
  width: number,
  height: number
): TopoPoint {
  return {
    x: Math.max(0, Math.min(1, x / width)),
    y: Math.max(0, Math.min(1, y / height)),
  }
}

/**
 * 生成随机颜色（用于新线路）
 */
export function generateRouteColor(): string {
  const colors = [
    '#22C55E', // 绿色
    '#3B82F6', // 蓝色
    '#F97316', // 橙色
    '#EF4444', // 红色
    '#8B5CF6', // 紫色
    '#EC4899', // 粉色
    '#14B8A6', // 青色
    '#F59E0B', // 黄色
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 生成唯一 ID
 */
export function generateRouteId(): string {
  return `route-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
