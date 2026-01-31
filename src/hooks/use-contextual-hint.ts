'use client'

import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY = 'hints-dismissed'

/**
 * 读取已关闭的提示集合
 */
function getDismissedHints(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

/**
 * 保存已关闭的提示集合
 */
function saveDismissedHints(hints: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hints]))
  } catch {
    // localStorage 不可用，忽略
  }
}

// 简单的发布-订阅，用于 useSyncExternalStore
let listeners: Array<() => void> = []
function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}
function emitChange() {
  listeners.forEach(l => l())
}

/**
 * 上下文提示管理 Hook
 *
 * 每个 hintKey 对应一个一次性提示，关闭后永久不再显示。
 * 状态存储在 localStorage 的 `hints-dismissed` JSON 数组中。
 */
export function useContextualHint(key: string) {
  const visible = useSyncExternalStore(
    subscribe,
    () => !getDismissedHints().has(key),
    () => false, // SSR: 不显示
  )

  const dismiss = useCallback(() => {
    const dismissed = getDismissedHints()
    dismissed.add(key)
    saveDismissedHints(dismissed)
    emitChange()
  }, [key])

  return { visible, dismiss }
}
