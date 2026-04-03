import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: 'You are reading an auto auction buy sheet. Extract the following information and return it as JSON only with these exact keys: vin, year, make, model, mileage, purchase_price. If you cannot find a value return null for that field. Return only valid JSON, no other text.',
            },
          ],
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Scan buy sheet error:', err)
    return NextResponse.json(
      { error: 'Could not read buy sheet' },
      { status: 422 }
    )
  }
}
