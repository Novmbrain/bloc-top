'use client'

import { useState, useRef, useCallback, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

/**
 * Input that handles IME composition correctly.
 * Uses an internal localValue state so the DOM stays responsive during
 * composition (Chinese IME, mobile predictive text, etc.), while only
 * propagating the final value to the parent via onChange.
 *
 * External value sync: when the parent updates `value` outside of composition,
 * we detect the change by comparing with a state-tracked previous value and
 * re-sync localValue. This avoids useEffect + setState and ref access during render.
 */
export const CompositionInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange: (value: string) => void
  }
>(function CompositionInput({ onChange, value, ...props }, ref) {
  const [localValue, setLocalValue] = useState(value ?? '')
  const [prevExternal, setPrevExternal] = useState(value)
  const isComposing = useRef(false)

  // Derived state pattern: sync from external value (no useEffect needed)
  if (value !== prevExternal) {
    setPrevExternal(value)
    if (!isComposing.current) { // eslint-disable-line react-hooks/refs -- reading isComposing during render is intentional for IME sync
      setLocalValue(value ?? '')
    }
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      if (!isComposing.current) {
        onChange(newValue)
      }
    },
    [onChange]
  )

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false
      const finalValue = e.currentTarget.value
      setLocalValue(finalValue)
      onChange(finalValue)
    },
    [onChange]
  )

  return (
    <input
      ref={ref}
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={handleCompositionEnd}
    />
  )
})

/**
 * Textarea that handles IME composition correctly.
 */
export const CompositionTextarea = forwardRef<
  HTMLTextAreaElement,
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
    onChange: (value: string) => void
  }
>(function CompositionTextarea({ onChange, value, ...props }, ref) {
  const [localValue, setLocalValue] = useState(value ?? '')
  const [prevExternal, setPrevExternal] = useState(value)
  const isComposing = useRef(false)

  if (value !== prevExternal) {
    setPrevExternal(value)
    if (!isComposing.current) { // eslint-disable-line react-hooks/refs -- reading isComposing during render is intentional for IME sync
      setLocalValue(value ?? '')
    }
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      if (!isComposing.current) {
        onChange(newValue)
      }
    },
    [onChange]
  )

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposing.current = false
      const finalValue = e.currentTarget.value
      setLocalValue(finalValue)
      onChange(finalValue)
    },
    [onChange]
  )

  return (
    <textarea
      ref={ref}
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={handleCompositionEnd}
    />
  )
})
