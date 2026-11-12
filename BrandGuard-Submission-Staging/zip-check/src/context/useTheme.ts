import { createContext, useContext } from 'react'

type Theme = 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark'
  setTheme: () => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

export { ThemeContext }
