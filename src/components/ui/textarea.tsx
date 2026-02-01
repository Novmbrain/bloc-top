'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { CompositionTextarea } from './composition-input'

const textareaVariants = cva(
  'w-full text-sm resize-none outline-none transition-all duration-200',
  {
    variants: {
      variant: {
        form: 'px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)]',
        unstyled: '',
      },
    },
    defaultVariants: {
      variant: 'form',
    },
  }
)

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> &
  VariantProps<typeof textareaVariants> & {
    onChange: (value: string) => void
    themed?: boolean
  }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ variant = 'form', themed = true, className, style, ...props }, ref) {
    const themeStyle = themed && variant !== 'unstyled'
      ? {
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-on-surface)',
          ...style,
        }
      : style

    return (
      <CompositionTextarea
        ref={ref}
        data-slot="textarea"
        data-variant={variant}
        className={cn(textareaVariants({ variant }), className)}
        style={themeStyle}
        {...props}
      />
    )
  }
)

export { Textarea, textareaVariants }
