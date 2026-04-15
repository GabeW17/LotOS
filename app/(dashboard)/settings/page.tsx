'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeDomain } from '@/lib/utils/url'
import type { Dealer } from '@/types/database'

export default function SettingsPage() {
  const [dealer, setDealer] = useState<Dealer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setDealer(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dealer) return
    setSaving(true)

    const supabase = createClient()
    await supabase.from('dealers').update({
      name: dealer.name,
      phone: dealer.phone,
      address: dealer.address,
      city: dealer.city,
      state: dealer.state,
      zip: dealer.zip,
      website_url: dealer.website_url ? normalizeDomain(dealer.website_url) : null,
    }).eq('id', dealer.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !dealer) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Settings</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Dealership Name"
            value={dealer.name}
            onChange={(e) => setDealer({ ...dealer, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            value={dealer.email}
            disabled
          />
          <Input
            label="Website URL"
            value={dealer.website_url ?? ''}
            onChange={(e) => setDealer({ ...dealer, website_url: e.target.value })}
            placeholder="https://yourdealership.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={dealer.phone ?? ''}
            onChange={(e) => setDealer({ ...dealer, phone: e.target.value })}
          />
          <Input
            label="Address"
            value={dealer.address ?? ''}
            onChange={(e) => setDealer({ ...dealer, address: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              value={dealer.city ?? ''}
              onChange={(e) => setDealer({ ...dealer, city: e.target.value })}
            />
            <Input
              label="State"
              value={dealer.state ?? ''}
              onChange={(e) => setDealer({ ...dealer, state: e.target.value })}
            />
            <Input
              label="ZIP"
              value={dealer.zip ?? ''}
              onChange={(e) => setDealer({ ...dealer, zip: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && <span className="text-sm text-success">Saved!</span>}
          </div>
        </form>
      </Card>
    </div>
  )
}
