# TopoLine 曲线算法研究报告

> 研究目标：找到替代当前贝塞尔曲线的插值算法，保证曲线穿过所有标注点

## Executive Summary

当前项目使用**二次贝塞尔曲线 (Quadratic Bezier)** 渲染 TopoLine，这是一种**逼近型曲线**——标注点作为控制点，曲线不保证穿过它们。推荐替换为 **Centripetal Catmull-Rom 样条**，它是一种**插值型曲线**，数学上保证穿过每个标注点，且不会产生自交和尖点。

**置信度**: 高 — Catmull-Rom 是曲线插值领域的成熟算法，广泛用于游戏引擎、动画和 SVG 路径生成。

---

## 1. 当前问题分析

### 现有实现 (`src/lib/topo-utils.ts` → `bezierCurve()`)

```
算法: 二次贝塞尔 (SVG Q 命令)
行为: 标注点作为控制点，曲线终点是相邻点的中点
问题: 曲线"趋向"控制点但不穿过它们
```

**具体表现**：
- 标注一个长方形的四个角点 → 曲线变成圆润的弧形，不经过四个角
- 标注一条有急转弯的线路 → 曲线过度平滑，偏离实际线路轨迹
- 标注点越少，偏离越明显

### 问题根源

二次贝塞尔曲线的数学性质：
```
Q(t) = (1-t)²·P0 + 2t(1-t)·P1 + t²·P2
```
控制点 P1 只影响曲线"弯曲方向"，曲线最近点到 P1 的距离 = P1 到起止点连线距离的 50%。

---

## 2. 候选算法对比

| 算法 | 穿过所有点 | 平滑度 | 无自交保证 | 实现难度 | SVG 兼容 |
|------|-----------|--------|-----------|---------|---------|
| 二次贝塞尔 (现有) | ❌ | C⁰ | ❌ | 简单 | 原生 |
| 三次贝塞尔 (Cubic Bezier) | ❌ | C² | ❌ | 简单 | 原生 |
| **Uniform Catmull-Rom** | ✅ | C¹ | ❌ | 中等 | 转换后 |
| **Centripetal Catmull-Rom** | ✅ | C¹ | ✅ | 中等 | 转换后 |
| Chordal Catmull-Rom | ✅ | C¹ | ✅ | 中等 | 转换后 |
| Natural Cubic Spline | ✅ | C² | ❌ | 较高 | 转换后 |
| B-Spline | ❌ | C² | ❌ | 较高 | 转换后 |

### 推荐: Centripetal Catmull-Rom (α=0.5)

**选择理由**：
1. **数学保证穿过所有控制点** — 核心需求
2. **α=0.5 保证无尖点和自交** — Uniform (α=0) 在点间距不均匀时会产生环状自交
3. **可无损转换为 SVG 三次贝塞尔 (C 命令)** — 与现有 SVG 渲染完全兼容
4. **只需要指定标注点，自动计算切线** — 不需要额外的控制点输入
5. **实现代码量约 30-40 行** — 替换成本低

---

## 3. Centripetal Catmull-Rom 算法详解

### 3.1 核心原理

给定 4 个连续点 P0, P1, P2, P3，算法生成 P1 到 P2 之间的平滑曲线段。

```
P0 ----→ P1 ========> P2 ----→ P3
 (影响切线)  (实际曲线段)  (影响切线)
```

### 3.2 参数化

Centripetal 参数化 (α=0.5) 使用弦长的平方根作为参数间距：

```
t0 = 0
t1 = t0 + |P1 - P0|^α     (α = 0.5 → 取距离的平方根)
t2 = t1 + |P2 - P1|^α
t3 = t2 + |P3 - P2|^α
```

### 3.3 切线计算

```
m1 = (1 - tension) * (P2 - P1 + t12 * ((P1 - P0)/t01 - (P2 - P0)/(t01 + t12)))
m2 = (1 - tension) * (P2 - P1 + t12 * ((P3 - P2)/t23 - (P3 - P1)/(t12 + t23)))
```

其中 tension = 0 (标准 Catmull-Rom), t01/t12/t23 是参数间距。

### 3.4 转换为 SVG 三次贝塞尔

每个 Catmull-Rom 段 (P1→P2) 转换为一个 SVG C 命令：

```
C命令: C cp1x,cp1y cp2x,cp2y P2x,P2y

cp1 = P1 + m1/3
cp2 = P2 - m2/3
```

### 3.5 端点处理

首尾点没有 P0 或 P3，使用"虚拟端点"（复制首/尾点）：

```
首段: P0 = P1 (复制起点)
末段: P3 = P2 (复制终点)
```

---

## 4. 实现方案

### 4.1 替换 `bezierCurve()` 为 `catmullRomCurve()`

```typescript
// 伪代码 - 实际实现见 /sc:implement
function catmullRomCurve(points: TopoPoint[], alpha = 0.5): string {
  // 1. 处理 < 2 点
  // 2. 处理 2 点 → 直线
  // 3. 构建扩展点数组 (首尾复制)
  // 4. 每 4 点一组，计算 centripetal 参数化
  // 5. 计算切线 m1, m2
  // 6. 转换为贝塞尔控制点: cp1 = P1 + m1/3, cp2 = P2 - m2/3
  // 7. 输出 SVG: M startX startY C cp1x,cp1y cp2x,cp2y endX,endY ...
}
```

### 4.2 对现有代码的影响

| 文件 | 改动 |
|------|------|
| `src/lib/topo-utils.ts` | 新增 `catmullRomCurve()`，保留 `bezierCurve()` 备用 |
| `src/components/topo-line-overlay.tsx` | `bezierCurve` → `catmullRomCurve` (1 行) |
| `src/components/multi-topo-line-overlay.tsx` | 同上 (1 行) |
| `src/app/[locale]/editor/` | Topo 编辑器预览也需要切换 |
| `src/lib/topo-utils.test.ts` | 新增测试用例 |

### 4.3 向后兼容

- **数据格式不变**: `TopoPoint[]` (归一化 0-1 坐标) 完全不变
- **API 不变**: 函数签名 `(points: TopoPoint[]) => string` 不变
- **渲染不变**: 输出仍然是 SVG path `d` 属性字符串
- **动画不变**: `stroke-dasharray` 动画机制不受影响

---

## 5. 视觉效果对比预期

### 场景 1: 直线型线路 (2 点)
- 现有: 直线 → 新算法: 直线 (无变化)

### 场景 2: 简单弧形 (3 点)
- 现有: 不穿过中间点 → 新算法: 精确穿过中间点

### 场景 3: S 形转弯 (4+ 点)
- 现有: 过度平滑，偏离标注路径 → 新算法: 精确穿过每个标注点，自然 S 弯

### 场景 4: 急转弯/锯齿 (点间距不均匀)
- Uniform CR: 可能产生环状自交 → **Centripetal CR: 无自交保证**

---

## 6. tension 参数的可扩展性

Catmull-Rom 支持 `tension` 参数 (0-1)：
- `tension = 0`: 标准平滑曲线 (默认)
- `tension = 0.5`: 更紧凑的曲线
- `tension = 1`: 完全折线 (线性插值)

未来可在编辑器中暴露 tension 滑块，让用户微调线路曲线的"松紧度"。

---

## Sources

- [Centripetal Catmull-Rom spline - Wikipedia](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline)
- [Catmull-Rom spline - Wikipedia](https://en.wikipedia.org/wiki/Catmull%E2%80%93Rom_spline)
- [Smooth Paths Using Catmull-Rom Splines - Mika's Coding Bits](https://qroph.github.io/2018/07/30/smooth-paths-using-catmull-rom-splines.html)
- [Catmull-Rom to Bezier conversion - njvack/GitHub Gist](https://gist.github.com/njvack/6925609)
- [ariutta/catmullrom2bezier - GitHub](https://github.com/ariutta/catmullrom2bezier)
- [Properties of Catmull-Rom Splines - splines.readthedocs.io](https://splines.readthedocs.io/en/latest/euclidean/catmull-rom-properties.html)
- [Conversion Between Cubic Bezier Curves and Catmull-Rom Splines - Springer](https://link.springer.com/article/10.1007/s42979-021-00770-x)
- [How to create nice looking SVG curves - JointJS](https://www.jointjs.com/blog/how-to-create-nice-looking-curves-in-svg-with-fixed-tangents)
- [cardinal-spline-js - GitHub](https://github.com/gdenisov/cardinal-spline-js)
- [SVG Path Enhancements - W3C](https://www.w3.org/Graphics/SVG/WG/wiki/Path_Enhancements)
