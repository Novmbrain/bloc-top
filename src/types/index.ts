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

// 岩场数据类型
export interface Crag {
  id: string
  name: string
  location: string
  developmentTime: string
  description: string
  approach: string
  coverImages?: string[]
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
  url: string              // 解析后的最终 URL
  originalUrl?: string     // 原始短链接（如果经过解析）
  title?: string
  author?: string
  // 提交者身体数据（可选）
  climberHeight?: number  // 身高 (cm)
  climberReach?: number   // 臂长 (cm)
  createdAt?: Date
}
