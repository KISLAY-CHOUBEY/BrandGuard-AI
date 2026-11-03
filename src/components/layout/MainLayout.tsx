import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileSidebar } from './Sidebar'
import { Header } from './Header'
import { PremiumBackground } from '@/components/ui/AtmosphericBackground'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen relative">
      {/* Premium atmospheric background - CSS layers + enhanced Three.js */}
      <PremiumBackground />

      {/* Desktop Sidebar - receives collapsed state from MainLayout */}
      <Sidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />

      {/* Mobile Sidebar Overlay - only renders on mobile */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <main
        className={`
          min-h-screen pt-[var(--header-height)]
          transition-all duration-300
          ${sidebarCollapsed ? 'ml-0 lg:ml-[var(--sidebar-collapsed)]' : 'ml-0 lg:ml-[var(--sidebar-width)]'}
        `}
      >
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <div className="p-6 lg:p-8 max-w-[var(--content-max)] mx-auto w-full">
          <div className="page-transition">
            <Outlet key={location.pathname} />
          </div>
        </div>
      </main>
    </div>
  )
}