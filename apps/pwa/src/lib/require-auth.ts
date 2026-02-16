// Re-export bridge: require-auth logic now lives in @bloctop/shared
// Binds createRequireAuth with this app's better-auth instance
import { createRequireAuth } from '@bloctop/shared/require-auth'
import { getAuth } from '@/lib/auth'

export type { AuthInfo } from '@bloctop/shared/require-auth'

export const requireAuth = createRequireAuth(() => getAuth())
