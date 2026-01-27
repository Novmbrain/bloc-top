/**
 * Topo 线路渲染常量配置
 * 统一管理所有 Topo 相关的尺寸、样式和动画参数
 */

// SVG viewBox 尺寸
export const TOPO_VIEW_WIDTH = 400
export const TOPO_VIEW_HEIGHT = 300

// 线路样式
export const TOPO_LINE_CONFIG = {
  /** 主线条宽度 */
  strokeWidth: 4,
  /** 外层描边宽度 (增加可见性) */
  outlineWidth: 6,
  /** 外层描边透明度 */
  outlineOpacity: 0.5,
  /** 线条端点样式 */
  strokeLinecap: 'round' as const,
  /** 线条连接样式 */
  strokeLinejoin: 'round' as const,
} as const

// 控制点样式
export const TOPO_MARKER_CONFIG = {
  /** 起点半径 */
  startRadius: 10,
  /** 终点半径 */
  endRadius: 8,
  /** 描边宽度 */
  strokeWidth: 2,
  /** 终点描边宽度 */
  endStrokeWidth: 3,
} as const

// 动画配置
export const TOPO_ANIMATION_CONFIG = {
  /** 动画持续时间 */
  duration: '0.8s',
  /** 动画缓动函数 */
  easing: 'ease-out',
  /** 抽屉内自动播放延迟 (ms) */
  autoPlayDelayDrawer: 300,
  /** 全屏模式自动播放延迟 (ms) */
  autoPlayDelayFullscreen: 500,
} as const
