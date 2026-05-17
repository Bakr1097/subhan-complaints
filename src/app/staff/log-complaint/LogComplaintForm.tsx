'use client'

import { useState, useRef, useMemo, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Car, UserCheck, Bus, UtensilsCrossed, Clock, Ticket, AlertTriangle, Lightbulb,
  Upload, X, ArrowLeft,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Route = { id: string; name: string }
type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type Source   = 'PHONE' | 'WHATSAPP' | 'IN_PERSON' | 'EMAIL' | 'OTHER'

interface Props {
  routes:          Route[]
  currentUserId:   string
  currentUserName: string
  currentUserRole: 'ADMIN' | 'STEWARD_HEAD'
}

type CategoryEntry = {
  value:     string
  label:     string
  icon:      ElementType
  severity:  Severity
  variant?:  'suggestion'
}

type SubcategoryEntry = {
  value:                string
  label:                string
  emoji:                string
  severity:             Severity
  isMaintenanceRequired: boolean
}

type DelayEntry = {
  value: string
  label: string
  emoji: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DRIVER_SUBCATEGORIES = [
  { value: 'RECKLESS_DRIVING', label: 'Reckless / dangerous driving',   emoji: '⚠️' },
  { value: 'MOBILE_USE',       label: 'Mobile phone use while driving', emoji: '📵' },
  { value: 'RUDE_BEHAVIOR',    label: 'Rude behavior',                  emoji: '😠' },
  { value: 'OTHER',            label: 'Other',                          emoji: '❓' },
]

const STEWARD_SUBCATEGORIES = [
  { value: 'RUDE_BEHAVIOR',        label: 'Rude behavior',              emoji: '😠' },
  { value: 'UNRESPONSIVE',         label: 'Unresponsive / not helping', emoji: '😴' },
  { value: 'NOT_SERVING_PROPERLY', label: 'Not serving properly',       emoji: '❌' },
  { value: 'OTHER',                label: 'Other',                      emoji: '❓' },
]

const NON_SUGGESTION_COUNT = 7

const SOURCES: { value: Source; label: string }[] = [
  { value: 'PHONE',     label: 'Phone Call'  },
  { value: 'WHATSAPP',  label: 'WhatsApp'    },
  { value: 'IN_PERSON', label: 'In Person'   },
  { value: 'EMAIL',     label: 'Email'       },
  { value: 'OTHER',     label: 'Other'       },
]

const CATEGORIES: CategoryEntry[] = [
  { value: 'DRIVER',              label: 'Driver',               icon: Car,            severity: 'HIGH'   },
  { value: 'STEWARD',             label: 'Steward',              icon: UserCheck,      severity: 'MEDIUM' },
  { value: 'BUS_CONDITION',       label: 'Bus Condition',        icon: Bus,            severity: 'HIGH'   },
  { value: 'FOOD_DRINKS',         label: 'Food / Drinks',        icon: UtensilsCrossed, severity: 'HIGH'  },
  { value: 'DELAY_TIMING',        label: 'Delay / Timing',       icon: Clock,          severity: 'MEDIUM' },
  { value: 'TICKET_REFUND',       label: 'Ticket / Refund',      icon: Ticket,         severity: 'MEDIUM' },
  { value: 'OTHER_SERIOUS',       label: 'Other / Serious',      icon: AlertTriangle,  severity: 'HIGH'   },
  { value: 'SUGGESTION_FEEDBACK', label: 'Suggestion / Feedback', icon: Lightbulb,     severity: 'LOW',   variant: 'suggestion' },
]

const BUS_SUBCATEGORIES: SubcategoryEntry[] = [
  { value: 'AC_HEATING',           label: 'AC / Heating',         emoji: '❄️', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'ENTERTAINMENT_TABLET', label: 'Entertainment Tablet', emoji: '📱', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'SEAT',                 label: 'Seat',                 emoji: '🪑', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'CLEANLINESS',          label: 'Cleanliness',          emoji: '🧹', severity: 'HIGH',   isMaintenanceRequired: false },
]

const DELAY_SUBCATEGORIES: DelayEntry[] = [
  { value: 'LATE_DEPARTURE',  label: 'Late Departure',                emoji: '⏰' },
  { value: 'LATE_ARRIVAL',    label: 'Late Arrival',                  emoji: '🛣️' },
  { value: 'EXCESSIVE_STOPS', label: 'Excessive Stops / Slow Journey', emoji: '🚏' },
]

const STEWARD_HEAD_KEYWORDS = ['steward head', 'main steward', 'supervisor', 'bara steward']

const SEVERITY_COLORS: Record<Severity, string> = {
  HIGH:   'bg-red-100 text-red-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW:    'bg-green-100 text-green-800',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getTodayStr():  string { return new Date().toISOString().split('T')[0] }
function getMinDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function getNowDateTimeLocal(): string {
  const now = new Date()
  // datetime-local wants YYYY-MM-DDTHH:MM in local time
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function containsStewardHeadKw(text: string): boolean {
  const lower = text.toLowerCase()
  return STEWARD_HEAD_KEYWORDS.some(kw => lower.includes(kw))
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const MAX = 1920
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height / width) * MAX); width = MAX }
          else                 { width  = Math.round((width / height) * MAX); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => resolve(
            blob
              ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
              : file
          ),
          'image/jpeg',
          0.85,
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LogComplaintForm({ routes, currentUserId, currentUserName }: Props) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // ── Staff-only fields ──
  const [source,            setSource]            = useState<Source>('PHONE')
  const [originalTimestamp, setOriginalTimestamp] = useState(getNowDateTimeLocal())

  // ── Complaint fields ──
  const [phone,                   setPhone]                   = useState('')
  const [passengerName,           setPassengerName]           = useState('')
  const [routeId,                 setRouteId]                 = useState('')
  const [travelDate,              setTravelDate]              = useState('')
  const [departureTime,           setDepartureTime]           = useState('')
  const [busNumber,               setBusNumber]               = useState('')
  const [category,                setCategory]                = useState('')
  const [busConditionSubcategory, setBusConditionSubcategory] = useState('')
  const [delaySubcategory,        setDelaySubcategory]        = useState('')
  const [driverSubcategory,       setDriverSubcategory]       = useState('')
  const [stewardSubcategory,      setStewardSubcategory]      = useState('')
  const [driverName,              setDriverName]              = useState('')
  const [stewardName,             setStewardName]             = useState('')
  const [isAboutStewardHead,      setIsAboutStewardHead]      = useState(false)
  const [description,             setDescription]             = useState('')
  const [photo,                   setPhoto]                   = useState<File | null>(null)
  const [photoPreview,            setPhotoPreview]            = useState<string | null>(null)

  // ── Severity override ──
  const [severityOverride, setSeverityOverride] = useState<Severity | null>(null)

  // ── UI state ──
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Derived severity ─────────────────────────────────────────────────────
  const autoSeverity: Severity = useMemo(() => {
    if (category === 'BUS_CONDITION' && busConditionSubcategory) {
      return BUS_SUBCATEGORIES.find(s => s.value === busConditionSubcategory)?.severity ?? 'HIGH'
    }
    return CATEGORIES.find(c => c.value === category)?.severity ?? 'MEDIUM'
  }, [category, busConditionSubcategory])

  const effectiveSeverity: Severity = severityOverride ?? autoSeverity

  // ─── Photo handlers ───────────────────────────────────────────────────────
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Photo must be under 5MB.' }))
      return
    }
    setPhoto(file)
    setErrors(prev => ({ ...prev, photo: '' }))
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!validatePhone(phone))                    e.phone     = 'Enter a valid Pakistani mobile number (03XX-XXXXXXX)'
    if (!routeId)                                 e.routeId   = 'Please select a route'
    if (!travelDate)                              e.travelDate = 'Please select a travel date'
    if (!departureTime)                           e.departureTime = 'Please enter departure time'
    if (!category)                                e.category  = 'Please select a complaint category'
    if (category === 'DRIVER'  && !driverSubcategory)
                                                  e.driverSubcategory  = 'Please select what the driver did'
    if (category === 'STEWARD' && !stewardSubcategory)
                                                  e.stewardSubcategory = 'Please select what the steward did'
    if (category === 'BUS_CONDITION' && !busConditionSubcategory)
                                                  e.busConditionSubcategory = 'Please select what went wrong'
    if (category === 'DELAY_TIMING' && !delaySubcategory)
                                                  e.delaySubcategory = 'Please select the type of delay'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      // Upload photo if present
      let photoUrl: string | null = null
      if (photo) {
        const compressed = await compressImage(photo)
        const filename   = `staff/${Date.now()}-${compressed.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('complaint-photos')
          .upload(filename, compressed, { upsert: false })
        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('complaint-photos').getPublicUrl(uploadData.path)
        photoUrl = publicUrl
      }

      // Determine maintenance flag
      const busSubEntry = BUS_SUBCATEGORIES.find(s => s.value === busConditionSubcategory)
      const isMaintenanceRequired = category === 'BUS_CONDITION' && (busSubEntry?.isMaintenanceRequired ?? false)

      // Convert local datetime to UTC ISO string
      const originalTs = originalTimestamp ? new Date(originalTimestamp).toISOString() : null

      // Insert complaint
      const { data: newComplaint, error: insertError } = await supabase
        .from('complaints')
        .insert({
          source:                    source,
          logged_by_user_id:         currentUserId,
          passenger_name:            passengerName.trim() || null,
          passenger_phone:           phoneToE164(phone),
          route_id:                  routeId,
          travel_date:               travelDate,
          departure_time:            departureTime,
          bus_number:                busNumber.trim() || null,
          category:                  category,
          description:               description.trim() || null,
          photo_url:                 photoUrl,
          severity:                  effectiveSeverity,
          severity_auto_assigned:    severityOverride === null,
          status:                    'OPEN',
          is_about_steward_head:     isAboutStewardHead,
          bus_condition_subcategory: category === 'BUS_CONDITION' ? busConditionSubcategory || null : null,
          is_maintenance_required:   isMaintenanceRequired,
          delay_subcategory:         category === 'DELAY_TIMING'  ? delaySubcategory   || null : null,
          driver_subcategory:        category === 'DRIVER'        ? driverSubcategory  || null : null,
          steward_subcategory:       category === 'STEWARD'       ? stewardSubcategory || null : null,
          driver_name:               category === 'DRIVER'        ? driverName.trim()  || null : null,
          steward_name:              category === 'STEWARD'       ? stewardName.trim() || null : null,
          original_timestamp:        originalTs,
        })
        .select('id, reference_number')
        .single()

      if (insertError || !newComplaint) throw new Error(insertError?.message ?? 'Insert failed')

      // Log CREATED history entry
      await supabase.from('complaint_history').insert({
        complaint_id:         newComplaint.id,
        action_type:          'CREATED',
        new_value:            'OPEN',
        notes:                `Logged by staff via intake form (${SOURCES.find(s => s.value === source)?.label})${
          category === 'DRIVER'  && driverSubcategory  ? ` — Driver: ${driverSubcategory}`  :
          category === 'STEWARD' && stewardSubcategory ? ` — Steward: ${stewardSubcategory}` : ''
        }`,
        performed_by_user_id: currentUserId,
      })

      // Navigate to the detail view
      router.push(`/staff/complaint/${newComplaint.id}`)

    } catch (err) {
      console.error(err)
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ─── Category selection ───────────────────────────────────────────────────
  function selectCategory(val: string) {
    setCategory(val)
    if (val !== 'BUS_CONDITION') setBusConditionSubcategory('')
    if (val !== 'DELAY_TIMING')  setDelaySubcategory('')
    if (val !== 'DRIVER')  { setDriverSubcategory(''); setDriverName('') }
    if (val !== 'STEWARD') { setStewardSubcategory(''); setStewardName(''); setIsAboutStewardHead(false) }
    setSeverityOverride(null)
    setErrors(prev => ({ ...prev, category: '', busConditionSubcategory: '', delaySubcategory: '', driverSubcategory: '', stewardSubcategory: '' }))
    if (val === 'STEWARD' && description && containsStewardHeadKw(description)) {
      setIsAboutStewardHead(true)
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────

  const fieldClass = (err?: string) => cn(
    'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary',
    err ? 'border-red-300' : 'border-gray-300',
  )

  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5'
  const errorClass = 'text-xs text-red-500 mt-1'
  const sectionClass = 'bg-white rounded-2xl border border-gray-200 p-4 space-y-4'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/staff/dashboard')}
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-gray-900">Log a Complaint</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">

          {/* ── Staff Details ── */}
          <div className={sectionClass}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Staff Details</p>

            {/* Logged by */}
            <div>
              <label className={labelClass}>Logged by</label>
              <div className="h-12 px-4 flex items-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                {currentUserName}
              </div>
            </div>

            {/* Source */}
            <div>
              <label className={labelClass}>Source of complaint</label>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSource(s.value)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                      source === s.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Original timestamp */}
            <div>
              <label className={labelClass}>When did the passenger contact us?</label>
              <input
                type="datetime-local"
                value={originalTimestamp}
                max={getNowDateTimeLocal()}
                onChange={e => setOriginalTimestamp(e.target.value)}
                className={fieldClass()}
              />
              <p className="text-xs text-gray-400 mt-1">
                Change this if you&apos;re logging a complaint that came in earlier
              </p>
            </div>
          </div>

          {/* ── Passenger Details ── */}
          <div className={sectionClass}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passenger Details</p>

            {/* Phone */}
            <div>
              <label className={labelClass}>Mobile number *</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => { setPhone(formatPhoneDisplay(e.target.value)); setErrors(p => ({ ...p, phone: '' })) }}
                placeholder="03XX-XXXXXXX"
                className={fieldClass(errors.phone)}
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            {/* Name */}
            <div>
              <label className={labelClass}>Passenger name <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="text"
                value={passengerName}
                onChange={e => setPassengerName(e.target.value)}
                placeholder="Full name"
                className={fieldClass()}
              />
            </div>
          </div>

          {/* ── Journey Details ── */}
          <div className={sectionClass}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Journey Details</p>

            {/* Route */}
            <div>
              <label className={labelClass}>Route *</label>
              <select
                value={routeId}
                onChange={e => { setRouteId(e.target.value); setErrors(p => ({ ...p, routeId: '' })) }}
                className={fieldClass(errors.routeId)}
              >
                <option value="">Select route…</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.routeId && <p className={errorClass}>{errors.routeId}</p>}
            </div>

            {/* Travel date */}
            <div>
              <label className={labelClass}>Travel date *</label>
              <input
                type="date"
                value={travelDate}
                min={getMinDateStr()}
                max={getTodayStr()}
                onChange={e => { setTravelDate(e.target.value); setErrors(p => ({ ...p, travelDate: '' })) }}
                className={fieldClass(errors.travelDate)}
              />
              {errors.travelDate && <p className={errorClass}>{errors.travelDate}</p>}
            </div>

            {/* Departure time */}
            <div>
              <label className={labelClass}>Departure time *</label>
              <input
                type="time"
                value={departureTime}
                onChange={e => { setDepartureTime(e.target.value); setErrors(p => ({ ...p, departureTime: '' })) }}
                className={fieldClass(errors.departureTime)}
              />
              {errors.departureTime && <p className={errorClass}>{errors.departureTime}</p>}
            </div>

            {/* Bus number */}
            <div>
              <label className={labelClass}>Bus number <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="text"
                value={busNumber}
                onChange={e => setBusNumber(e.target.value)}
                placeholder="e.g. 47, or write 'unknown'"
                className={fieldClass()}
              />
              <p className="text-xs text-gray-400 mt-1">Printed on ticket or inside the bus</p>
            </div>
          </div>

          {/* ── Complaint Category ── */}
          <div className={sectionClass}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complaint Category *</p>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat, i) => {
                const Icon         = cat.icon!
                const selected     = category === cat.value
                const isSuggestion = cat.variant === 'suggestion'
                const isLastOdd    = !isSuggestion && i === NON_SUGGESTION_COUNT - 1 && NON_SUGGESTION_COUNT % 2 !== 0
                const isWide       = isSuggestion || isLastOdd
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => selectCategory(cat.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition-colors min-h-[64px]',
                      isWide && 'col-span-2',
                      isSuggestion && selected
                        ? 'bg-teal-600 text-white border-teal-600'
                        : isSuggestion
                        ? 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
                        : selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <Icon size={22} />
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {errors.category && <p className={errorClass}>{errors.category}</p>}

            {/* Bus condition subcategory */}
            {category === 'BUS_CONDITION' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What specifically went wrong? *</p>
                <div className="grid grid-cols-2 gap-2">
                  {BUS_SUBCATEGORIES.map(sub => {
                    const sel = busConditionSubcategory === sub.value
                    return (
                      <button
                        key={sub.value}
                        type="button"
                        onClick={() => {
                          setBusConditionSubcategory(sub.value)
                          setSeverityOverride(null)
                          setErrors(p => ({ ...p, busConditionSubcategory: '' }))
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-colors',
                          sel
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-lg">{sub.emoji}</span>
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
                {errors.busConditionSubcategory && <p className={errorClass}>{errors.busConditionSubcategory}</p>}
              </div>
            )}

            {/* Delay subcategory */}
            {category === 'DELAY_TIMING' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Type of delay *</p>
                <div className="grid grid-cols-2 gap-2">
                  {DELAY_SUBCATEGORIES.map((sub, i) => {
                    const sel     = delaySubcategory === sub.value
                    const lastOdd = i === DELAY_SUBCATEGORIES.length - 1 && DELAY_SUBCATEGORIES.length % 2 !== 0
                    return (
                      <button
                        key={sub.value}
                        type="button"
                        onClick={() => { setDelaySubcategory(sub.value); setErrors(p => ({ ...p, delaySubcategory: '' })) }}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-colors',
                          lastOdd && 'col-span-2',
                          sel
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-lg">{sub.emoji}</span>
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
                {errors.delaySubcategory && <p className={errorClass}>{errors.delaySubcategory}</p>}
              </div>
            )}

            {/* Driver subcategory */}
            {category === 'DRIVER' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What did the driver do? *</p>
                <div className="grid grid-cols-2 gap-2">
                  {DRIVER_SUBCATEGORIES.map((sub, i) => {
                    const sel     = driverSubcategory === sub.value
                    const lastOdd = i === DRIVER_SUBCATEGORIES.length - 1 && DRIVER_SUBCATEGORIES.length % 2 !== 0
                    return (
                      <button
                        key={sub.value}
                        type="button"
                        onClick={() => { setDriverSubcategory(sub.value); setErrors(p => ({ ...p, driverSubcategory: '' })) }}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-colors',
                          lastOdd && 'col-span-2',
                          sel
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-lg">{sub.emoji}</span>
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
                {errors.driverSubcategory && <p className={errorClass}>{errors.driverSubcategory}</p>}
                <div>
                  <label className={labelClass}>Driver name <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="Agar yaad ho — ticket ya bus ke andar likha hota hai"
                    className={fieldClass()}
                  />
                </div>
              </div>
            )}

            {/* Steward subcategory + steward head flag */}
            {category === 'STEWARD' && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What did the steward do? *</p>
                <div className="grid grid-cols-2 gap-2">
                  {STEWARD_SUBCATEGORIES.map((sub, i) => {
                    const sel     = stewardSubcategory === sub.value
                    const lastOdd = i === STEWARD_SUBCATEGORIES.length - 1 && STEWARD_SUBCATEGORIES.length % 2 !== 0
                    return (
                      <button
                        key={sub.value}
                        type="button"
                        onClick={() => { setStewardSubcategory(sub.value); setErrors(p => ({ ...p, stewardSubcategory: '' })) }}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-colors',
                          lastOdd && 'col-span-2',
                          sel
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                        )}
                      >
                        <span className="text-lg">{sub.emoji}</span>
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
                {errors.stewardSubcategory && <p className={errorClass}>{errors.stewardSubcategory}</p>}
                <div>
                  <label className={labelClass}>Steward name <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    type="text"
                    value={stewardName}
                    onChange={e => setStewardName(e.target.value)}
                    placeholder="Agar yaad ho — ticket ya bus ke andar likha hota hai"
                    className={fieldClass()}
                  />
                </div>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAboutStewardHead}
                    onChange={e => setIsAboutStewardHead(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                  />
                  <span className="text-sm text-amber-800 font-medium leading-snug">
                    This complaint is about the Steward Head (routes to admin only, hidden from Steward Head)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* ── Description & Photo ── */}
          <div className={sectionClass}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Details</p>

            {/* Description */}
            <div>
              <label className={labelClass}>Description <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea
                value={description}
                onChange={e => {
                  const val = e.target.value.slice(0, 500)
                  setDescription(val)
                  if (category === 'STEWARD' && containsStewardHeadKw(val)) {
                    setIsAboutStewardHead(true)
                  }
                }}
                placeholder="What happened? Any other details…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
            </div>

            {/* Photo */}
            <div>
              <label className={labelClass}>Photo <span className="font-normal text-gray-400">(optional, max 5 MB)</span></label>

              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full p-1 shadow-sm"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload size={22} />
                  <span className="text-xs font-medium">Tap to upload photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {errors.photo && <p className={errorClass}>{errors.photo}</p>}
            </div>
          </div>

          {/* ── Severity ── */}
          {category && (
            <div className={sectionClass}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Severity</p>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Auto-assigned:</span>
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', SEVERITY_COLORS[autoSeverity])}>
                    {autoSeverity}
                  </span>
                </div>
                {severityOverride && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Overridden to:</span>
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', SEVERITY_COLORS[severityOverride])}>
                      {severityOverride}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Override severity <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select
                  value={severityOverride ?? ''}
                  onChange={e => setSeverityOverride(e.target.value ? e.target.value as Severity : null)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Use auto-assigned ({autoSeverity})</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? 'Logging complaint…' : 'Log Complaint'}
          </button>

        </div>
      </form>
    </div>
  )
}
