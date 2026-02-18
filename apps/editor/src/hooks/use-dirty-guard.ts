import { useState, useCallback, useRef } from 'react'

export interface UseDirtyGuardOptions<TAction> {
  hasUnsavedChanges: () => boolean
  onSave: () => Promise<boolean>
  executeAction: (action: TAction) => void
}

export interface UseDirtyGuardReturn<TAction> {
  showUnsavedDialog: boolean
  /** Wrap navigation/switch actions through this guard */
  guardAction: (action: TAction) => void
  handleDiscard: () => void
  handleSaveAndProceed: () => Promise<void>
  handleDismiss: () => void
  /** For save-in-progress UI (button disabled states) */
  isSavingForGuard: boolean
}

export function useDirtyGuard<TAction>({
  hasUnsavedChanges,
  onSave,
  executeAction,
}: UseDirtyGuardOptions<TAction>): UseDirtyGuardReturn<TAction> {
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [isSavingForGuard, setIsSavingForGuard] = useState(false)
  const pendingActionRef = useRef<TAction | null>(null)

  const guardAction = useCallback((action: TAction) => {
    if (hasUnsavedChanges()) {
      pendingActionRef.current = action
      setShowUnsavedDialog(true)
      return
    }
    executeAction(action)
  }, [hasUnsavedChanges, executeAction])

  const handleDiscard = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    setShowUnsavedDialog(false)
    if (action) executeAction(action)
  }, [executeAction])

  const handleSaveAndProceed = useCallback(async () => {
    const action = pendingActionRef.current
    setIsSavingForGuard(true)
    try {
      const success = await onSave()
      if (success && action) {
        executeAction(action)
      }
    } finally {
      setIsSavingForGuard(false)
      pendingActionRef.current = null
      setShowUnsavedDialog(false)
    }
  }, [onSave, executeAction])

  const handleDismiss = useCallback(() => {
    pendingActionRef.current = null
    setShowUnsavedDialog(false)
  }, [])

  return {
    showUnsavedDialog,
    guardAction,
    handleDiscard,
    handleSaveAndProceed,
    handleDismiss,
    isSavingForGuard,
  }
}
