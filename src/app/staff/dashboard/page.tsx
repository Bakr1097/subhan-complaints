import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const metadata = {
  title: 'Dashboard — Subhan Complaints',
}

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: routes }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('routes').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!profile) redirect('/login')

  return (
    <DashboardClient
      userName={profile.full_name}
      userRole={profile.role as 'ADMIN' | 'STEWARD_HEAD'}
      routes={routes ?? []}
    />
  )
}
