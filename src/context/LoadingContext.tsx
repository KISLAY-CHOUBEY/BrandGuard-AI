import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'

interface LoadingState {
  [key: string]: boolean
}

interface LoadingContextType {
  loadingStates: LoadingState
  setLoading: (key: string, isLoading: boolean) => void
  isLoading: (key: string) => boolean
  withLoading: <T,>(key: string, fn: () => Promise<T>) => Promise<T>
}

const LoadingContext = createContext<LoadingContextType | null>(null)

interface LoadingProviderProps {
  children: ReactNode
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({})

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] === true
  }, [loadingStates])

  const withLoading = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    setLoading(key, true)
    try {
      return await fn()
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  const value = useMemo(() => ({ loadingStates, setLoading, isLoading, withLoading }), [loadingStates, setLoading, isLoading, withLoading])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

export function useLoadingKey(key: string) {
  const { isLoading, setLoading, withLoading } = useLoading()
  return {
    isLoading: isLoading(key),
    setLoading: (value: boolean) => setLoading(key, value),
    withLoading: <T,>(fn: () => Promise<T>) => withLoading(key, fn)
  }
}