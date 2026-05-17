'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Search, ChevronLeft } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

type ComplaintStatus = {
  id: string
  reference_number: string
  passenger_name: string | null
  route_id: string
  travel_date: string
  departure_time: string
  bus_number: string | null
  category: string
  severity: string
  status: string
  resolution_notes: string | null
  created_at: string
  investigating_at: string | null
  resolved_at: string | null
  closed_at: string | null
}

type HistoryEntry = {
  action_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  return digits.slice(0, 4) + '-' + digits.slice(4)
}

function phoneToE164(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 11) return '+92' + digits.slice(1)
  return display
}

function validatePhone(display: string): boolean {
  return /^03\d{9}$/.test(display.replace(/\D/g, ''))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const STATUS_LABELS: Record<string, string> = {
  OPEN:          'Received',
  INVESTIGATING: 'Under Investigation',
  RESOLVED:      'Resolved',
  CLOSED:        'Closed',
  ARCHIVED:      'Archived',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:          'bg-blue-100 text-blue-800',
  INVESTIGATING: 'bg-amber-100 text-amber-800',
  RESOLVED:      'bg-green-100 text-green-800',
  CLOSED:        'bg-gray-100 text-gray-600',
  ARCHIVED:      'bg-gray-100 text-gray-500',
}

const CATEGORY_LABELS: Record<string, string> = {
  DRIVER_STEWARD:      'Driver / Steward',
  BUS_CONDITION:       'Bus Condition',
  FOOD_DRINKS:         'Food / Drinks',
  DELAY_TIMING:        'Delay / Timing',
  TICKET_REFUND:       'Ticket / Refund',
  OTHER_SERIOUS:       'Other / Serious',
  SUGGESTION_FEEDBACK: 'Suggestion / Feedback',
}

// ── Timeline ─────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { status: 'OPEN',          label: 'Complaint Received' },
  { status: 'INVESTIGATING', label: 'Under Investigation' },
  { status: 'RESOLVED',      label: 'Resolved' },
  { status: 'CLOSED',        label: 'Closed' },
]

const STATUS_ORDER = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'ARCHIVED']

function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status)
}

function getStepTimestamp(
  step: string,
  complaint: ComplaintStatus,
): string | null {
  if (step === 'OPEN') return complaint.created_at
  if (step === 'INVESTIGATING') return complaint.investigating_at
  if (step === 'RESOLVED') return complaint.resolved_at
  if (step === 'CLOSED') return complaint.closed_at
  return null
}

// ── Component ────────────────────────────────────────────────

export default function StatusPage({ referenceNumber }: { referenceNumber: string }) {
  const [phone,     setPhone]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [lookupErr, setLookupErr] = useState('')
  const [complaint, setComplaint] = useState<ComplaintStatus | null>(null)
  const [routeName, setRouteName] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!validatePhone(phone)) {
      setLookupErr('Enter your mobile number in the format 03XX-XXXXXXX')
      return
    }
    setLoading(true)
    setLookupErr('')

    const supabase   = createClient()
    const e164Phone  = phoneToE164(phone)

    const { data: statusData, error: statusError } = await supabase.rpc('get_complaint_status', {
      p_reference: referenceNumber,
      p_phone:     e164Phone,
    })

    if (statusError || !statusData || statusData.length === 0) {
      setLookupErr(
        'No complaint found matching this reference number and mobile number. ' +
        'Please check both and try again.'
      )
      setLoading(false)
      return
    }

    const found = statusData[0] as ComplaintStatus
    setComplaint(found)

    // Fetch route name — anon has SELECT on routes
    const { data: routeData } = await supabase
      .from('routes')
      .select('name')
      .eq('id', found.route_id)
      .single()
    setRouteName(routeData?.name ?? '')

    setLoading(false)
  }

  // ── Status display ───────────────────────────────────────

  if (complaint) {
    const currentIndex = getStatusIndex(complaint.status)

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-primary text-primary-foreground text-center py-3 px-4 text-sm font-medium">
          Subhan Complaints — Complaint Status
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6 pb-16 space-y-4">

          {/* Back */}
          <button
            onClick={() => { setComplaint(null); setRouteName('') }}
            className="flex items-center gap-1 text-sm text-gray-500 active:text-gray-800"
          >
            <ChevronLeft size={16} />
            Check a different number
          </button>

          {/* Reference + status badge */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-2xl font-bold font-mono text-gray-900 mb-3">
              {complaint.reference_number}
            </p>
            <span className={cn(
              'inline-block px-3 py-1 rounded-full text-sm font-semibold',
              STATUS_COLORS[complaint.status] ?? 'bg-gray-100 text-gray-600'
            )}>
              {STATUS_LABELS[complaint.status] ?? complaint.status}
            </span>
          </div>

          {/* Complaint details */}
          <div className="bg-white rounded-2xl shadow-sm divide-y overflow-hidden">
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">Submitted</span>
              <span className="font-medium">{formatDate(complaint.created_at)}</span>
            </div>
            {routeName && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-500">Route</span>
                <span className="font-medium">{routeName}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">Travel Date</span>
              <span className="font-medium">{formatDate(complaint.travel_date + 'T00:00:00')}</span>
            </div>
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-gray-500">Category</span>
              <span className="font-medium">{CATEGORY_LABELS[complaint.category] ?? complaint.category}</span>
            </div>
            {complaint.bus_number && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-500">Bus Number</span>
                <span className="font-medium">{complaint.bus_number}</span>
              </div>
            )}
          </div>

          {/* Resolution notes */}
          {complaint.resolution_notes && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-green-800 mb-1">Resolution</p>
              <p className="text-sm text-green-700">{complaint.resolution_notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Timeline</p>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const stepIndex  = getStatusIndex(step.status)
                const isDone     = currentIndex >= stepIndex
                const isActive   = complaint.status === step.status
                const timestamp  = getStepTimestamp(step.status, complaint)
                const isLast     = i === TIMELINE_STEPS.length - 1

                return (
                  <div key={step.status} className="flex gap-3">
                    {/* Icon + connector */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2',
                        isDone
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-white border-gray-200 text-gray-300'
                      )}>
                        {isDone
                          ? <CheckCircle2 size={16} />
                          : <Circle size={16} />
                        }
                      </div>
                      {!isLast && (
                        <div className={cn(
                          'w-0.5 flex-1 my-1 min-h-[20px]',
                          currentIndex > stepIndex ? 'bg-primary' : 'bg-gray-200'
                        )} />
                      )}
                    </div>

                    {/* Label + timestamp */}
                    <div className="pb-5">
                      <p className={cn(
                        'text-sm font-medium leading-7',
                        isDone ? 'text-gray-900' : 'text-gray-400'
                      )}>
                        {step.label}
                        {isActive && (
                          <span className="ml-2 text-xs font-normal text-primary">← current</span>
                        )}
                      </p>
                      {timestamp && (
                        <p className="text-xs text-gray-400">{formatDateTime(timestamp)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Contact note */}
          <p className="text-center text-xs text-gray-400 px-4">
            For urgent queries contact Subhan Travels directly.
          </p>

        </div>
      </div>
    )
  }

  // ── Phone lookup form ────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary text-primary-foreground text-center py-3 px-4 text-sm font-medium">
        Subhan Complaints — Complaint Status
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Search size={28} className="text-primary" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">
            Track Your Complaint
          </h1>
          <p className="text-sm text-gray-500 text-center mb-1">
            Reference: <span className="font-mono font-semibold text-gray-700">{referenceNumber}</span>
          </p>
          <p className="text-xs text-gray-400 text-center mb-6">
            Enter the mobile number used when submitting
          </p>

          <form onSubmit={handleLookup} noValidate className="space-y-4">
            <div>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => {
                  setPhone(formatPhoneDisplay(e.target.value))
                  if (lookupErr) setLookupErr('')
                }}
                placeholder="03XX-XXXXXXX"
                className={cn(
                  'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary text-center tracking-wider',
                  lookupErr ? 'border-red-400' : 'border-gray-300'
                )}
              />
              {lookupErr && (
                <p className="text-xs text-red-500 mt-2 text-center">{lookupErr}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'View Status'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
