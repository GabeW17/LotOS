'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Car,
  CalendarDays,
  Settings,
  X,
} from 'lucide-react'

const sections = [
  {
    label: 'OPERATIONS',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/leads', label: 'Leads', icon: Users },
      { href: '/inventory', label: 'Inventory', icon: Car },
    ],
  },
  {
    label: 'SCHEDULE',
    items: [
      { href: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  dealerName?: string
}

export function Sidebar({ open, onClose, dealerName }: SidebarProps) {
  const pathname = usePathname()
  const initials = dealerName
    ? dealerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col lg:translate-x-0 lg:static lg:z-auto ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 220, backgroundColor: '#1a3526' }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px' }}>
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center" style={{ gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: 'rgba(111,207,151,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Car style={{ width: 14, height: 14, color: '#6fcf97' }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                <span style={{ color: '#fff' }}>Lot</span>
                <span style={{ color: '#6fcf97' }}>OS</span>
              </span>
            </Link>
            <button onClick={onClose} className="lg:hidden" style={{ color: '#7da890', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '0 12px' }}>
          {sections.map((section) => (
            <div key={section.label} style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#5a8a6e',
                letterSpacing: '0.8px',
                padding: '0 8px',
                marginBottom: 4,
              }}>
                {section.label}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center"
                    style={{
                      padding: '8px 8px',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: isActive ? '#6fcf97' : '#7da890',
                      backgroundColor: isActive ? 'rgba(111,207,151,0.1)' : 'transparent',
                      borderLeft: isActive ? '2px solid #6fcf97' : '2px solid transparent',
                      borderRadius: isActive ? '0 6px 6px 0' : '6px',
                      gap: 10,
                      position: 'relative',
                    }}
                  >
                    <item.icon style={{ width: 16, height: 16 }} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#6fcf97',
                      }} />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom user */}
        {dealerName && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(111,207,151,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6fcf97',
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: 13, color: '#7da890', fontWeight: 500 }}>{dealerName}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
