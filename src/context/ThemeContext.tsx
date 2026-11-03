import React, { useEffect, useState, useCallback, ReactNode } from 'react'
import { ThemeContext } from './useTheme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  const setTheme = useCallback(() => {}, [])
  const toggleTheme = useCallback(() => {}, [])

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme: () => {}, toggleTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}


