import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />
      }
      return renderDefaultFallback({ error: this.state.error, onReset: this.resetErrorBoundary })
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error
  onReset: () => void
}

// Render function instead of component to avoid react-refresh warning
function renderDefaultFallback({ error, onReset }: DefaultErrorFallbackProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card variant="elevated" className="max-w-md w-full">
        <CardContent className="text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-error-bg)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Something went wrong</h2>
          <p className="text-[var(--color-text-secondary)]">
            We encountered an unexpected error. Please try again or navigate back to the dashboard.
          </p>
          <details className="text-left p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
            <summary className="text-sm font-medium text-[var(--color-text-muted)] cursor-pointer">
              Error Details (click to expand)
            </summary>
            <pre className="mt-2 text-xs text-[var(--color-text-primary)] font-mono overflow-x-auto max-h-40 overflow-y-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
          <div className="flex gap-3 justify-center">
            <Button onClick={onReset} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} leftIcon={<Home className="w-4 h-4" />}>
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}