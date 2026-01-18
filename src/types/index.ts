// 线路数据类型
export interface Route {
  id: number
  name: string
  grade: string // V0-V13 或 "？"
  cragId: string
  area: string
  setter?: string
  FA?: string
  description?: string
  image?: string
  betaLinks?: BetaLink[] // Beta 视频链接
}

// 岩场坐标类型
export interface Coordinates {
  lng: number  // 经度
  lat: number  // 纬度
}

// 接近路径点类型 (用于 KML 导入后的路径绘制)
export interface ApproachPath {
  id: string
  name: string
  points: Coordinates[]  // 路径点数组
  color?: string         // 路径颜色
  description?: string   // 路径描述
}

// 岩场数据类型
export interface Crag {
  id: string
  name: string
  location: string
  developmentTime: string
  description: string
  approach: string
  coverImages?: string[]
  coordinates?: Coordinates     // 岩场坐标 (用于地图标记)
  approachPaths?: ApproachPath[] // 接近路径 (用于 KML 导入)
}

// 评论数据类型
export interface Comment {
  id: string
  routeId: number
  content: string
  author: string
  avatar?: string
  createdAt: Date
}

// Beta 视频类型
export interface BetaVideo {
  id: string
  routeId: number
  url: string
  author: string
  createdAt: Date
}

// 用户类型
export interface User {
  id: string
  nickName: string
  avatarUrl?: string
}

// 难度等级范围
export const GRADE_LEVELS = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11',
  'V12', 'V13'
] as const

export type GradeLevel = typeof GRADE_LEVELS[number]

// Beta 视频平台类型（目前仅支持小红书）
export type BetaPlatform = 'xiaohongshu'

// Beta 链接数据类型
export interface BetaLink {
  id: string
  platform: BetaPlatform
  noteId: string           // 小红书笔记 ID（用于去重）
  url: string              // 解析后的最终 URL
  originalUrl?: string     // 原始短链接（如果经过解析）
  title?: string
  author?: string
  // 提交者身体数据（可选）
  climberHeight?: number  // 身高 (cm)
  climberReach?: number   // 臂长 (cm)
  createdAt?: Date
}
