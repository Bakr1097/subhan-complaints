'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus, X, Eye, EyeOff, RefreshCw } from 'lucide-react'
import AnalyticsTab from './AnalyticsTab'

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = 'ADMIN' | 'STEWARD_HEAD'

type StaffProfile = {
  id:         string
  full_name:  string
  phone:      string | null
  role:       UserRole
  is_active:  boolean
  created_at: string
}

type Route = {
  id:          string
  name:        string
  origin:      string
  destination: string
  is_active:   boolean
  created_at:  string
}

type AuditLogEntry = {
  id:                   string
  complaint_id:         string
  action_type:          string
  old_value:            string | null
  new_value:            string | null
  notes:                string | null
  performed_by_user_id: string | null
  created_at:           string
  reference_number:     string
}

type Tab = 'staff' | 'routes' | 'audit' | 'analytics'

type Modal =
  | { kind: 'addStaff' }
  | { kind: 'editStaff'; staff: StaffProfile }
  | { kind: 'addRoute' }
  | { kind: 'editRoute'; route: Route }
  | null

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatPhone(phone: string): string {
  const local = phone.replace(/^\+92/, '0')
  return local.length === 11 ? `${local.slice(0, 4)}-${local.slice(4)}` : phone
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  currentUserName:  string
  userRole:         'ADMIN' | 'STEWARD_HEAD'
  initialStaff:     StaffProfile[]
  initialRoutes:    Route[]
  initialAuditLog:  AuditLogEntry[]
}

export default function AdminPanel({ currentUserName, userRole, initialStaff, initialRoutes, initialAuditLog }: Props) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [tab,    setTab]    = useState<Tab>(userRole === 'STEWARD_HEAD' ? 'analytics' : 'staff')
  const [staff,  setStaff]  = useState(initialStaff)
  const [routes, setRoutes] = useState(initialRoutes)
  const [modal,  setModal]  = useState<Modal>(null)

  const staffMap = useMemo(
    () => Object.fromEntries(staff.map(s => [s.id, s.full_name])),
    [staff],
  )

  function closeModal() { setModal(null) }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* ↓ type="button" prevents this from acting as a form submit */}
          <button
            type="button"
            onClick={() => router.push('/staff/dashboard')}
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 leading-tight">Admin Panel</p>
            <p className="text-xs text-gray-500 truncate">{currentUserName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-2xl">
          {(userRole === 'ADMIN'
            ? (['staff', 'routes', 'audit', 'analytics'] as Tab[])
            : (['analytics'] as Tab[])
          ).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'staff' ? 'Staff' : t === 'routes' ? 'Routes' : t === 'audit' ? 'Audit' : 'Analytics'}
            </button>
          ))}
        </div>

        {/* ── Staff Tab ── */}
        {tab === 'staff' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">
                {staff.length} member{staff.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => setModal({ kind: 'addStaff' })}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl"
              >
                <Plus size={15} /> Add Staff
              </button>
            </div>

            {staff.length === 0 ? (
              <EmptyCard message="No staff members yet." />
            ) : (
              staff.map(s => (
                <StaffCard
                  key={s.id}
                  staff={s}
                  onEdit={() => setModal({ kind: 'editStaff', staff: s })}
                  onToggleActive={async () => {
                    const { error } = await supabase
                      .from('profiles')
                      .update({ is_active: !s.is_active })
                      .eq('id', s.id)
                    if (!error) {
                      setStaff(list =>
                        list.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x),
                      )
                    }
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ── Routes Tab ── */}
        {tab === 'routes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">
                {routes.length} route{routes.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => setModal({ kind: 'addRoute' })}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl"
              >
                <Plus size={15} /> Add Route
              </button>
            </div>

            {routes.length === 0 ? (
              <EmptyCard message="No routes yet." />
            ) : (
              routes.map(r => (
                <RouteCard
                  key={r.id}
                  route={r}
                  onEdit={() => setModal({ kind: 'editRoute', route: r })}
                  onToggleActive={async () => {
                    const { error } = await supabase
                      .from('routes')
                      .update({ is_active: !r.is_active })
                      .eq('id', r.id)
                    if (!error) {
                      setRoutes(list =>
                        list.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x),
                      )
                    }
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ── Audit Log Tab ── */}
        {tab === 'audit' && (
          <AuditLogTab entries={initialAuditLog} staffMap={staffMap} />
        )}

        {/* ── Analytics Tab ── */}
        {tab === 'analytics' && (
          <AnalyticsTab userRole={userRole} />
        )}

      </main>

      {/* ── Modals rendered outside <main> so they sit above everything ── */}
      {modal?.kind === 'addStaff' && (
        <AddStaffModal
          onClose={closeModal}
          onCreated={profile => { setStaff(list => [...list, profile]); closeModal() }}
        />
      )}

      {modal?.kind === 'editStaff' && (
        <EditStaffModal
          staff={modal.staff}
          supabase={supabase}
          onClose={closeModal}
          onSaved={updated => {
            setStaff(list => list.map(s => s.id === updated.id ? updated : s))
            closeModal()
          }}
        />
      )}

      {modal?.kind === 'addRoute' && (
        <AddRouteModal
          supabase={supabase}
          onClose={closeModal}
          onCreated={route => {
            setRoutes(list => [...list, route].sort((a, b) => a.name.localeCompare(b.name)))
            closeModal()
          }}
        />
      )}

      {modal?.kind === 'editRoute' && (
        <EditRouteModal
          route={modal.route}
          supabase={supabase}
          onClose={closeModal}
          onSaved={updated => {
            setRoutes(list => list.map(r => r.id === updated.id ? updated : r))
            closeModal()
          }}
        />
      )}
    </div>
  )
}

// ─── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({ staff, onEdit, onToggleActive }: {
  staff:          StaffProfile
  onEdit:         () => void
  onToggleActive: () => Promise<void>
}) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    await onToggleActive()
    setToggling(false)
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 space-y-2.5',
      staff.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{staff.full_name}</p>
          {staff.phone && (
            <p className="text-xs text-gray-500 mt-0.5">{formatPhone(staff.phone)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            staff.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
          )}>
            {staff.role === 'ADMIN' ? 'Admin' : 'Steward Head'}
          </span>
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            staff.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
          )}>
            {staff.is_active ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">Added {fmtDate(staff.created_at)}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50',
            staff.is_active
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-green-200 text-green-700 hover:bg-green-50',
          )}
        >
          {toggling ? '…' : staff.is_active ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  )
}

// ─── Route card ───────────────────────────────────────────────────────────────

function RouteCard({ route, onEdit, onToggleActive }: {
  route:          Route
  onEdit:         () => void
  onToggleActive: () => Promise<void>
}) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    await onToggleActive()
    setToggling(false)
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 space-y-2.5',
      route.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{route.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{route.origin} → {route.destination}</p>
        </div>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
          route.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
        )}>
          {route.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50',
            route.is_active
              ? 'border-red-200 text-red-600 hover:bg-red-50'
              : 'border-green-200 text-green-700 hover:bg-green-50',
          )}
        >
          {toggling ? '…' : route.is_active ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  )
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────

function AddStaffModal({ onClose, onCreated }: {
  onClose:   () => void
  onCreated: (profile: StaffProfile) => void
}) {
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [role,     setRole]     = useState<UserRole>('STEWARD_HEAD')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    setPassword(
      Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    )
    setShowPass(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, email and password are required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/users', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ full_name: fullName, email, phone, role, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create account.')
      setSaving(false)
      return
    }
    onCreated(data.profile as StaffProfile)
  }

  return (
    <ModalShell title="Add Staff Member" onClose={onClose}>
      {/* form wraps fields AND footer so type="submit" works */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {error && <ErrorBanner message={error} />}

          <Field label="Full name *">
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Muhammad Ali" className={inputCls} />
          </Field>

          <Field label="Email address *">
            <input type="email" inputMode="email" autoCapitalize="none"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ali@subhantravels.com" className={inputCls} />
          </Field>

          <Field label="Phone" hint="Optional">
            <input type="tel" inputMode="numeric" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX" className={inputCls} />
          </Field>

          <Field label="Role *">
            <div className="flex gap-2">
              {(['STEWARD_HEAD', 'ADMIN'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    role === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {r === 'STEWARD_HEAD' ? 'Steward Head' : 'Admin'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Temporary password *">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className={cn(inputCls, 'pr-20')}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                type="button"
                onClick={generatePassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                title="Generate password"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Share this password with the staff member — you won&apos;t be able to view it again.
            </p>
          </Field>
        </div>

        {/* Footer is inside <form> so type="submit" works */}
        <ModalFooter onClose={onClose} saving={saving} submitLabel="Create Account" />
      </form>
    </ModalShell>
  )
}

// ─── Edit Staff Modal ─────────────────────────────────────────────────────────

function EditStaffModal({ staff, supabase, onClose, onSaved }: {
  staff:    StaffProfile
  supabase: ReturnType<typeof createClient>
  onClose:  () => void
  onSaved:  (updated: StaffProfile) => void
}) {
  const [fullName, setFullName] = useState(staff.full_name)
  const [phone,    setPhone]    = useState(staff.phone ?? '')
  const [role,     setRole]     = useState<UserRole>(staff.role)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required.'); return }
    setSaving(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, role })
      .eq('id', staff.id)
      .select()
      .single()

    if (dbError || !data) {
      setError(dbError?.message ?? 'Update failed.')
      setSaving(false)
      return
    }
    onSaved(data as StaffProfile)
  }

  return (
    <ModalShell title="Edit Staff Member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {error && <ErrorBanner message={error} />}

          <Field label="Full name *">
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Full name" className={inputCls} />
          </Field>

          <Field label="Phone" hint="Optional">
            <input type="tel" inputMode="numeric" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX" className={inputCls} />
          </Field>

          <Field label="Role *">
            <div className="flex gap-2">
              {(['STEWARD_HEAD', 'ADMIN'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    role === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {r === 'STEWARD_HEAD' ? 'Steward Head' : 'Admin'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <ModalFooter onClose={onClose} saving={saving} submitLabel="Save Changes" />
      </form>
    </ModalShell>
  )
}

// ─── Add Route Modal ──────────────────────────────────────────────────────────

function AddRouteModal({ supabase, onClose, onCreated }: {
  supabase:  ReturnType<typeof createClient>
  onClose:   () => void
  onCreated: (route: Route) => void
}) {
  const [name,        setName]        = useState('')
  const [origin,      setOrigin]      = useState('')
  const [destination, setDestination] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('routes')
      .insert({ name: name.trim(), origin: origin.trim(), destination: destination.trim(), is_active: true })
      .select()
      .single()

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to add route.')
      setSaving(false)
      return
    }
    onCreated(data as Route)
  }

  return (
    <ModalShell title="Add Route" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {error && <ErrorBanner message={error} />}

          <Field label="Route name *" hint="e.g. Faisalabad-Multan">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Faisalabad-Multan" className={inputCls} />
          </Field>

          <Field label="Origin *">
            <input type="text" value={origin} onChange={e => setOrigin(e.target.value)}
              placeholder="Faisalabad" className={inputCls} />
          </Field>

          <Field label="Destination *">
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
              placeholder="Multan" className={inputCls} />
          </Field>
        </div>

        <ModalFooter onClose={onClose} saving={saving} submitLabel="Add Route" />
      </form>
    </ModalShell>
  )
}

// ─── Edit Route Modal ─────────────────────────────────────────────────────────

function EditRouteModal({ route, supabase, onClose, onSaved }: {
  route:    Route
  supabase: ReturnType<typeof createClient>
  onClose:  () => void
  onSaved:  (updated: Route) => void
}) {
  const [name,        setName]        = useState(route.name)
  const [origin,      setOrigin]      = useState(route.origin)
  const [destination, setDestination] = useState(route.destination)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('routes')
      .update({ name: name.trim(), origin: origin.trim(), destination: destination.trim() })
      .eq('id', route.id)
      .select()
      .single()

    if (dbError || !data) {
      setError(dbError?.message ?? 'Update failed.')
      setSaving(false)
      return
    }
    onSaved(data as Route)
  }

  return (
    <ModalShell title="Edit Route" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {error && <ErrorBanner message={error} />}

          <Field label="Route name *">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Faisalabad-Multan" className={inputCls} />
          </Field>

          <Field label="Origin *">
            <input type="text" value={origin} onChange={e => setOrigin(e.target.value)}
              placeholder="Faisalabad" className={inputCls} />
          </Field>

          <Field label="Destination *">
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
              placeholder="Multan" className={inputCls} />
          </Field>
        </div>

        <ModalFooter onClose={onClose} saving={saving} submitLabel="Save Changes" />
      </form>
    </ModalShell>
  )
}

// ─── Audit Log Tab ───────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  CREATED:          'Complaint Created',
  STATUS_CHANGED:   'Status Changed',
  SEVERITY_CHANGED: 'Severity Changed',
  NOTE_ADDED:       'Internal Note Added',
  WHATSAPP_SENT:    'WhatsApp Sent',
  CSAT_LOGGED:      'CSAT Logged',
}

const ACTION_BADGE: Record<string, string> = {
  CREATED:          'bg-blue-100 text-blue-800',
  STATUS_CHANGED:   'bg-amber-100 text-amber-800',
  SEVERITY_CHANGED: 'bg-purple-100 text-purple-800',
  NOTE_ADDED:       'bg-gray-100 text-gray-700',
  WHATSAPP_SENT:    'bg-green-100 text-green-800',
  CSAT_LOGGED:      'bg-pink-100 text-pink-800',
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins   = Math.floor(diffMs / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatChange(entry: AuditLogEntry): string | null {
  if (entry.old_value && entry.new_value) return `${entry.old_value} → ${entry.new_value}`
  if (entry.new_value) return entry.new_value
  return null
}

function AuditLogTab({ entries, staffMap }: {
  entries:  AuditLogEntry[]
  staffMap: Record<string, string>
}) {
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL'
    ? entries
    : entries.filter(e => e.action_type === filter)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 h-10 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Actions</option>
          <option value="CREATED">Complaint Created</option>
          <option value="STATUS_CHANGED">Status Changed</option>
          <option value="SEVERITY_CHANGED">Severity Changed</option>
          <option value="NOTE_ADDED">Note Added</option>
          <option value="WHATSAPP_SENT">WhatsApp Sent</option>
          <option value="CSAT_LOGGED">CSAT Logged</option>
        </select>
        <p className="text-xs text-gray-400 shrink-0">{filtered.length} entries</p>
      </div>

      {filtered.length === 0 ? (
        <EmptyCard message="No audit log entries for this filter." />
      ) : (
        filtered.map(entry => (
          <AuditCard key={entry.id} entry={entry} staffMap={staffMap} />
        ))
      )}
    </div>
  )
}

function AuditCard({ entry, staffMap }: {
  entry:    AuditLogEntry
  staffMap: Record<string, string>
}) {
  const change    = formatChange(entry)
  const performer = entry.performed_by_user_id
    ? (staffMap[entry.performed_by_user_id] ?? 'Staff')
    : 'System'
  const absDate   = new Date(entry.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          ACTION_BADGE[entry.action_type] ?? 'bg-gray-100 text-gray-700',
        )}>
          {ACTION_LABELS[entry.action_type] ?? entry.action_type}
        </span>
        <span title={absDate} className="text-xs text-gray-400 shrink-0 cursor-default">
          {relativeTime(entry.created_at)}
        </span>
      </div>

      <a
        href={`/staff/complaint/${entry.complaint_id}`}
        className="block text-sm font-bold text-primary hover:underline font-mono"
      >
        {entry.reference_number}
      </a>

      {change && (
        <p className="text-xs text-gray-600 font-mono">{change}</p>
      )}

      {entry.notes && (
        <p className="text-xs text-gray-500 italic">&ldquo;{entry.notes}&rdquo;</p>
      )}

      <p className="text-xs text-gray-400">by {performer}</p>
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputCls =
  'w-full h-11 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary'

function Field({ label, hint, children }: {
  label:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
        {hint && <span className="font-normal text-gray-400 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
      {message}
    </div>
  )
}

// ModalShell: backdrop + white card + header with X close button
function ModalShell({ title, onClose, children }: {
  title:    string
  onClose:  () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <p className="font-bold text-gray-900">{title}</p>
          {/* type="button" so this doesn't submit any form it might be near */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 active:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ModalFooter: rendered INSIDE each modal's <form> so type="submit" actually works
function ModalFooter({ onClose, saving, submitLabel }: {
  onClose:     () => void
  saving:      boolean
  submitLabel: string
}) {
  return (
    <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2 shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
