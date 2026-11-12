import React, { forwardRef, HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = '', variant = 'text', width = '100%', height, animation = 'pulse', ...props }, ref) => {
    const baseStyles = 'bg-[var(--color-bg-tertiary)] rounded animate-pulse overflow-hidden'
    const animations = {
      pulse: 'animate-pulse',
      wave: 'animate-wave',
      none: ''
    }
    const variants = {
      text: 'h-4',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
      card: 'rounded-xl'
    }

    const style: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${animations[animation]} ${className}`}
        style={style}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number
  width?: string
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className = '', lines = 3, width = '100%', ...props }, ref) => {
    return (
      <div ref={ref} className={`space-y-2 ${className}`} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : width} />
        ))}
      </div>
    )
  }
)

SkeletonText.displayName = 'SkeletonText'

interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  hasImage?: boolean
  lines?: number
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className = '', hasImage = true, lines = 3, ...props }, ref) => {
    return (
      <div ref={ref} className={`bg-[var(--gradient-card)] border border-[var(--color-border)] rounded-xl p-6 space-y-4 ${className}`} {...props}>
        {hasImage && <Skeleton variant="rectangular" height={160} width="100%" />}
        <Skeleton variant="text" width="40%" />
        <SkeletonText lines={lines} />
      </div>
    )
  }
)

SkeletonCard.displayName = 'SkeletonCard'

interface SkeletonTableRowProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number
}

export const SkeletonTableRow = forwardRef<HTMLDivElement, SkeletonTableRowProps>(
  ({ className = '', columns = 4, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex gap-4 p-4 border-b border-[var(--color-border)] ${className}`} {...props}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} />
        ))}
      </div>
    )
  }
)

SkeletonTableRow.displayName = 'SkeletonTableRow'

export const LoadingSpinner = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { size?: 'sm' | 'md' | 'lg' }>(
  ({ className = '', size = 'md', ...props }, ref) => {
    const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
    return (
      <div ref={ref} className={`${sizes[size]} animate-spin text-[var(--color-accent-primary)] ${className}`} role="status" aria-label="Loading" {...props}>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }
)

LoadingSpinner.displayName = 'LoadingSpinner'

export const LoadingOverlay = ({ isLoading, children, message = 'Loading...' }: { isLoading: boolean; children: React.ReactNode; message?: string }) => {
  if (!isLoading) return <>{children}</>

  return (
    <div className="relative min-h-[200px]">
      <div className="absolute inset-0 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm z-10 flex items-center justify-center" role="status" aria-live="polite" aria-label={message}>
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-[var(--color-text-secondary)] text-sm">{message}</p>
        </div>
      </div>
      <div className="pointer-events-none opacity-50">{children}</div>
    </div>
  )
}