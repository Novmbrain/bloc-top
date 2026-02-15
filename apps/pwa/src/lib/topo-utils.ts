import type { TopoPoint } from '@/types'

/**
 * Centripetal Catmull-Rom 样条曲线
 *
 * 将点数组转换为 SVG 路径字符串（使用三次贝塞尔 C 命令）。
 * 与旧的二次贝塞尔不同，此算法**数学保证曲线穿过每个标注点**。
 *
 * 算法步骤：
 * 1. 首尾复制虚拟端点（解决端点缺少相邻点的问题）
 * 2. 每 4 点一组 (P0,P1,P2,P3)，用 centripetal 参数化计算 P1→P2 的切线
 * 3. 切线转换为三次贝塞尔控制点：cp1 = P1 + m1/3, cp2 = P2 - m2/3
 *
 * @param points 输入点数组（已缩放到目标坐标系）
 * @param alpha 参数化指数：0.5 = centripetal（推荐），0 = uniform，1 = chordal
 * @param tension 曲线张力 0-1：0 = 标准平滑（默认），1 = 完全折线
 */
export function catmullRomCurve(
  points: TopoPoint[],
  alpha = 0.5,
  tension = 0,
): string {
  if (points.length < 2) return ''

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  // 构建扩展点数组：首尾复制虚拟端点
  const pts: TopoPoint[] = [
    points[0],
    ...points,
    points[points.length - 1],
  ]

  let path = `M ${points[0].x} ${points[0].y}`

  const t = 1 - tension

  // 遍历每 4 点一组，生成 P1→P2 的曲线段
  for (let i = 0; i < pts.length - 3; i++) {
    const p0 = pts[i]
    const p1 = pts[i + 1]
    const p2 = pts[i + 2]
    const p3 = pts[i + 3]

    // Centripetal 参数化间距（用 epsilon 防止重合点除零）
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y) ** alpha || 1e-6
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y) ** alpha || 1e-6
    const d23 = Math.hypot(p3.x - p2.x, p3.y - p2.y) ** alpha || 1e-6

    // 计算切线向量
    const m1x = t * (p2.x - p1.x + d12 * ((p1.x - p0.x) / d01 - (p2.x - p0.x) / (d01 + d12)))
    const m1y = t * (p2.y - p1.y + d12 * ((p1.y - p0.y) / d01 - (p2.y - p0.y) / (d01 + d12)))
    const m2x = t * (p2.x - p1.x + d12 * ((p3.x - p2.x) / d23 - (p3.x - p1.x) / (d12 + d23)))
    const m2y = t * (p2.y - p1.y + d12 * ((p3.y - p2.y) / d23 - (p3.y - p1.y) / (d12 + d23)))

    // 转换为三次贝塞尔控制点
    const cp1x = p1.x + m1x / 3
    const cp1y = p1.y + m1y / 3
    const cp2x = p2.x - m2x / 3
    const cp2y = p2.y - m2y / 3

    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }

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
