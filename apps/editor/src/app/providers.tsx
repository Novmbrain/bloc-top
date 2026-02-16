'use client'

import { ToastProvider } from '@bloctop/ui/components/toast'
import { FaceImageProvider } from '@bloctop/ui'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <FaceImageProvider>
        {children}
      </FaceImageProvider>
    </ToastProvider>
  )
}
