'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import type { Lead, Conversation, LeadStatus, LeadSource, LeadTemperature } from '@/types/database'
import { Users, Phone, MessageSquare, Send, X } from 'lucide-react'

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'

const statusColors: Record<LeadStatus, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  new: 'info',
  contacted: 'default',
  qualified: 'success',
  appointment_set: 'warning',
  closed_won: 'success',
  closed_lost: 'danger',
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', vehicle_interest: '', source: 'other' as LeadSource, temperature: 'warm' as LeadTemperature })

  useEffect(() => {
    loadLeads()
    const supabase = createClient()
    const leadsChannel = supabase.channel('leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((prev) => [payload.new as Lead, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((prev) => prev.map((l) => (l.id === (payload.new as Lead).id ? (payload.new as Lead) : l)))
      })
      .subscribe()
    const convoChannel = supabase.channel('conversations-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (payload) => {
        const newMsg = payload.new as Conversation
        setConversations((prev) => {
          if (prev.length > 0 && prev[0].lead_id === newMsg.lead_id) return [...prev, newMsg]
          return prev
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(leadsChannel); supabase.removeChannel(convoChannel) }
  }, [])

  async function loadLeads() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('leads').select('*').eq('dealer_id', user.id).order('created_at', { ascending: false })
    if (data) setLeads(data)
    setLoading(false)
  }

  async function loadConversations(leadId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('conversations').select('*').eq('lead_id', leadId).order('created_at', { ascending: true })
    if (data) setConversations(data)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedLead) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const msg = newMessage
    setNewMessage('')
    await supabase.from('conversations').insert({ lead_id: selectedLead.id, dealer_id: user.id, message: msg, sender: 'dealer', channel: 'sms' })
    if (selectedLead.phone) {
      fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: selectedLead.id, message: msg }) }).catch((err) => console.error('SMS send failed:', err))
    }
    loadConversations(selectedLead.id)
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('leads').insert({ dealer_id: user.id, name: addForm.name, phone: addForm.phone || null, email: addForm.email || null, vehicle_interest: addForm.vehicle_interest || null, source: addForm.source, temperature: addForm.temperature, status: 'new' })
    setAddModalOpen(false)
    setAddForm({ name: '', phone: '', email: '', vehicle_interest: '', source: 'other', temperature: 'warm' })
    loadLeads()
  }

  const filteredLeads = useMemo(() => {
    let result = [...leads]
    if (filterStatus !== 'all') result = result.filter((l) => l.status === filterStatus)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [leads, filterStatus])

  function openLead(lead: Lead) {
    setSelectedLead(lead)
    loadConversations(lead.id)
  }

  if (loading) {
    return (
      <div className="flex" style={{ height: 'calc(100vh - 108px)', margin: -28 }}>
        <div style={{ width: 320, borderRight: '1px solid #e8ebe6', padding: 16 }}>
          <Skeleton className="h-7 w-32 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full mb-2" />)}
        </div>
        <div className="flex-1" style={{ padding: 28 }}>
          <Skeleton className="h-7 w-48 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 108px)', margin: -28 }}>
      {/* Left column — lead list */}
      <div className={`flex flex-col ${selectedLead ? 'hidden lg:flex' : ''}`} style={{ width: 320, borderRight: '1px solid #e8ebe6', backgroundColor: '#fff' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e8ebe6' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>Leads</h1>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>Add Lead</Button>
          </div>
          <Select
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'appointment_set', label: 'Appointment Set' },
              { value: 'closed_won', label: 'Closed Won' },
              { value: 'closed_lost', label: 'Closed Lost' },
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center" style={{ padding: '40px 16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Users style={{ width: 20, height: 20, color: '#bbb' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>No leads yet</p>
              <p style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 12 }}>Add your first lead to start tracking.</p>
              <Button size="sm" onClick={() => setAddModalOpen(true)}>Add Lead</Button>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id
              return (
                <div
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e8ebe6',
                    borderLeft: isSelected ? '2px solid #6fcf97' : '2px solid transparent',
                    backgroundColor: isSelected ? '#f9faf9' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                    <span className="truncate" style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{lead.name}</span>
                    <span style={{ fontSize: 11, color: '#bbb', fontFamily: mono, flexShrink: 0, marginLeft: 8 }}>{timeAgo(lead.created_at)}</span>
                  </div>
                  {lead.vehicle_interest && (
                    <p className="truncate" style={{ fontSize: 13, color: '#999' }}>{lead.vehicle_interest}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right column — conversation */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#fff' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between" style={{ padding: '14px 24px', borderBottom: '1px solid #e8ebe6' }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center" style={{ gap: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{selectedLead.name}</h2>
                <Badge variant={statusColors[selectedLead.status]}>{selectedLead.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center" style={{ gap: 12, marginTop: 4, fontSize: 13, color: '#999' }}>
                {selectedLead.phone && <span className="flex items-center" style={{ gap: 4 }}><Phone style={{ width: 12, height: 12 }} />{selectedLead.phone}</span>}
                {selectedLead.vehicle_interest && <span>{selectedLead.vehicle_interest}</span>}
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="lg:hidden" style={{ color: '#999', cursor: 'pointer', background: 'none', border: 'none' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conversations.length === 0 ? (
              <p style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: '40px 0' }}>No messages yet. Send the first message below.</p>
            ) : (
              conversations.map((msg) => (
                <div key={msg.id} className="flex" style={{ justifyContent: msg.sender === 'dealer' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%' }}>
                    {msg.sender === 'ai' && <p style={{ fontSize: 11, fontWeight: 600, color: '#2d7a4f', marginBottom: 3 }}>AI Assistant</p>}
                    <div style={{
                      padding: '8px 14px',
                      fontSize: 14,
                      lineHeight: 1.5,
                      borderRadius: 14,
                      ...(msg.sender === 'dealer'
                        ? { backgroundColor: '#2d7a4f', color: '#fff', borderBottomRightRadius: 4 }
                        : msg.sender === 'buyer'
                        ? { backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #e8ebe6', borderBottomLeftRadius: 4 }
                        : { backgroundColor: '#e8f5ee', color: '#2d7a4f', border: '1px solid #c8e8d4', borderBottomLeftRadius: 4 }),
                    }}>
                      {msg.message}
                    </div>
                    <p style={{ fontSize: 11, color: '#bbb', marginTop: 3, fontFamily: mono, textAlign: msg.sender === 'dealer' ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message input */}
          <div className="flex" style={{ padding: '14px 24px', borderTop: '1px solid #e8ebe6', gap: 10 }}>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage}>
              <Send style={{ width: 15, height: 15 }} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#f4f6f3' }}>
          <div className="text-center">
            <div style={{ width: 56, height: 56, borderRadius: 14, border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <MessageSquare style={{ width: 24, height: 24, color: '#bbb' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>Select a lead</p>
            <p style={{ fontSize: 13, color: '#999' }}>Choose from the list on the left</p>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Lead">
        <form onSubmit={addLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Phone" type="tel" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Vehicle Interest" value={addForm.vehicle_interest} onChange={(e) => setAddForm((f) => ({ ...f, vehicle_interest: e.target.value }))} placeholder="e.g. 2020 Honda Civic" />
          <Select label="Source" options={[
            { value: 'website', label: 'Website' }, { value: 'facebook', label: 'Facebook' },
            { value: 'craigslist', label: 'Craigslist' }, { value: 'referral', label: 'Referral' },
            { value: 'walk_in', label: 'Walk-in' }, { value: 'phone', label: 'Phone' }, { value: 'other', label: 'Other' },
          ]} value={addForm.source} onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value as LeadSource }))} />
          <Select label="Temperature" options={[
            { value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'cold', label: 'Cold' },
          ]} value={addForm.temperature} onChange={(e) => setAddForm((f) => ({ ...f, temperature: e.target.value as LeadTemperature }))} />
          <div className="flex justify-end" style={{ gap: 8, paddingTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
