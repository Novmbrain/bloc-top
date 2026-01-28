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

// 多线路叠加配置（岩面共享模式）
export const TOPO_MULTI_LINE_CONFIG = {
  /** 未选中线路透明度 */
  inactiveOpacity: 0.4,
  /** 未选中线路颜色 */
  inactiveColor: '#888888',
  /** 未选中线路宽度 */
  inactiveStrokeWidth: 3,
  /** 未选中线路外层描边宽度 */
  inactiveOutlineWidth: 5,
  /** 未选中起点标记半径 */
  inactiveMarkerRadius: 6,

  /** 选中线路起点标记半径 (略大于普通起点) */
  selectedMarkerRadius: 10,

  /** 切换动画：淡出时间 (ms) */
  fadeOutDuration: 50,
  /** 切换动画：淡入时间 (ms) */
  fadeInDuration: 50,
  /** 切换动画：画线动画延迟 (ms) */
  drawAnimationDelay: 100,
} as const
