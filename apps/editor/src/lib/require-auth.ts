import { createRequireAuth } from '@bloctop/shared/require-auth'
import { getAuth } from '@/lib/auth'

export const requireAuth = createRequireAuth(() => getAuth())
