import React from 'react'

export function FormField({
  label,
  children,
  disabled,
}: {
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: 'var(--theme-on-surface-variant)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
