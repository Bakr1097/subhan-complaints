import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './AdminPanel'

export const metadata = {
  title: 'Admin Panel — Subhan Complaints',
}

export default async function AdminPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'ADMIN') redirect('/staff/dashboard')

  const [{ data: staffList }, { data: routeList }, { data: rawAudit }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, role, is_active, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('routes')
      .select('id, name, origin, destination, is_active, created_at')
      .order('name', { ascending: true }),
    supabase
      .from('complaint_history')
      .select('id, complaint_id, action_type, old_value, new_value, notes, performed_by_user_id, created_at, complaints(id, reference_number)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  // Flatten nested complaints join into a flat reference_number field
  const auditLog = (rawAudit ?? []).map((entry) => {
    const raw = entry as typeof entry & { complaints: { id: string; reference_number: string } | null }
    return {
      id:                   raw.id,
      complaint_id:         raw.complaint_id,
      action_type:          raw.action_type,
      old_value:            raw.old_value,
      new_value:            raw.new_value,
      notes:                raw.notes,
      performed_by_user_id: raw.performed_by_user_id,
      created_at:           raw.created_at,
      reference_number:     raw.complaints?.reference_number ?? '—',
    }
  })

  return (
    <AdminPanel
      currentUserName={profile.full_name}
      initialStaff={staffList ?? []}
      initialRoutes={routeList ?? []}
      initialAuditLog={auditLog}
    />
  )
}
