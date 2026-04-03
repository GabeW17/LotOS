import { NextRequest } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { leadId, message } = await request.json()

    if (!leadId || !message) {
      return Response.json(
        { error: 'leadId and message are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Look up lead phone number
    const { data: lead } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', leadId)
      .single()

    if (!lead?.phone) {
      return Response.json(
        { error: 'Lead has no phone number' },
        { status: 400 }
      )
    }

    // Send SMS via Twilio if configured
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER

    let smsSent = false

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
          body: message,
          from: twilioPhone,
          to: lead.phone,
        })
        smsSent = true
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError)
      }
    }

    return Response.json({ ok: true, smsSent })
  } catch (error) {
    console.error('SMS send error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
