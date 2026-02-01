'use client'

import { useState, useRef, useEffect, useCallback, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

/**
 * Input that handles IME composition correctly.
 * Uses an internal localValue state so the DOM stays responsive during
 * composition (Chinese IME, mobile predictive text, etc.), while only
 * propagating the final value to the parent via onChange.
 */
export const CompositionInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange: (value: string) => void
  }
>(function CompositionInput({ onChange, value, ...props }, ref) {
  const [localValue, setLocalValue] = useState(value ?? '')
  const isComposing = useRef(false)

  // Sync from external value when not composing
  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value ?? '')
    }
  }, [value])

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
  const isComposing = useRef(false)

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value ?? '')
    }
  }, [value])

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
