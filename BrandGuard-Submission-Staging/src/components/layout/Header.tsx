import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export function Header({ onMenuClick, sidebarCollapsed }: { onMenuClick: () => void; sidebarCollapsed: boolean }) {
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)

  const notifications = [
    { id: '1', message: 'Review completed for "Q3 Marketing Copy"', time: '2 hours ago', read: false },
    { id: '2', message: 'New guideline "Brand Voice v2.0" created', time: '1 day ago', read: false },
    { id: '3', message: 'Content "Blog Post Draft" approved', time: '3 days ago', read: true }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header
      className={`
        fixed top-0 right-0 h-[var(--header-height)] bg-[var(--gradient-card)] border-b border-[var(--color-border)]
        transition-all duration-300 z-[var(--z-sticky)]
        ${sidebarCollapsed ? 'left-0 lg:left-[var(--sidebar-collapsed)]' : 'left-0 lg:left-[var(--sidebar-width)]'}
      `}
      role="banner"
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Menu button only (mobile) */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            aria-label="Toggle menu"
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Right: Notifications, User */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              aria-expanded={showNotifications}
            >
              <Bell className="w-5 h-5 relative" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-error)] text-[var(--color-text-inverse)] text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <Modal isOpen={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications" size="md">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${!n.read ? 'bg-[var(--color-accent-primary)]/5' : ''}`}>
                      <div className="w-2 h-2 mt-2 rounded-full bg-[var(--color-accent-primary)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-primary)]">{n.message}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <Button variant="ghost" size="sm" fullWidth>View all notifications</Button>
                  </div>
                </div>
              </Modal>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center">
                <User className="w-5 h-5 text-[var(--color-text-inverse)]" />
              </div>
              <span className="hidden sm:block font-medium text-[var(--color-text-primary)]">User</span>
            </Button>

            {showUserMenu && (
              <Modal isOpen={showUserMenu} onClose={() => setShowUserMenu(false)} size="sm">
                <div className="space-y-1">
                  <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                    Settings
                  </Link>
                  <div className="border-t border-[var(--color-border)] my-1" />
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign out
                  </button>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}