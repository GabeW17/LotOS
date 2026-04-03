import { NextResponse } from 'next/server'

interface NHTSAResult {
  Variable: string
  Value: string | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vin: string }> }
) {
  const { vin } = await params

  if (!vin || vin.length < 11) {
    return NextResponse.json({ error: 'Invalid VIN' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
    )
    const data = await res.json()
    const results: NHTSAResult[] = data.Results

    function find(variable: string): string | null {
      const result = results.find((r) => r.Variable === variable)
      return result?.Value?.trim() || null
    }

    return NextResponse.json({
      year: find('Model Year') ? parseInt(find('Model Year')!) : null,
      make: find('Make'),
      model: find('Model'),
      trim: find('Trim'),
    })
  } catch {
    return NextResponse.json({ error: 'VIN lookup failed' }, { status: 500 })
  }
}
