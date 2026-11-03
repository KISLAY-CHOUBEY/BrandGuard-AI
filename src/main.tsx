import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context/AppContext'
import { useApp } from './context/useApp'
import { ThemeProvider } from './context/ThemeContext'
import { Toaster } from './components/ui/Badge'
import './styles/globals.css'

export function ToastProvider() {
  const { toasts, removeToast } = useApp()
  return <Toaster toasts={toasts} onClose={removeToast} />
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <App />
          <ToastProvider />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)