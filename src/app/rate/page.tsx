import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import RatingForm from './RatingForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Rate your trip — Subhan Travels',
}

export default async function RatePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) } },
  )

  const { data: routes } = await supabase
    .from('routes')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      }
    >
      <RatingForm routes={routes ?? []} />
    </Suspense>
  )
}
