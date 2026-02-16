'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@bloctop/shared/utils'
import { CompositionInput } from './composition-input'

const inputVariants = cva(
  'w-full text-sm outline-none transition-all duration-200',
  {
    variants: {
      variant: {
        form: 'px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)]',
        search: 'h-10 pl-10 pr-10 focus:outline-none',
        unstyled: '',
      },
    },
    defaultVariants: {
      variant: 'form',
    },
  }
)

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> &
  VariantProps<typeof inputVariants> & {
    onChange: (value: string) => void
    /** Set false to skip auto theme styles. Default true for form/search variants. */
    themed?: boolean
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ variant = 'form', themed = true, className, style, ...props }, ref) {
    const themeStyle = themed && variant !== 'unstyled'
      ? {
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-on-surface)',
          ...style,
        }
      : style

    return (
      <CompositionInput
        ref={ref}
        type="text"
        data-slot="input"
        data-variant={variant}
        className={cn(inputVariants({ variant }), className)}
        style={themeStyle}
        {...props}
      />
    )
  }
)

export { Input, inputVariants }
