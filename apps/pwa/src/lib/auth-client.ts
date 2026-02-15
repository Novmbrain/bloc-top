import { createAuthClient } from 'better-auth/react'
import { magicLinkClient, adminClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'

export const authClient = createAuthClient({
  // 不设 baseURL — 客户端自动使用当前 origin 的相对路径，
  // 避免 www.bouldering.top 与 bouldering.top 的跨域问题
  plugins: [
    adminClient(),
    magicLinkClient(),
    passkeyClient(),
  ],
})

export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient
