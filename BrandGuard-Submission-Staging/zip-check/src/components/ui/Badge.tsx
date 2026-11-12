import React, { forwardRef, HTMLAttributes } from 'react'
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
      success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30',
      warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/30',
      error: 'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error)]/30',
      info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/30',
      accent: 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-inverse)] border-none'
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    }

    const icons = {
      success: <Check className="w-3 h-3" />,
      warning: <AlertTriangle className="w-3 h-3" />,
      error: <AlertCircle className="w-3 h-3" />,
      info: <Info className="w-3 h-3" />
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {dot && icons[variant as keyof typeof icons]}
        {children}
      </span>
    )
  }
)
Badge.displayName = 'Badge'

interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose: (id: string) => void
  duration?: number
}

export function Toast({ id, type, message, onClose }: ToastProps) {
  const icons = {
    success: <Check className="w-5 h-5 text-[var(--color-success)]" />,
    error: <AlertCircle className="w-5 h-5 text-[var(--color-error)]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />,
    info: <Info className="w-5 h-5 text-[var(--color-info)]" />
  }

  const backgrounds = {
    success: 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30',
    error: 'bg-[var(--color-error-bg)] border-[var(--color-error)]/30',
    warning: 'bg-[var(--color-warning-bg)] border-[var(--color-warning)]/30',
    info: 'bg-[var(--color-info-bg)] border-[var(--color-info)]/30'
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-in ${backgrounds[type]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--color-text-primary)] text-sm">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToasterProps {
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string; duration?: number }>
  onClose: (id: string) => void
}

export function Toaster({ toasts, onClose }: ToasterProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[var(--z-toast)] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}