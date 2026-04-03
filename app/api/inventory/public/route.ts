import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get('dealer_id')

  if (!dealerId) {
    return NextResponse.json(
      { error: 'dealer_id query parameter is required' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('inventory')
      .select('id, year, make, model, trim, price, mileage, color, description, photos')
      .eq('dealer_id', dealerId)
      .eq('status', 'available')

    if (error) throw error

    return NextResponse.json(data, { headers: corsHeaders })
  } catch (err) {
    console.error('Public inventory error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500, headers: corsHeaders }
    )
  }
}
