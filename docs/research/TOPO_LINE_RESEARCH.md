# Topo 线路绘制技术研究

> 基于 [Boolder](https://github.com/boolder-org/boolder-rails) 项目的实现分析

## 概述

Boolder 是一个开源的抱石线路指南应用，其核心功能之一是在岩石照片上绘制攀爬线路，并在用户点击起点时展示动画效果。本文档记录了其技术实现方案，供后续开发参考。

## 技术栈

| 技术 | 用途 |
|------|------|
| Rails | 后端框架 |
| Stimulus.js | 前端交互控制器 |
| SVG | 线路绘制 |
| CSS Transitions | 动画效果 |

## 核心实现

### 1. 文件结构

```
app/
├── javascript/controllers/
│   └── topo_line_controller.js    # 线路绘制控制器
├── views/topos/
│   └── _topo_with_line.html.erb   # 线路模板
```

### 2. 数据结构

#### 坐标存储格式

线路坐标以 **归一化值 (0-1)** 存储，表示相对于图片尺寸的百分比：

```json
{
  "line": [
    { "x": 0.25, "y": 0.85 },
    { "x": 0.28, "y": 0.65 },
    { "x": 0.32, "y": 0.45 },
    { "x": 0.35, "y": 0.25 }
  ]
}
```

**优势**：
- 与图片实际尺寸解耦
- 支持响应式显示
- 便于在不同分辨率下复用

#### 渲染时坐标转换

渲染时将归一化坐标乘以 viewBox 尺寸：

```javascript
// viewBox: 0 0 400 300
const scaledX = point.x * 400  // 0.25 → 100
const scaledY = point.y * 300  // 0.85 → 255
```

### 3. SVG 叠加层结构

```html
<div class="relative">
  <!-- 岩石照片 -->
  <img src="boulder-photo.jpg" class="w-full" />

  <!-- SVG 叠加层 -->
  <svg
    class="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 400 300"
    preserveAspectRatio="none"
  >
    <!-- 线路路径 -->
    <path
      d="M 100 255 Q 112 195 128 135 Q 140 75 140 75"
      stroke="#FF6B35"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- 起点标记 -->
    <circle cx="100" cy="255" r="8" fill="#FF6B35" />
  </svg>
</div>
```

**关键属性**：
- `pointer-events-none`: SVG 不拦截鼠标事件，允许点击穿透
- `preserveAspectRatio="none"`: SVG 拉伸填充容器
- `viewBox="0 0 400 300"`: 标准化坐标系统

### 4. 贝塞尔曲线算法

Boolder 使用 **二次贝塞尔曲线 (Quadratic Bézier)** 绘制平滑线条：

```javascript
/**
 * 将点数组转换为 SVG 路径字符串
 * 使用二次贝塞尔曲线实现平滑连接
 *
 * @param {Array<{x: number, y: number}>} points - 坐标点数组
 * @returns {string} SVG path d 属性值
 */
function bezierCurve(points = []) {
  if (points.length < 2) return ''

  // 起点：M (Move to)
  let path = `M ${points[0].x} ${points[0].y}`

  if (points.length === 2) {
    // 两点直接连线
    path += ` L ${points[1].x} ${points[1].y}`
    return path
  }

  // 多点使用二次贝塞尔曲线
  path += ' Q'

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]

    // 计算控制点（当前点和下一点的中点）
    const midX = (current.x + next.x) / 2
    const midY = (current.y + next.y) / 2

    // Q 命令：控制点 + 终点
    path += ` ${Math.round(current.x)} ${Math.round(current.y)}`
    path += ` ${Math.round(midX)} ${Math.round(midY)}`
  }

  // 最后一个点
  const last = points[points.length - 1]
  path += ` ${Math.round(last.x)} ${Math.round(last.y)}`

  return path
}
```

#### SVG Path 命令说明

| 命令 | 含义 | 参数 |
|------|------|------|
| `M` | Move to | `x y` - 移动到起点 |
| `L` | Line to | `x y` - 直线到目标点 |
| `Q` | Quadratic Bézier | `cx cy x y` - 控制点 + 终点 |

### 5. 画线动画

使用 CSS `stroke-dasharray` 和 `stroke-dashoffset` 实现"画线"动画效果：

```javascript
/**
 * 触发路径绘制动画
 * 原理：先将 dashoffset 设为路径总长度（隐藏），再动画到 0（显示）
 */
function animatePath(pathElement) {
  // 获取路径总长度
  const length = pathElement.getTotalLength()

  // 设置虚线模式：dash 和 gap 都等于总长度
  pathElement.style.strokeDasharray = `${length} ${length}`

  // 初始偏移：等于总长度（完全隐藏）
  pathElement.style.strokeDashoffset = length

  // 强制浏览器重排，确保初始状态生效
  pathElement.getBoundingClientRect()

  // 添加过渡动画
  pathElement.style.transition = 'stroke-dashoffset 0.5s ease-in-out'

  // 动画到偏移为 0（完全显示）
  pathElement.style.strokeDashoffset = '0'
}

/**
 * 重置动画（隐藏路径）
 */
function resetPath(pathElement) {
  const length = pathElement.getTotalLength()
  pathElement.style.transition = 'none'
  pathElement.style.strokeDashoffset = length
}
```

#### 动画原理图解

```
stroke-dasharray: [length] [length]
                  |---画笔---|---空白---|

stroke-dashoffset: length (初始)
线条：[                    ] ← 全部偏移到可视区域外

stroke-dashoffset: 0 (动画结束)
线条：[████████████████████] ← 画笔部分完全可见
```

### 6. Stimulus 控制器完整实现

```javascript
// topo_line_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["path", "startPoint"]
  static values = {
    line: Array,      // 归一化坐标数组
    width: Number,    // viewBox 宽度 (默认 400)
    height: Number    // viewBox 高度 (默认 300)
  }

  connect() {
    this.drawLine()
  }

  // 绘制线路（无动画）
  drawLine() {
    if (!this.hasPathTarget || !this.lineValue.length) return

    const scaledPoints = this.scalePoints(this.lineValue)
    const pathData = this.bezierCurve(scaledPoints)

    this.pathTarget.setAttribute('d', pathData)

    // 设置起点位置
    if (this.hasStartPointTarget && scaledPoints.length > 0) {
      const start = scaledPoints[0]
      this.startPointTarget.setAttribute('cx', start.x)
      this.startPointTarget.setAttribute('cy', start.y)
    }
  }

  // 点击起点时触发动画
  animate() {
    if (!this.hasPathTarget) return

    const length = this.pathTarget.getTotalLength()

    // 重置
    this.pathTarget.style.transition = 'none'
    this.pathTarget.style.strokeDasharray = `${length} ${length}`
    this.pathTarget.style.strokeDashoffset = length

    // 强制重排
    this.pathTarget.getBoundingClientRect()

    // 动画
    this.pathTarget.style.transition = 'stroke-dashoffset 0.5s ease-in-out'
    this.pathTarget.style.strokeDashoffset = '0'
  }

  // 坐标缩放
  scalePoints(points) {
    const width = this.widthValue || 400
    const height = this.heightValue || 300

    return points.map(p => ({
      x: p.x * width,
      y: p.y * height
    }))
  }

  // 贝塞尔曲线生成
  bezierCurve(points) {
    if (points.length < 2) return ''

    let path = `M ${points[0].x} ${points[0].y}`

    if (points.length === 2) {
      path += ` L ${points[1].x} ${points[1].y}`
      return path
    }

    path += ' Q'
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const midX = (curr.x + next.x) / 2
      const midY = (curr.y + next.y) / 2
      path += ` ${Math.round(curr.x)} ${Math.round(curr.y)} ${Math.round(midX)} ${Math.round(midY)}`
    }

    const last = points[points.length - 1]
    path += ` ${Math.round(last.x)} ${Math.round(last.y)}`

    return path
  }
}
```

## React 移植指南

### 组件设计

```tsx
interface TopoLineProps {
  imageUrl: string
  line: Array<{ x: number; y: number }>
  strokeColor?: string
  strokeWidth?: number
  animated?: boolean
  onStartPointClick?: () => void
}

function TopoLine({
  imageUrl,
  line,
  strokeColor = '#FF6B35',
  strokeWidth = 3,
  animated = true,
  onStartPointClick
}: TopoLineProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathData, setPathData] = useState('')

  // 计算路径数据
  useEffect(() => {
    const scaled = scalePoints(line, 400, 300)
    setPathData(bezierCurve(scaled))
  }, [line])

  // 动画函数
  const animate = useCallback(() => {
    if (!pathRef.current) return
    const length = pathRef.current.getTotalLength()
    // ... 动画逻辑
  }, [])

  return (
    <div className="relative">
      <img src={imageUrl} className="w-full" alt="" />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <path
          ref={pathRef}
          d={pathData}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {line.length > 0 && (
          <circle
            cx={line[0].x * 400}
            cy={line[0].y * 300}
            r="8"
            fill={strokeColor}
            className="pointer-events-auto cursor-pointer"
            onClick={() => {
              animate()
              onStartPointClick?.()
            }}
          />
        )}
      </svg>
    </div>
  )
}
```

### 自定义 Hook

```tsx
function useTopoLineAnimation(pathRef: RefObject<SVGPathElement>) {
  const animate = useCallback(() => {
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()

    path.style.transition = 'none'
    path.style.strokeDasharray = `${length} ${length}`
    path.style.strokeDashoffset = `${length}`

    // 强制重排
    path.getBoundingClientRect()

    path.style.transition = 'stroke-dashoffset 0.5s ease-in-out'
    path.style.strokeDashoffset = '0'
  }, [])

  const reset = useCallback(() => {
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDashoffset = `${length}`
  }, [])

  return { animate, reset }
}
```

## 数据管理建议

### 数据库 Schema

```typescript
interface RouteTopoLine {
  routeId: string
  imageId: string           // 关联的照片 ID
  line: TopoPoint[]         // 归一化坐标点
  startPoint?: TopoPoint    // 起点（可选，默认 line[0]）
  color?: string            // 线路颜色
  createdAt: Date
  updatedAt: Date
}

interface TopoPoint {
  x: number  // 0-1 范围
  y: number  // 0-1 范围
}
```

### 编辑器功能（未来扩展）

若需要实现线路编辑功能，可参考：

1. **点击添加点**：监听 SVG 点击事件，计算归一化坐标
2. **拖拽调整点**：为每个点添加可拖拽的圆形手柄
3. **删除点**：双击或长按删除
4. **撤销/重做**：使用状态栈管理历史

## 参考资源

- [Boolder GitHub](https://github.com/boolder-org/boolder-rails)
- [SVG Path 规范](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)
- [stroke-dasharray 动画技术](https://css-tricks.com/svg-line-animation-works/)
- [二次贝塞尔曲线](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#bezier_curves)

## 更新日志

| 日期 | 内容 |
|------|------|
| 2025-01-19 | 初始版本，基于 Boolder 项目研究 |
