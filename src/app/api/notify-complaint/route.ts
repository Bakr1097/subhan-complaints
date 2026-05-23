import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendComplaintNotification } from '@/lib/notifications/ntfy'

export async function POST(req: Request) {
  console.log('[notify-complaint] POST received')
  try {
    const body = await req.json().catch(() => ({}))
    console.log('[notify-complaint] Parsed body:', body)

    const id = typeof body?.id === 'string' ? body.id : null
    if (!id) {
      console.warn('[notify-complaint] No valid id in body — skipping')
      return NextResponse.json({}, { status: 200 })
    }

    console.log('[notify-complaint] Fetching complaint id:', id)
    const supabase = createAdminClient()
    const { data: complaint, error: dbError } = await supabase
      .from('complaints')
      .select('id, reference_number, severity, bus_number, category, is_about_steward_head, routes(name)')
      .eq('id', id)
      .single()

    if (dbError) console.error('[notify-complaint] DB error:', dbError)
    console.log('[notify-complaint] Fetched complaint:', complaint)

    if (!complaint) {
      console.warn('[notify-complaint] Complaint not found — skipping notification')
      return NextResponse.json({}, { status: 200 })
    }

    console.log('[notify-complaint] Calling sendComplaintNotification...')
    await sendComplaintNotification(complaint as Parameters<typeof sendComplaintNotification>[0])
    console.log('[notify-complaint] sendComplaintNotification finished')
  } catch (err) {
    console.error('[notify-complaint] Unexpected error:', err)
  }

  return NextResponse.json({}, { status: 200 })
}
