'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Appointment, AppointmentStatus } from '@/types/database'
import { CalendarDays } from 'lucide-react'

const statusBadge: Record<AppointmentStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'danger' }> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  completed: { label: 'Completed', variant: 'default' },
  no_show: { label: 'No Show', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('dealer_id', user.id)
        .order('scheduled_time', { ascending: true })

      if (data) setAppointments(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Appointments</h1>

      {appointments.length === 0 ? (
        <Card className="text-center py-12">
          <CalendarDays className="mx-auto text-muted mb-4" size={48} />
          <h3 className="text-lg font-semibold text-foreground mb-2">No appointments</h3>
          <p className="text-muted">Appointments will appear here when booked from the leads page.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {new Date(apt.scheduled_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' at '}
                  {new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {apt.notes && <p className="text-sm text-muted mt-1">{apt.notes}</p>}
              </div>
              <Badge variant={statusBadge[apt.status].variant}>
                {statusBadge[apt.status].label}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
