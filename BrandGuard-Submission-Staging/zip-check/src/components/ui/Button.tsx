import React, { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth = false, disabled, children, asChild = false, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-inverse)] shadow-md hover:shadow-lg focus-visible:ring-[var(--color-accent-primary)]',
      secondary: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] focus-visible:ring-[var(--color-border)]',
      outline: 'bg-transparent text-[var(--color-accent-primary)] border-2 border-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)] hover:text-[var(--color-text-inverse)] focus-visible:ring-[var(--color-accent-primary)]',
      ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-border)]',
      danger: 'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white focus-visible:ring-[var(--color-error)]'
    }
    const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2 text-base gap-2', lg: 'px-6 py-3 text-lg gap-2.5' }

    const commonProps = {
      className: `${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`,
      disabled: disabled || isLoading,
      ...props
    }

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement
      return React.cloneElement(child, {
        ...commonProps,
        className: `${child.props.className || ''} ${commonProps.className}`,
        onClick: (e: React.MouseEvent) => {
          if (commonProps.disabled) { e.preventDefault(); return; }
          child.props.onClick?.(e);
        }
      },
      <>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : leftIcon ? <span className="flex-shrink-0">{leftIcon}</span> : null}
        {child.props.children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
      )
    }

    return (
      <button ref={ref} {...commonProps}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : leftIcon ? <span className="flex-shrink-0">{leftIcon}</span> : null}
        {children}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'