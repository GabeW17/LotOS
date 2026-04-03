import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSystemPrompt, buildMessages } from '@/lib/ai/prompt'
import { normalizePhone } from '@/lib/utils/phone'

const TWIML_EMPTY = '<Response/>'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let fromPhone: string
    let body: string

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      fromPhone = formData.get('From') as string
      body = formData.get('Body') as string
    } else {
      const json = await request.json()
      fromPhone = json.From || json.phone
      body = json.Body || json.message
    }

    if (!fromPhone || !body) {
      return new Response(TWIML_EMPTY, {
        status: 400,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const dealerId = process.env.TWILIO_DEALER_ID
    if (!dealerId) {
      console.error('TWILIO_DEALER_ID not set')
      return new Response(TWIML_EMPTY, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const normalizedPhone = normalizePhone(fromPhone)
    const supabase = createAdminClient()

    // Upsert lead by phone number
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('phone', normalizedPhone)
      .limit(1)

    let leadId: string

    if (existingLeads && existingLeads.length > 0) {
      leadId = existingLeads[0].id
      await supabase
        .from('leads')
        .update({ status: existingLeads[0].status === 'new' ? 'contacted' : existingLeads[0].status })
        .eq('id', leadId)
    } else {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          dealer_id: dealerId,
          name: normalizedPhone,
          phone: normalizedPhone,
          source: 'phone',
          status: 'new',
          temperature: 'warm',
        })
        .select()
        .single()

      if (error || !newLead) {
        console.error('Failed to create lead:', error)
        return new Response(TWIML_EMPTY, {
          status: 500,
          headers: { 'Content-Type': 'text/xml' },
        })
      }
      leadId = newLead.id
    }

    // Save buyer message
    await supabase.from('conversations').insert({
      lead_id: leadId,
      dealer_id: dealerId,
      message: body,
      sender: 'buyer',
      channel: 'sms',
    })

    // Fetch dealer, inventory, and conversation history in parallel
    const [dealerResult, inventoryResult, historyResult] = await Promise.all([
      supabase.from('dealers').select('*').eq('id', dealerId).single(),
      supabase.from('inventory').select('*').eq('dealer_id', dealerId).in('status', ['available', 'listed']),
      supabase.from('conversations').select('*').eq('lead_id', leadId).order('created_at', { ascending: true }),
    ])

    const dealer = dealerResult.data
    const inventory = inventoryResult.data || []
    const history = historyResult.data || []

    if (!dealer) {
      console.error('Dealer not found:', dealerId)
      return new Response(TWIML_EMPTY, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Generate AI response
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = buildSystemPrompt(dealer, inventory)
    const messages = buildMessages(history)

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    })

    const aiText =
      aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    console.log(`\n🤖 AI Response to ${normalizedPhone}:\n${aiText}\n`)

    // Save AI response
    await supabase.from('conversations').insert({
      lead_id: leadId,
      dealer_id: dealerId,
      message: aiText,
      sender: 'ai',
      channel: 'sms',
    })

    // Send SMS via Twilio (skip if no valid creds)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER

    if (
      twilioSid &&
      twilioToken &&
      twilioPhone &&
      !twilioSid.startsWith('placeholder') &&
      twilioSid !== 'placeholder'
    ) {
      try {
        const client = twilio(twilioSid, twilioToken)
        await client.messages.create({
          body: aiText,
          from: twilioPhone,
          to: normalizedPhone,
        })
      } catch (smsError) {
        console.error('Failed to send SMS via Twilio:', smsError)
      }
    }

    return new Response(TWIML_EMPTY, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(TWIML_EMPTY, {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
