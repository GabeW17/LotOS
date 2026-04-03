import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { year, make, model, trim, mileage, color, price } = await request.json()

    if (!year || !make || !model) {
      return NextResponse.json(
        { error: 'Year, make, and model are required' },
        { status: 400 }
      )
    }

    const details = [
      `${year} ${make} ${model}`,
      trim && `Trim: ${trim}`,
      mileage && `Mileage: ${Number(mileage).toLocaleString()} miles`,
      color && `Color: ${color}`,
      price && `Price: $${Number(price).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join(', ')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Write a 2-3 sentence vehicle listing description for: ${details}

Rules:
- Short, direct, matter-of-fact — like a guy on a lot wrote it, not a marketing team
- No hype words like "stunning", "exceptional", "incredible", "beauty", "sleek"
- No exclamation marks
- Include year, make, model, and price naturally
- Mention mileage if provided
- End with something simple like "financing available" or "come see it today"
- No quotation marks around the output

Good example: "Clean 2019 Ford F-150 in Silver with 62,000 miles — well maintained and priced to move at $28,500. This truck is ready to work and ready to go. Financing available — come see it today."`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ description: text.trim() })
  } catch (err) {
    console.error('Generate description error:', err)
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    )
  }
}
