import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeDomain } from '@/lib/utils/url'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  let dealerId = request.nextUrl.searchParams.get('dealer_id')

  // Verify dealer_id actually exists, otherwise clear it so Origin fallback runs
  if (dealerId) {
    const { data: exists } = await supabase
      .from('dealers')
      .select('id')
      .eq('id', dealerId)
      .single()
    if (!exists) dealerId = null
  }

  // Try to resolve dealer from Origin header
  if (!dealerId) {
    const origin = request.headers.get('origin')
    if (origin) {
      const domain = normalizeDomain(origin)
      const { data: dealer } = await supabase
        .from('dealers')
        .select('id')
        .eq('website_url', domain)
        .single()
      if (dealer) dealerId = dealer.id
    }
  }

  if (!dealerId) {
    return NextResponse.json([], { headers: corsHeaders })
  }

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, year, make, model, trim, price, mileage, color, description, photos')
      .eq('dealer_id', dealerId)
      .eq('status', 'available')

    if (error) {
      console.error('Public inventory query error:', error)
      return NextResponse.json([], { headers: corsHeaders })
    }

    return NextResponse.json(data ?? [], { headers: corsHeaders })
  } catch (err) {
    console.error('Public inventory error:', err)
    return NextResponse.json([], { headers: corsHeaders })
  }
}
