import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ComplaintForm from './ComplaintForm'

export const metadata = {
  title: 'Submit a Complaint — Subhan Complaints',
}

export default async function SubmitPage() {
  const supabase = createClient()

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
      <ComplaintForm routes={routes ?? []} />
    </Suspense>
  )
}
