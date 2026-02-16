'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from '@bloctop/ui/components/input'

interface AreaSelectProps {
  areas: string[]
  value: string
  onChange: (area: string) => void
  placeholder?: string
  label?: string
  error?: string
  required?: boolean
}

const CREATE_SENTINEL = '__create__'

export function AreaSelect({
  areas,
  value,
  onChange,
  placeholder = '选择区域...',
  label,
  error,
  required,
}: AreaSelectProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input when switching to create mode
  useEffect(() => {
    if (mode === 'create') {
      // Allow the DOM to update before focusing
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [mode])

  const commitDraft = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed) {
      onChange(trimmed)
      setDraft('')
      setMode('select')
    }
  }, [draft, onChange])

  const cancelCreate = useCallback(() => {
    setDraft('')
    setMode('select')
  }, [])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === CREATE_SENTINEL) {
      setMode('create')
      return
    }
    onChange(v)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelCreate()
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the blur was caused by clicking the cancel button, do nothing here;
    // the cancel handler will take care of it.
    const related = e.relatedTarget as HTMLElement | null
    if (related?.dataset?.areaCancel) return

    const trimmed = draft.trim()
    if (trimmed) {
      commitDraft()
    } else {
      cancelCreate()
    }
  }

  const borderColor = error
    ? 'var(--theme-error, #ef4444)'
    : 'var(--theme-outline-variant)'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-sm font-medium"
          style={{ color: 'var(--theme-on-surface)' }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--theme-error, #ef4444)' }} aria-hidden>
              {' *'}
            </span>
          )}
        </label>
      )}

      {mode === 'select' ? (
        <select
          value={value}
          onChange={handleSelectChange}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-primary)]"
          style={{
            backgroundColor: 'var(--theme-surface)',
            color: 'var(--theme-on-surface)',
            border: `1px solid ${borderColor}`,
          }}
        >
          <option value="">{placeholder}</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
          <option value={CREATE_SENTINEL}>+ 新建区域</option>
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={setDraft}
            placeholder="输入新区域名称"
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="flex-1"
            style={{
              border: `1px solid ${borderColor}`,
            }}
          />
          <button
            type="button"
            data-area-cancel=""
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelCreate}
            className="shrink-0 text-sm whitespace-nowrap transition-colors"
            style={{ color: 'var(--theme-on-surface-variant)' }}
          >
            取消
          </button>
        </div>
      )}

      {error && (
        <p
          className="text-xs"
          style={{ color: 'var(--theme-error, #ef4444)' }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
