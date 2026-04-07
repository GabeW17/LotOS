import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-Debug-Stage, X-Debug-Count, X-Debug-Probe-Count, X-Debug-Error, X-Debug-Has-Service-Key, X-Debug-Has-Url',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

function arrayResponse(data: unknown[], debug: Record<string, string>) {
  return NextResponse.json(data, {
    headers: { ...corsHeaders, ...debug },
  })
}

export async function GET(request: NextRequest) {
  const dealerId = request.nextUrl.searchParams.get('dealer_id')

  const envDebug = {
    'X-Debug-Has-Url': String(!!process.env.NEXT_PUBLIC_SUPABASE_URL),
    'X-Debug-Has-Service-Key': String(!!process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  console.log('[public-inventory] request', {
    dealerId,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8),
  })

  if (!dealerId) {
    return arrayResponse([], { ...envDebug, 'X-Debug-Stage': 'missing-dealer-id' })
  }

  try {
    const supabase = createAdminClient()

    // Probe: how many rows exist for this dealer_id regardless of status?
    // This tells us if the service role key actually bypasses RLS.
    const probe = await supabase
      .from('inventory')
      .select('id, dealer_id, status', { count: 'exact' })
      .eq('dealer_id', dealerId)

    console.log('[public-inventory] probe (dealer_id only, no status filter)', {
      count: probe.count,
      rowCount: probe.data?.length ?? 0,
      statuses: probe.data?.map((r) => r.status),
      error: probe.error,
    })

    const { data, error, count } = await supabase
      .from('inventory')
      .select(
        'id, year, make, model, trim, price, mileage, color, description, photos',
        { count: 'exact' }
      )
      .eq('dealer_id', dealerId)
      .eq('status', 'available')

    console.log('[public-inventory] filtered query', {
      dealerId,
      status: 'available',
      count,
      rowCount: data?.length ?? 0,
      rawData: data,
      error,
    })

    if (error) {
      console.error('[public-inventory] query error:', error)
      return arrayResponse([], {
        ...envDebug,
        'X-Debug-Stage': 'query-error',
        'X-Debug-Error': error.message,
        'X-Debug-Probe-Count': String(probe.count ?? -1),
      })
    }

    return arrayResponse(data ?? [], {
      ...envDebug,
      'X-Debug-Stage': 'success',
      'X-Debug-Count': String(count ?? data?.length ?? 0),
      'X-Debug-Probe-Count': String(probe.count ?? -1),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[public-inventory] exception:', err)
    return arrayResponse([], {
      ...envDebug,
      'X-Debug-Stage': 'exception',
      'X-Debug-Error': message,
    })
  }
}
