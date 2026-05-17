import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ComplaintDetail, { type Complaint } from './ComplaintDetail'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('complaints')
    .select('reference_number')
    .eq('id', params.id)
    .single()
  return { title: data ? `${data.reference_number} — Subhan Complaints` : 'Complaint — Subhan Complaints' }
}

export default async function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: complaint },
    { data: history },
    { data: notes },
    { data: staffList },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single(),
    supabase.from('complaints').select('*, routes(id, name)').eq('id', params.id).single(),
    supabase.from('complaint_history').select('*').eq('complaint_id', params.id).order('created_at', { ascending: true }),
    supabase.from('internal_notes').select('*').eq('complaint_id', params.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
  ])

  if (!profile) redirect('/login')
  if (!complaint) notFound()

  const staffMap: Record<string, string> = Object.fromEntries(
    (staffList ?? []).map(p => [p.id, p.full_name]),
  )

  return (
    <ComplaintDetail
      complaint={complaint as unknown as Complaint}
      history={history ?? []}
      notes={notes ?? []}
      staffMap={staffMap}
      currentUserId={user.id}
      currentUserName={profile.full_name}
      currentUserRole={profile.role as 'ADMIN' | 'STEWARD_HEAD'}
    />
  )
}
