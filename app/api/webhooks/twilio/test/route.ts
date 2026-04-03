import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json()

    if (!phone || !message) {
      return Response.json(
        { error: 'phone and message are required' },
        { status: 400 }
      )
    }

    // Forward to the main webhook handler
    const webhookUrl = new URL('/api/webhooks/twilio', request.url)
    const res = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ From: phone, Body: message }),
    })

    const responseText = await res.text()
    return Response.json({
      ok: res.ok,
      status: res.status,
      response: responseText,
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
