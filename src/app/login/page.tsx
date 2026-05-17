import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'Staff Login — Subhan Complaints',
}

export default async function LoginPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/staff/dashboard')

  return <LoginForm />
}
