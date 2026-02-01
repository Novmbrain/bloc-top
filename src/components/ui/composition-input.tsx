'use client'

import { useRef, useCallback, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

/**
 * Input that handles IME composition correctly.
 * During composition (e.g. Chinese input), onChange is suppressed
 * to prevent React state updates from interrupting the IME session.
 */
export const CompositionInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange: (value: string) => void
  }
>(function CompositionInput({ onChange, ...props }, ref) {
  const isComposing = useRef(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isComposing.current) {
        onChange(e.target.value)
      }
    },
    [onChange]
  )

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false
      onChange(e.currentTarget.value)
    },
    [onChange]
  )

  return (
    <input
      ref={ref}
      {...props}
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
>(function CompositionTextarea({ onChange, ...props }, ref) {
  const isComposing = useRef(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isComposing.current) {
        onChange(e.target.value)
      }
    },
    [onChange]
  )

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposing.current = false
      onChange(e.currentTarget.value)
    },
    [onChange]
  )

  return (
    <textarea
      ref={ref}
      {...props}
      onChange={handleChange}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={handleCompositionEnd}
    />
  )
})
