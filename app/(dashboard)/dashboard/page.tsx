'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Car, Users, CalendarDays, DollarSign, MessageSquare } from 'lucide-react'
import type { Lead, InventoryItem } from '@/types/database'

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'

interface Stats {
  totalCars: number
  activeLeads: number
  appointmentsToday: number
  totalLotValue: number
  aiLeadsOvernight: number
}

interface SparklineData {
  cars: number[]
  leads: number[]
  appointments: number[]
  lotValue: number[]
  prevCars: number[]
  prevLeads: number[]
  prevAppointments: number[]
  prevLotValue: number[]
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Returns array of YYYY-MM-DD strings for last N days ending today */
function getLastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const id = useMemo(() => `grad-${Math.random().toString(36).slice(2, 8)}`, [])
  const allEqual = data.every((v) => v === data[0])
  const w = 100
  const pad = 3
  const h = height

  if (allEqual) {
    const y = h / 2
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1={0} y1={y} x2={w} y2={y} stroke={color} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.4} />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }))

  // Build smooth cubic bezier path using Catmull-Rom → Bezier conversion
  const tension = 0.3
  let linePath = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    linePath += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }

  const fillPath = `${linePath} L${w},${h} L0,${h} Z`
  const last = points[points.length - 1]

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2} fill={color} />
    </svg>
  )
}

function getDelta(current: number[], previous: number[]): { text: string; direction: 'up' | 'down' | 'flat' } {
  const thisWeek = current.reduce((a, b) => a + b, 0)
  const lastWeek = previous.reduce((a, b) => a + b, 0)
  const diff = thisWeek - lastWeek

  if (diff === 0) return { text: '— no change', direction: 'flat' }
  if (diff > 0) return { text: `↑ ${diff.toLocaleString()} this week`, direction: 'up' }
  return { text: `↓ ${Math.abs(diff).toLocaleString()} this week`, direction: 'down' }
}

function getDeltaCumulative(current: number[], previous: number[]): { text: string; direction: 'up' | 'down' | 'flat' } {
  const todayVal = current[current.length - 1] ?? 0
  const weekAgoVal = previous[previous.length - 1] ?? 0
  const diff = todayVal - weekAgoVal

  if (diff === 0) return { text: '— no change', direction: 'flat' }
  if (diff > 0) return { text: `↑ ${diff.toLocaleString()} this week`, direction: 'up' }
  return { text: `↓ ${Math.abs(diff).toLocaleString()} this week`, direction: 'down' }
}

function getDeltaValue(current: number[], previous: number[]): { text: string; direction: 'up' | 'down' | 'flat' } {
  const todayVal = current[current.length - 1] ?? 0
  const weekAgoVal = previous[previous.length - 1] ?? 0
  const diff = todayVal - weekAgoVal

  if (diff === 0) return { text: '— no change', direction: 'flat' }
  if (diff > 0) return { text: `↑ $${diff.toLocaleString()} this week`, direction: 'up' }
  return { text: `↓ $${Math.abs(diff).toLocaleString()} this week`, direction: 'down' }
}

const statusDotColor: Record<string, string> = {
  new: '#6fcf97',
  contacted: '#bbb',
  qualified: '#2d7a4f',
  appointment_set: '#E67E22',
  closed_won: '#2d7a4f',
  closed_lost: '#dc3545',
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const ACTIVE_LEAD_STATUSES = new Set(['new', 'contacted', 'qualified', 'appointment_set'])

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sparklines, setSparklines] = useState<SparklineData | null>(null)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [recentInventory, setRecentInventory] = useState<InventoryItem[]>([])
  const [dealerName, setDealerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const yesterday = new Date(Date.now() - 86400000).toISOString()
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString()

      const [
        carsRes, leadsRes, appointmentsRes, lotValueRes,
        recentLeadsRes, recentInvRes, dealerRes, aiConvosRes,
        allInventoryRes, allLeadsRes, allAppointmentsRes,
      ] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('dealer_id', user.id).neq('status', 'sold'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('dealer_id', user.id).neq('status', 'closed_lost').neq('status', 'closed_won'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('dealer_id', user.id).gte('scheduled_time', new Date().toISOString().split('T')[0]).lt('scheduled_time', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
        supabase.from('inventory').select('price').eq('dealer_id', user.id).neq('status', 'sold'),
        supabase.from('leads').select('*').eq('dealer_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('inventory').select('*').eq('dealer_id', user.id).neq('status', 'sold').order('created_at', { ascending: false }).limit(5),
        supabase.from('dealers').select('name').eq('id', user.id).single(),
        supabase.from('conversations').select('lead_id', { count: 'exact', head: true }).eq('dealer_id', user.id).eq('sender', 'ai').gte('created_at', yesterday),
        // Sparkline data: all inventory + leads for this dealer, appointments last 14 days
        supabase.from('inventory').select('id, created_at, status, price').eq('dealer_id', user.id),
        supabase.from('leads').select('id, created_at, status').eq('dealer_id', user.id),
        supabase.from('appointments').select('id, scheduled_time').eq('dealer_id', user.id).gte('scheduled_time', fourteenDaysAgo),
      ])

      const lotValue = (lotValueRes.data ?? []).reduce((sum, v) => sum + (v.price ?? 0), 0)
      if (dealerRes.data?.name) setDealerName(dealerRes.data.name)

      setStats({
        totalCars: carsRes.count ?? 0,
        activeLeads: leadsRes.count ?? 0,
        appointmentsToday: appointmentsRes.count ?? 0,
        totalLotValue: lotValue,
        aiLeadsOvernight: aiConvosRes.count ?? 0,
      })

      // Compute sparkline data for last 14 days (this week + prev week)
      const last14 = getLastNDays(14)
      const thisWeekDays = last14.slice(7) // last 7
      const prevWeekDays = last14.slice(0, 7) // first 7

      const invItems = allInventoryRes.data ?? []
      const leadItems = allLeadsRes.data ?? []
      const apptItems = allAppointmentsRes.data ?? []

      function computeDayData(days: string[]) {
        const cars: number[] = []
        const leads: number[] = []
        const appointments: number[] = []
        const lotValues: number[] = []

        for (const dayStr of days) {
          const dayEnd = new Date(dayStr)
          dayEnd.setHours(23, 59, 59, 999)
          const dayEndTs = dayEnd.getTime()

          // Cars on lot by end of day: created before day end AND not sold
          const carsOnLot = invItems.filter((v) => new Date(v.created_at).getTime() <= dayEndTs && v.status !== 'sold')
          cars.push(carsOnLot.length)

          // Active leads by end of day: created before day end AND active status
          const activeLeads = leadItems.filter((l) => new Date(l.created_at).getTime() <= dayEndTs && ACTIVE_LEAD_STATUSES.has(l.status))
          leads.push(activeLeads.length)

          // Appointments on this day
          const dayAppts = apptItems.filter((a) => a.scheduled_time.startsWith(dayStr))
          appointments.push(dayAppts.length)

          // Lot value by end of day
          const val = carsOnLot.reduce((sum, v) => sum + (v.price ?? 0), 0)
          lotValues.push(val)
        }

        return { cars, leads, appointments, lotValues }
      }

      const thisWeek = computeDayData(thisWeekDays)
      const prevWeek = computeDayData(prevWeekDays)

      setSparklines({
        cars: thisWeek.cars,
        leads: thisWeek.leads,
        appointments: thisWeek.appointments,
        lotValue: thisWeek.lotValues,
        prevCars: prevWeek.cars,
        prevLeads: prevWeek.leads,
        prevAppointments: prevWeek.appointments,
        prevLotValue: prevWeek.lotValues,
      })

      setRecentLeads(recentLeadsRes.data ?? [])
      setRecentInventory(recentInvRes.data ?? [])
      setLoading(false)
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, margin: 'calc(var(--dash-pad) * -1) calc(var(--dash-pad) * -1) 0', paddingTop: 0 }}>
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e8ebe6', padding: '10px 24px' }}>
          <Skeleton className="h-4 w-96" />
        </div>
        <div style={{ padding: '0 var(--dash-pad)' }}>
          <div style={{ background: '#1a3526', borderRadius: 10, padding: 28, marginBottom: 16 }}>
            <Skeleton className="h-3 w-32 mb-3 opacity-20" />
            <Skeleton className="h-10 w-48 mb-2 opacity-20" />
            <Skeleton className="h-3 w-40 opacity-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e8ebe6', borderRadius: 10, padding: 20 }}>
                <Skeleton className="h-6 w-6 rounded-lg mb-3" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-3" />
                <Skeleton className="h-9 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const carsData = sparklines?.cars ?? [0, 0, 0, 0, 0, 0, 0]
  const leadsData = sparklines?.leads ?? [0, 0, 0, 0, 0, 0, 0]
  const apptsData = sparklines?.appointments ?? [0, 0, 0, 0, 0, 0, 0]
  const lotValData = sparklines?.lotValue ?? [0, 0, 0, 0, 0, 0, 0]

  const carsDelta = getDeltaCumulative(carsData, sparklines?.prevCars ?? [0, 0, 0, 0, 0, 0, 0])
  const leadsDelta = getDeltaCumulative(leadsData, sparklines?.prevLeads ?? [0, 0, 0, 0, 0, 0, 0])
  const apptsDelta = getDelta(apptsData, sparklines?.prevAppointments ?? [0, 0, 0, 0, 0, 0, 0])
  const lotValDelta = getDeltaValue(lotValData, sparklines?.prevLotValue ?? [0, 0, 0, 0, 0, 0, 0])

  const smallCards = [
    { label: 'TOTAL CARS', tag: 'on lot', value: stats?.totalCars ?? 0, icon: Car, sparkData: carsData, delta: carsDelta },
    { label: 'ACTIVE LEADS', tag: 'active', value: stats?.activeLeads ?? 0, icon: Users, sparkData: leadsData, delta: leadsDelta },
    { label: 'APPOINTMENTS', tag: 'today', value: stats?.appointmentsToday ?? 0, icon: CalendarDays, sparkData: apptsData, delta: apptsDelta },
  ]

  const firstName = dealerName ? dealerName.split(' ')[0] : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 'calc(var(--dash-pad) * -1) calc(var(--dash-pad) * -1) 0', paddingTop: 0 }}>
      {/* Morning Briefing */}
      <div className="flex items-center justify-between" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e8ebe6', padding: '8px 24px' }}>
        <p style={{ fontSize: 13, color: '#444', lineHeight: 1.4 }}>
          {getGreeting()}, <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{firstName || 'there'}</span> — <span style={{ fontWeight: 700, color: '#2d7a4f' }}>{stats?.totalCars ?? 0}</span> cars on lot · AI responded to <span style={{ fontWeight: 700, color: '#2d7a4f' }}>{stats?.aiLeadsOvernight ?? 0}</span> leads overnight · <span style={{ fontWeight: 700, color: '#2d7a4f' }}>{stats?.appointmentsToday ?? 0}</span> appointments today
        </p>
        <span className="hidden sm:inline" style={{ fontSize: 11, color: '#bbb', fontFamily: mono, flexShrink: 0, marginLeft: 16 }}>Updated just now</span>
      </div>

      {/* Stats Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 var(--dash-pad)' }}>
        {/* Hero Card — Total Lot Value */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center" style={{
          background: '#1a3526',
          borderRadius: 10,
          padding: '16px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Left content */}
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <p style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              TOTAL LOT VALUE
            </p>
            <p style={{
              fontSize: 32,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '-1.2px',
              lineHeight: 1.1,
            }}>
              ${(stats?.totalLotValue ?? 0).toLocaleString()}
            </p>
            <div className="flex items-center" style={{ marginTop: 6, gap: 12 }}>
              <span style={{
                fontFamily: mono,
                fontSize: 10.5,
                color: '#6fcf97',
                letterSpacing: '0.2px',
              }}>
                {lotValDelta.direction === 'up' ? `↑ $${Math.abs((lotValData[lotValData.length - 1] ?? 0) - ((sparklines?.prevLotValue ?? [])[6] ?? 0)).toLocaleString()} added this week` : lotValDelta.direction === 'down' ? lotValDelta.text : '— no change this week'}
              </span>
              <span className="flex items-center" style={{ gap: 5 }}>
                <span style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: '#6fcf97',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }} />
                <span style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.3px',
                }}>
                  Live
                </span>
              </span>
            </div>
          </div>

          {/* Right sparkline */}
          <div className="w-full md:w-[35%] md:max-w-[200px]" style={{ flexShrink: 0, alignSelf: 'center' }}>
            <Sparkline data={lotValData} color="#6fcf97" height={44} />
          </div>
        </div>

        {/* 3-column smaller cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
          {smallCards.map((card) => {
            const deltaColor = card.delta.direction === 'up' ? '#2d7a4f' : card.delta.direction === 'down' ? '#dc3545' : '#bbb'

            return (
              <div
                key={card.label}
                style={{
                  background: '#fff',
                  border: '1px solid #e8ebe6',
                  borderTop: '3px solid #ddd',
                  borderRadius: 10,
                  padding: '16px 16px',
                }}
              >
                {/* Top row: icon + label + tag */}
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        backgroundColor: '#f5f5f3',
                      }}
                    >
                      <card.icon style={{ width: 11, height: 11, color: '#999' }} />
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#aaa',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      {card.label}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#bbb',
                    letterSpacing: '0.3px',
                  }}>
                    {card.tag}
                  </span>
                </div>

                {/* Value */}
                <p style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: '#1a1a1a',
                  letterSpacing: '-0.8px',
                  lineHeight: 1.1,
                }}>
                  {card.value}
                </p>

                {/* Sparkline */}
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={card.sparkData} color="#bbb" height={24} />
                </div>

                {/* Delta */}
                <p style={{
                  fontSize: 10,
                  fontFamily: mono,
                  color: deltaColor,
                  marginTop: 4,
                  letterSpacing: '0.2px',
                }}>
                  {card.delta.text}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 10, padding: '0 var(--dash-pad)', paddingBottom: 16 }}>
        {/* Recent Leads */}
        <div style={{ background: '#fff', border: '1px solid #e8ebe6', borderRadius: 10, padding: '14px 18px', minHeight: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Recent Leads</h2>
            <Link href="/leads" style={{ fontSize: 12, fontWeight: 500, color: '#2d7a4f', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ padding: '12px 0' }}>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
                <MessageSquare style={{ width: 14, height: 14, color: '#bbb' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>No leads yet</p>
              </div>
              <p style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Share your number with buyers to get started</p>
              <Link href="/leads" style={{ fontSize: 12, fontWeight: 500, color: '#2d7a4f', textDecoration: 'none' }}>
                Add a lead →
              </Link>
            </div>
          ) : (
            <div>
              {recentLeads.slice(0, 4).map((lead, i, arr) => (
                <div
                  key={lead.id}
                  className="flex items-center"
                  style={{
                    padding: '8px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid #e8ebe6' : 'none',
                    gap: 8,
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: statusDotColor[lead.status] ?? '#bbb',
                    flexShrink: 0,
                  }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                      {lead.name}
                    </p>
                    {lead.vehicle_interest && (
                      <p className="truncate" style={{ fontSize: 12, color: '#999' }}>{lead.vehicle_interest}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: '#bbb', fontFamily: mono, flexShrink: 0 }}>
                    {timeAgo(lead.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Snapshot */}
        <div style={{ background: '#fff', border: '1px solid #e8ebe6', borderRadius: 10, padding: '14px 18px', minHeight: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Inventory Snapshot</h2>
            <Link href="/inventory" style={{ fontSize: 12, fontWeight: 500, color: '#2d7a4f', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          {recentInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ padding: '12px 0' }}>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                <Car style={{ width: 14, height: 14, color: '#bbb' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>No vehicles yet</p>
              </div>
              <Link href="/inventory/add" style={{ fontSize: 12, fontWeight: 500, color: '#2d7a4f', textDecoration: 'none' }}>
                Add a vehicle →
              </Link>
            </div>
          ) : (
            <div>
              {recentInventory.slice(0, 4).map((vehicle, i, arr) => (
                <Link
                  key={vehicle.id}
                  href={`/inventory/${vehicle.id}`}
                  className="flex items-center"
                  style={{
                    padding: '7px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid #e8ebe6' : 'none',
                    gap: 10,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f9faf9' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 7,
                      backgroundColor: '#e8f5ee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Car style={{ width: 15, height: 15, color: '#2d7a4f' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p style={{ fontSize: 11, color: '#999', fontFamily: mono }}>
                      {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} mi` : '—'}
                    </p>
                  </div>
                  <div className="flex items-center flex-shrink-0" style={{ gap: 8 }}>
                    {vehicle.status !== 'sold' && (
                      <Badge variant="success">Available</Badge>
                    )}
                    {vehicle.price != null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2d7a4f', fontFamily: mono }}>
                        ${vehicle.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
