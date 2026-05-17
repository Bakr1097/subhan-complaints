import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Unauthorized', status: 401 as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return { supabase: null, error: 'Forbidden', status: 403 as const }
  return { supabase, error: null, status: 200 as const }
}

// POST /api/admin/users — create a new staff account
export async function POST(request: NextRequest) {
  const { supabase, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { email, password, full_name, phone, role } = body

  if (!email?.trim() || !password || !full_name?.trim() || !role) {
    return NextResponse.json({ error: 'email, password, full_name and role are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email:         email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase!
    .from('profiles')
    .insert({
      id:        newUser.user.id,
      full_name: full_name.trim(),
      phone:     phone?.trim() || null,
      role,
      is_active: true,
    })
    .select()
    .single()

  if (profileError) {
    // Roll back the auth user so we don't have an orphan
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile })
}

// PATCH /api/admin/users — update password for an existing auth user
export async function PATCH(request: NextRequest) {
  const { error, status } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { userId, password } = body

  if (!userId || !password || password.length < 8) {
    return NextResponse.json({ error: 'userId and a password (min 8 chars) are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
