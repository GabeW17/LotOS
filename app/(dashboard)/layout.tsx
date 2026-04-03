'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/ui/sidebar'
import type { Dealer } from '@/types/database'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dealer, setDealer] = useState<Dealer | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setDealer({
          id: 'demo',
          name: 'Demo Dealership',
          email: 'demo@lotos.app',
          phone: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          logo_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        return
      }
      const { data } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setDealer(data)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f4f6f3' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dealerName={dealer?.name}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between flex-shrink-0"
          style={{
            height: 52,
            backgroundColor: '#fff',
            borderBottom: '1px solid #e8ebe6',
            padding: '0 28px',
          }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              style={{ color: '#999' }}
            >
              <Menu size={20} />
            </button>
            {dealer?.name && (
              <span className="hidden sm:inline" style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>
                {dealer.name}
              </span>
            )}
          </div>
          <div className="flex items-center" style={{ gap: 16 }}>
            <button
              onClick={handleLogout}
              className="flex items-center"
              style={{ gap: 6, fontSize: 13, color: '#999', cursor: 'pointer', border: 'none', background: 'none' }}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto" style={{ padding: 28 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
