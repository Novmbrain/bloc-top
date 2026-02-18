import type { Route } from '@bloctop/shared/types'

export interface R2FaceInfo {
  faceId: string
  area: string
}

export interface FaceGroup {
  faceId: string
  area: string
  routes: Route[]
  imageUrl: string
}
