import { getAuth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { canAccessEditor } from '@/lib/permissions'
import type { UserRole } from '@/types'

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getAuth()
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect('/login')
  }

  const role = ((session.user as { role?: string }).role || 'user') as UserRole
  const hasAccess = await canAccessEditor(session.user.id, role)

  if (!hasAccess) {
    redirect('/login')
  }

  return <>{children}</>
}
