'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowLeft, MessageCircle, X, Plus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ComplaintStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED'
type CsatStatus      = 'SATISFIED' | 'UNSATISFIED' | 'NO_RESPONSE'

export type Complaint = {
  id:                         string
  reference_number:           string
  source:                     string
  passenger_name:             string | null
  passenger_phone:            string
  route_id:                   string
  travel_date:                string
  departure_time:             string
  bus_number:                 string | null
  category:                   string
  bus_condition_subcategory:  string | null
  delay_subcategory:          string | null
  driver_subcategory:         string | null
  steward_subcategory:        string | null
  driver_name:                string | null
  steward_name:               string | null
  description:                string | null
  photo_url:                  string | null
  severity:                   string
  severity_auto_assigned:     boolean
  status:                     ComplaintStatus
  is_about_steward_head:      boolean
  is_maintenance_required:    boolean
  resolution_notes:           string | null
  csat_response:              CsatStatus | null
  created_at:                 string
  investigating_at:           string | null
  resolved_at:                string | null
  closed_at:                  string | null
  archived_at:                string | null
  routes:                     { id: string; name: string } | null
}

type HistoryEntry = {
  id:                   string
  complaint_id:         string
  action_type:          string
  old_value:            string | null
  new_value:            string | null
  notes:                string | null
  performed_by_user_id: string | null
  created_at:           string
}

type Note = {
  id:                  string
  complaint_id:        string
  note:                string
  created_by_user_id:  string
  created_at:          string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  DRIVER:              'Driver',
  STEWARD:             'Steward',
  DRIVER_STEWARD:      'Driver / Steward',
  BUS_CONDITION:       'Bus Condition',
  FOOD_DRINKS:         'Food / Drinks',
  DELAY_TIMING:        'Delay / Timing',
  TICKET_REFUND:       'Ticket / Refund',
  OTHER_SERIOUS:       'Other / Serious',
  SUGGESTION_FEEDBACK: 'Suggestion / Feedback',
}

const DRIVER_SUB_LABELS: Record<string, string> = {
  RECKLESS_DRIVING: 'Reckless / dangerous driving',
  MOBILE_USE:       'Mobile phone use while driving',
  RUDE_BEHAVIOR:    'Rude behavior',
  OTHER:            'Other',
}

const STEWARD_SUB_LABELS: Record<string, string> = {
  RUDE_BEHAVIOR:        'Rude behavior',
  UNRESPONSIVE:         'Unresponsive / not helping',
  NOT_SERVING_PROPERLY: 'Not serving properly',
  OTHER:                'Other',
}

const BUS_COND_LABELS: Record<string, string> = {
  AC_HEATING:           'AC / Heating',
  ENTERTAINMENT_TABLET: 'Entertainment Tablet',
  SEAT:                 'Seat',
  CLEANLINESS:          'Cleanliness',
}

const DELAY_LABELS: Record<string, string> = {
  LATE_DEPARTURE:  'Late Departure',
  LATE_ARRIVAL:    'Late Arrival',
  EXCESSIVE_STOPS: 'Excessive Stops',
}

const SOURCE_LABELS: Record<string, string> = {
  PUBLIC_FORM: 'Online Form',
  PHONE:       'Phone',
  WHATSAPP:    'WhatsApp',
  IN_PERSON:   'In Person',
  EMAIL:       'Email',
  OTHER:       'Other',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN:          'Open',
  INVESTIGATING: 'Investigating',
  RESOLVED:      'Resolved',
  CLOSED:        'Closed',
  ARCHIVED:      'Archived',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:          'bg-blue-100 text-blue-800',
  INVESTIGATING: 'bg-amber-100 text-amber-800',
  RESOLVED:      'bg-green-100 text-green-800',
  CLOSED:        'bg-gray-100 text-gray-700',
  ARCHIVED:      'bg-gray-100 text-gray-500',
}

const SEVERITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW:    'bg-green-100 text-green-800',
}

const ACTION_LABELS: Record<string, string> = {
  CREATED:          'Complaint created',
  STATUS_CHANGED:   'Status changed',
  SEVERITY_CHANGED: 'Severity changed',
  NOTE_ADDED:       'Internal note added',
  WHATSAPP_SENT:    'WhatsApp message sent',
  CSAT_LOGGED:      'CSAT response logged',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtPhone(phone: string): string {
  const local = phone.replace(/^\+92/, '0')
  return local.length === 11 ? `${local.slice(0, 4)}-${local.slice(4)}` : phone
}

function waLink(phone: string, msg: string) {
  return `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(msg)}`
}

function buildWaMessage(c: Complaint): string {
  const name = c.passenger_name || 'Valued Passenger'
  const cat  = CATEGORY_LABELS[c.category] ?? c.category
  const date = fmtDate(c.travel_date)

  let body = `Assalamu Alaikum ${name},\n\nRegarding your complaint (Ref: ${c.reference_number}) about ${cat} on ${date}`

  if (c.status === 'INVESTIGATING') {
    body += ', our team is currently investigating the matter. We will update you shortly.'
  } else if (c.status === 'RESOLVED' && c.resolution_notes) {
    body += `, we are pleased to inform you that it has been resolved.\n\nResolution: ${c.resolution_notes}`
  } else if (c.status === 'RESOLVED') {
    body += ', we are pleased to inform you that it has been resolved.'
  } else {
    body += ', we have received your complaint and will be in touch soon.'
  }

  body += '\n\nJazakAllah Khairan,\nSubhan Travels Customer Care'
  return body
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  complaint:       Complaint
  history:         HistoryEntry[]
  notes:           Note[]
  staffMap:        Record<string, string>
  currentUserId:   string
  currentUserName: string
  currentUserRole: 'ADMIN' | 'STEWARD_HEAD'
}

export default function ComplaintDetail({
  complaint: init,
  history: initHistory,
  notes: initNotes,
  staffMap,
  currentUserId,
  currentUserRole,
}: Props) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [complaint,       setComplaint]       = useState(init)
  const [history,         setHistory]         = useState(initHistory)
  const [notes,           setNotes]           = useState(initNotes)

  const [showWa,          setShowWa]          = useState(false)
  const [showResolve,     setShowResolve]     = useState(false)
  const [resolutionText,  setResolutionText]  = useState(init.resolution_notes ?? '')
  const [noteText,        setNoteText]        = useState('')

  const [saving,          setSaving]          = useState(false)
  const [statusError,     setStatusError]     = useState('')
  const [noteError,       setNoteError]       = useState('')

  const canEdit = complaint.status !== 'ARCHIVED'

  // ── Status change ──────────────────────────────────────────────────────────
  async function changeStatus(next: ComplaintStatus, resNotes?: string) {
    setSaving(true)
    setStatusError('')

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { status: next }
    if (resNotes !== undefined)      patch.resolution_notes = resNotes
    if (next === 'INVESTIGATING')    patch.investigating_at = now
    if (next === 'RESOLVED')         patch.resolved_at      = now
    if (next === 'CLOSED')           patch.closed_at        = now
    if (next === 'ARCHIVED')         patch.archived_at      = now

    const { error } = await supabase.from('complaints').update(patch).eq('id', complaint.id)
    if (error) {
      setStatusError('Failed to update status. Please try again.')
      setSaving(false)
      return
    }

    const { data: h } = await supabase
      .from('complaint_history')
      .insert({
        complaint_id:         complaint.id,
        action_type:          'STATUS_CHANGED',
        old_value:            complaint.status,
        new_value:            next,
        performed_by_user_id: currentUserId,
      })
      .select()
      .single()

    setComplaint(c => ({
      ...c,
      status:           next,
      resolution_notes: resNotes ?? c.resolution_notes,
      ...(next === 'INVESTIGATING' && { investigating_at: now }),
      ...(next === 'RESOLVED'      && { resolved_at:      now }),
      ...(next === 'CLOSED'        && { closed_at:        now }),
      ...(next === 'ARCHIVED'      && { archived_at:      now }),
    }))
    if (h) setHistory(hs => [...hs, h])
    setShowResolve(false)
    setSaving(false)
  }

  // ── CSAT ──────────────────────────────────────────────────────────────────
  async function logCsat(csat: CsatStatus) {
    if (!canEdit || saving) return
    setSaving(true)

    const { error } = await supabase.from('complaints').update({ csat_response: csat }).eq('id', complaint.id)
    if (!error) {
      const { data: h } = await supabase
        .from('complaint_history')
        .insert({ complaint_id: complaint.id, action_type: 'CSAT_LOGGED', new_value: csat, performed_by_user_id: currentUserId })
        .select().single()
      setComplaint(c => ({ ...c, csat_response: csat }))
      if (h) setHistory(hs => [...hs, h])
    }
    setSaving(false)
  }

  // ── WhatsApp log ──────────────────────────────────────────────────────────
  async function logWhatsApp() {
    const { data: h } = await supabase
      .from('complaint_history')
      .insert({ complaint_id: complaint.id, action_type: 'WHATSAPP_SENT', performed_by_user_id: currentUserId, notes: 'Opened from staff dashboard' })
      .select().single()
    if (h) setHistory(hs => [...hs, h])
  }

  // ── Add note ──────────────────────────────────────────────────────────────
  async function addNote() {
    if (!noteText.trim()) { setNoteError('Note cannot be empty.'); return }
    setSaving(true)
    setNoteError('')

    const { data: newNote, error } = await supabase
      .from('internal_notes')
      .insert({ complaint_id: complaint.id, note: noteText.trim(), created_by_user_id: currentUserId })
      .select().single()

    if (error) { setNoteError('Failed to save note.'); setSaving(false); return }

    const { data: h } = await supabase
      .from('complaint_history')
      .insert({ complaint_id: complaint.id, action_type: 'NOTE_ADDED', performed_by_user_id: currentUserId })
      .select().single()

    setNotes(ns => [newNote, ...ns])
    if (h) setHistory(hs => [...hs, h])
    setNoteText('')
    setSaving(false)
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const sub = complaint.bus_condition_subcategory
    ? (BUS_COND_LABELS[complaint.bus_condition_subcategory] ?? complaint.bus_condition_subcategory)
    : complaint.delay_subcategory
    ? (DELAY_LABELS[complaint.delay_subcategory] ?? complaint.delay_subcategory)
    : complaint.driver_subcategory
    ? (DRIVER_SUB_LABELS[complaint.driver_subcategory] ?? complaint.driver_subcategory)
    : complaint.steward_subcategory
    ? (STEWARD_SUB_LABELS[complaint.steward_subcategory] ?? complaint.steward_subcategory)
    : null

  const showCsat  = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
  const waMessage = buildWaMessage(complaint)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/staff/dashboard')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 p-2 -ml-2 rounded-xl hover:bg-gray-100 active:bg-gray-200"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <span className="text-sm font-bold text-gray-900 tracking-wide truncate">
            {complaint.reference_number}
          </span>

          <button
            onClick={() => setShowWa(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 px-3 py-2 rounded-xl shrink-0"
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">

        {/* ── Status & Actions ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', STATUS_COLORS[complaint.status])}>
              {STATUS_LABELS[complaint.status]}
            </span>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', SEVERITY_COLORS[complaint.severity])}>
              {complaint.severity.charAt(0) + complaint.severity.slice(1).toLowerCase()} Severity
            </span>
            {complaint.is_maintenance_required && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                Maintenance Required
              </span>
            )}
            {complaint.is_about_steward_head && currentUserRole === 'ADMIN' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                About Steward Head
              </span>
            )}
          </div>

          {statusError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              {statusError}
            </p>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {complaint.status === 'OPEN' && (
                <ActionBtn
                  label="Start Investigation"
                  cls="bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={saving}
                  onClick={() => changeStatus('INVESTIGATING')}
                />
              )}
              {(complaint.status === 'OPEN' || complaint.status === 'INVESTIGATING') && (
                <ActionBtn
                  label="Mark Resolved"
                  cls="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saving}
                  onClick={() => setShowResolve(true)}
                />
              )}
              {complaint.status === 'RESOLVED' && (
                <ActionBtn
                  label="Close Complaint"
                  cls="bg-gray-700 hover:bg-gray-800 text-white"
                  disabled={saving}
                  onClick={() => changeStatus('CLOSED')}
                />
              )}
              <ActionBtn
                label="Archive"
                cls="bg-gray-100 hover:bg-gray-200 text-gray-700"
                disabled={saving}
                onClick={() => changeStatus('ARCHIVED')}
              />
            </div>
          )}
        </div>

        {/* ── Complaint Details ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          <DetailRow label="Reference"   value={complaint.reference_number} />
          <DetailRow label="Submitted"   value={fmt(complaint.created_at)} />
          <DetailRow label="Source"      value={SOURCE_LABELS[complaint.source] ?? complaint.source} />
          <DetailRow label="Passenger"   value={complaint.passenger_name ?? '—'} />
          <DetailRow label="Phone"       value={fmtPhone(complaint.passenger_phone)} />
          <DetailRow label="Route"       value={complaint.routes?.name ?? '—'} />
          <DetailRow label="Travel Date" value={fmtDate(complaint.travel_date)} />
          <DetailRow label="Departure"   value={complaint.departure_time} />
          <DetailRow label="Bus Number"  value={complaint.bus_number ?? '—'} />
          <DetailRow
            label="Category"
            value={
              sub
                ? `${CATEGORY_LABELS[complaint.category] ?? complaint.category} — ${sub}`
                : (CATEGORY_LABELS[complaint.category] ?? complaint.category)
            }
          />
          {complaint.driver_name && (
            <DetailRow label="Driver Name" value={complaint.driver_name} />
          )}
          {complaint.steward_name && (
            <DetailRow label="Steward Name" value={complaint.steward_name} />
          )}
          {complaint.description && (
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Description</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {complaint.description}
              </p>
            </div>
          )}
        </div>

        {/* ── Photo ─────────────────────────────────────────────────────────── */}
        {complaint.photo_url && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Photo</p>
            <a href={complaint.photo_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={complaint.photo_url}
                alt="Complaint photo"
                className="w-full max-h-72 object-contain rounded-xl border border-gray-100 bg-gray-50"
              />
              <p className="text-xs text-center text-primary mt-2">Tap to view full size ↗</p>
            </a>
          </div>
        )}

        {/* ── Resolution Notes ───────────────────────────────────────────────── */}
        {complaint.resolution_notes && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
            <p className="text-xs font-semibold text-green-700 mb-1.5">Resolution</p>
            <p className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed">
              {complaint.resolution_notes}
            </p>
          </div>
        )}

        {/* ── CSAT ──────────────────────────────────────────────────────────── */}
        {showCsat && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Passenger Satisfaction</p>
            <div className="flex gap-2">
              {(['SATISFIED', 'UNSATISFIED', 'NO_RESPONSE'] as CsatStatus[]).map(csat => {
                const active = complaint.csat_response === csat
                return (
                  <button
                    key={csat}
                    disabled={saving || !canEdit}
                    onClick={() => logCsat(csat)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60',
                      active
                        ? csat === 'SATISFIED'   ? 'bg-green-500 border-green-500 text-white'
                        : csat === 'UNSATISFIED' ? 'bg-red-500 border-red-500 text-white'
                        :                          'bg-gray-500 border-gray-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {csat === 'SATISFIED'   ? '😊 Satisfied'   :
                     csat === 'UNSATISFIED' ? '😞 Not Satisfied' :
                                             '— No Response'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Internal Notes ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Internal Notes</p>

          {canEdit && (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={e => { setNoteText(e.target.value); setNoteError('') }}
                placeholder="Add a staff note (never visible to passengers)…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {noteError && <p className="text-xs text-red-500">{noteError}</p>}
              <button
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                <Plus size={15} /> Add Note
              </button>
            </div>
          )}

          {notes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No notes yet.</p>
          ) : (
            <div className="space-y-2.5">
              {notes.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                  <p className="text-xs text-gray-400">
                    {staffMap[n.created_by_user_id] ?? 'Staff'} · {fmt(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Action History ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">History</p>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No history entries.</p>
          ) : (
            <ol className="space-y-3">
              {[...history].reverse().map(h => (
                <li key={h.id} className="flex gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm text-gray-800">
                      {ACTION_LABELS[h.action_type] ?? h.action_type}
                      {h.action_type === 'STATUS_CHANGED' && h.old_value && h.new_value && (
                        <span className="text-gray-500">
                          {' '}— {STATUS_LABELS[h.old_value] ?? h.old_value}
                          {' → '}
                          {STATUS_LABELS[h.new_value] ?? h.new_value}
                        </span>
                      )}
                      {h.action_type === 'CSAT_LOGGED' && h.new_value && (
                        <span className="text-gray-500"> — {h.new_value.replace('_', ' ').toLowerCase()}</span>
                      )}
                    </p>
                    {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                    <p className="text-xs text-gray-400">
                      {h.performed_by_user_id
                        ? (staffMap[h.performed_by_user_id] ?? 'Staff')
                        : 'System'}
                      {' · '}
                      {fmt(h.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

      </main>

      {/* ── WhatsApp Modal ────────────────────────────────────────────────────── */}
      {showWa && (
        <Modal title="WhatsApp Message" onClose={() => setShowWa(false)}>
          <div className="p-4 flex-1 overflow-auto space-y-2">
            <p className="text-xs text-gray-500">
              Message to {fmtPhone(complaint.passenger_phone)} — review and tap &ldquo;Open WhatsApp&rdquo;
            </p>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {waMessage}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(waMessage).catch(() => {})}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Copy
            </button>
            <a
              href={waLink(complaint.passenger_phone, waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setShowWa(false); logWhatsApp() }}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold text-center"
            >
              Open WhatsApp
            </a>
          </div>
        </Modal>
      )}

      {/* ── Resolve Modal ─────────────────────────────────────────────────────── */}
      {showResolve && (
        <Modal title="Mark as Resolved" onClose={() => setShowResolve(false)}>
          <div className="p-4 flex-1 space-y-3">
            <p className="text-sm text-gray-600">
              Describe what action was taken. This will be shown to the passenger on the status page.
            </p>
            <textarea
              value={resolutionText}
              onChange={e => setResolutionText(e.target.value)}
              placeholder="e.g. Spoke with driver, issued formal warning. Refund processed."
              rows={5}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="p-4 border-t border-gray-200 flex gap-2">
            <button
              onClick={() => setShowResolve(false)}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={() => changeStatus('RESOLVED', resolutionText.trim() || undefined)}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Mark Resolved'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ActionBtn({ label, cls, disabled, onClick }: {
  label:    string
  cls:      string
  disabled: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]',
        cls,
      )}
    >
      {label}
    </button>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <p className="text-xs font-semibold text-gray-500 w-24 shrink-0 pt-0.5 leading-tight">{label}</p>
      <p className="text-sm text-gray-800 flex-1 leading-snug">{value}</p>
    </div>
  )
}

function Modal({ title, onClose, children }: {
  title:    string
  onClose:  () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 active:bg-gray-200">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
