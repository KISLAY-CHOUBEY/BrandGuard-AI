import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Guidelines } from '@/pages/Guidelines'
import { Submit } from '@/pages/Submit'
import { Reviews } from '@/pages/Reviews'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">Loading...</p>
      </div>
    </div>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="animate-fade-in">{children}</div>
    </Suspense>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--color-error-bg)] flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-[var(--color-error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">Page Not Found</h1>
      <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <a href="/" className="px-6 py-3 bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-inverse)] rounded-lg font-medium hover:shadow-lg transition-shadow">
          Go Home
        </a>
        <a href="/guidelines" className="px-6 py-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-bg-hover)] transition-colors">
          Browse Guidelines
        </a>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={
            <PageWrapper>
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="guidelines" element={
            <PageWrapper>
              <ErrorBoundary>
                <Guidelines />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="submit" element={
            <PageWrapper>
              <ErrorBoundary>
                <Submit />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="reviews" element={
            <PageWrapper>
              <ErrorBoundary>
                <Reviews />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="reviews/:id" element={
            <PageWrapper>
              <ErrorBoundary>
                <Reviews />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="history" element={
            <PageWrapper>
              <ErrorBoundary>
                <History />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="settings" element={
            <PageWrapper>
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            </PageWrapper>
          } />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App