import { useState, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'

interface PasskeyInfo {
  id: string
  name?: string | null
  createdAt: Date
  aaguid?: string | null
  deviceType?: string | null
  backedUp?: boolean | null
}

export function usePasskeyManagement() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authClient.passkey.listUserPasskeys().then((res) => {
      setPasskeys(res.data ?? [])
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const addPasskey = useCallback(async (name?: string) => {
    const result = await authClient.passkey.addPasskey({ name })
    if (result.data) {
      setPasskeys((prev) => [...prev, result.data!])
    }
    return result
  }, [])

  const deletePasskey = useCallback(async (id: string) => {
    await authClient.passkey.deletePasskey({ id })
    setPasskeys((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { passkeys, isLoading, addPasskey, deletePasskey }
}
