import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogComplaintForm from './LogComplaintForm'

export const metadata = {
  title: 'Log Complaint — Subhan Complaints',
}

export default async function LogComplaintPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: routes }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single(),
    supabase.from('routes').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!profile) redirect('/login')

  return (
    <LogComplaintForm
      routes={routes ?? []}
      currentUserId={user.id}
      currentUserName={profile.full_name}
      currentUserRole={profile.role as 'ADMIN' | 'STEWARD_HEAD'}
    />
  )
}
