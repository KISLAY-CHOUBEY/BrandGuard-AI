import React from 'react'
import { Link, useLocation, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, ClipboardCheck, History, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const navIcons = {
  LayoutDashboard, BookOpen, FileText, ClipboardCheck, History, Settings
}

interface SidebarProps {
  collapsed: boolean
  onCollapseChange: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, onCollapseChange }: SidebarProps) {
  const { navItems, setCurrentView } = useApp()
  const location = useLocation()

  const handleNavClick = (href: string) => {
    setCurrentView((href.slice(1) || 'dashboard') as 'dashboard' | 'guidelines' | 'submit' | 'review' | 'history' | 'settings')
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-[var(--gradient-card)] border-r border-[var(--color-border)]
        transition-all duration-300 z-[var(--z-sticky)] hidden lg:block
        ${collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'}
      `}
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full">
        <div className={`flex items-center justify-between h-[var(--header-height)] px-4 border-b border-[var(--color-border)] ${collapsed ? 'justify-center' : ''}`}>
          <Link to="/" className="flex items-center gap-2" aria-label="ThroneCaptures Home">
            {!collapsed && <span className="font-display font-bold text-lg text-[var(--color-text-primary)]">ThroneCaptures</span>}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onCollapseChange(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex-shrink-0">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto" aria-label="Main navigation">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => {
              const Icon = navIcons[item.icon as keyof typeof navIcons]
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <NavLink to={item.href} onClick={() => handleNavClick(item.href)} className={({ isActive: active }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${active ? 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'}
                    ${collapsed ? 'justify-center' : ''}
                  `} title={collapsed ? item.label : undefined} aria-current={isActive ? 'page' : undefined}>
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                    {item.badge && item.badge > 0 && !collapsed && <Badge variant="accent" size="sm">{item.badge}</Badge>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] flex-1">
          {/* Reserved for future controls */}
        </div>
      </div>
    </aside>
  )
}

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { navItems, setCurrentView } = useApp()
  const location = useLocation()

  if (!isOpen) return null

  return (
    <aside className="fixed left-0 top-0 h-screen w-[var(--sidebar-width)] bg-[var(--gradient-card)] border-r border-[var(--color-border)] z-[var(--z-sticky)] lg:hidden transform transition-transform duration-300" aria-label="Mobile navigation">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-[var(--header-height)] px-4 border-b border-[var(--color-border)]">
          <Link to="/" className="flex items-center gap-2" onClick={onClose}>
            <span className="font-display font-bold text-lg text-[var(--color-text-primary)]">ThroneCaptures</span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = navIcons[item.icon as keyof typeof navIcons]
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <NavLink to={item.href} onClick={() => { setCurrentView((item.href.slice(1) || 'dashboard') as 'dashboard' | 'guidelines' | 'submit' | 'review' | 'history' | 'settings'); onClose() }} className={({ isActive: active }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${active ? 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'}
                  `} aria-current={isActive ? 'page' : undefined}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && <Badge variant="accent" size="sm">{item.badge}</Badge>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}