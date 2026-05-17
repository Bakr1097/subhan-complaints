'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Bus, Utensils, Clock, Ticket, AlertTriangle, Lightbulb,
  Upload, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

type Route = { id: string; name: string }

interface Props {
  routes: Route[]
}

type DelaySubcategoryEntry = {
  value: string
  label: string
  emoji: string
}

type CategoryEntry = {
  value: string
  label: string
  icon: LucideIcon
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  variant?: 'suggestion'
}

type SubcategoryEntry = {
  value: string
  label: string
  emoji: string
  severity: 'HIGH' | 'MEDIUM'
  isMaintenanceRequired: boolean
}

type ConfirmationData = {
  referenceNumber: string
  routeName: string
  travelDate: string
  busNumber: string
}

// ── Constants ────────────────────────────────────────────────

const CATEGORIES: CategoryEntry[] = [
  { value: 'DRIVER_STEWARD',      label: 'Driver / Steward',    icon: User,          severity: 'MEDIUM' },
  { value: 'BUS_CONDITION',       label: 'Bus Condition',        icon: Bus,            severity: 'HIGH'   },
  { value: 'FOOD_DRINKS',         label: 'Food / Drinks',        icon: Utensils,       severity: 'HIGH'   },
  { value: 'DELAY_TIMING',        label: 'Delay / Timing',       icon: Clock,          severity: 'MEDIUM' },
  { value: 'TICKET_REFUND',       label: 'Ticket / Refund',      icon: Ticket,         severity: 'MEDIUM' },
  { value: 'OTHER_SERIOUS',       label: 'Other / Serious',      icon: AlertTriangle,  severity: 'HIGH'   },
  { value: 'SUGGESTION_FEEDBACK', label: 'Suggestion / Feedback', icon: Lightbulb,     severity: 'LOW', variant: 'suggestion' },
]

const BUS_CONDITION_SUBCATEGORIES: SubcategoryEntry[] = [
  { value: 'AC_HEATING',           label: 'AC / Heating',         emoji: '❄️', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'ENTERTAINMENT_TABLET', label: 'Entertainment Tablet', emoji: '📱', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'SEAT',                 label: 'Seat',                 emoji: '🪑', severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'CLEANLINESS',          label: 'Cleanliness',          emoji: '🧹', severity: 'HIGH',   isMaintenanceRequired: false },
]

const DELAY_SUBCATEGORIES: DelaySubcategoryEntry[] = [
  { value: 'LATE_DEPARTURE',  label: 'Late Departure',              emoji: '⏰' },
  { value: 'LATE_ARRIVAL',    label: 'Late Arrival',                emoji: '🛣️' },
  { value: 'EXCESSIVE_STOPS', label: 'Excessive Stops / Slow Journey', emoji: '🚏' },
]

const STEWARD_HEAD_KEYWORDS = ['steward head', 'main steward', 'supervisor', 'bara steward']

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

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getMinDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function containsStewardHeadKeyword(text: string): boolean {
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
          else { width = Math.round((width / height) * MAX); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => resolve(
            blob
              ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
              : file
          ),
          'image/jpeg',
          0.85
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ── Component ────────────────────────────────────────────────

export default function ComplaintForm({ routes }: Props) {
  const searchParams = useSearchParams()

  // QR pre-fill
  const qrBus   = searchParams.get('bus')   ?? ''
  const qrRoute = searchParams.get('route') ?? ''
  const qrTime  = searchParams.get('time')  ?? ''

  function matchRouteId(param: string): string {
    if (!param) return ''
    const byId = routes.find(r => r.id === param)
    if (byId) return byId.id
    const norm = param.toLowerCase().replace(/[^a-z]/g, '')
    const byName = routes.find(r => r.name.toLowerCase().replace(/[^a-z]/g, '').includes(norm))
    return byName?.id ?? ''
  }

  const initialRouteId = matchRouteId(qrRoute)

  // ── Form state ───────────────────────────────────────────

  const [phone,                   setPhone]                   = useState('')
  const [routeId,                 setRouteId]                 = useState(initialRouteId)
  const [travelDate,              setTravelDate]              = useState('')
  const [departureTime,           setDepartureTime]           = useState(qrTime)
  const [busNumber,               setBusNumber]               = useState(qrBus)
  const [category,                setCategory]                = useState('')
  const [busConditionSubcategory, setBusConditionSubcategory] = useState('')
  const [delaySubcategory,        setDelaySubcategory]        = useState('')
  const [passengerName,           setPassengerName]           = useState('')
  const [description,             setDescription]             = useState('')
  const [isAboutStewardHead,      setIsAboutStewardHead]      = useState(false)
  const [photo,                   setPhoto]                   = useState<File | null>(null)
  const [photoPreview,            setPhotoPreview]            = useState<string | null>(null)

  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [submitting,   setSubmitting]   = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Handlers ─────────────────────────────────────────────

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneDisplay(e.target.value))
    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
  }

  function handleRouteChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRouteId(e.target.value)
    if (errors.routeId) setErrors(prev => ({ ...prev, routeId: '' }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Photo must be under 5MB' }))
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

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!validatePhone(phone))
      e.phone = 'Enter a valid Pakistani number (03XX-XXXXXXX)'
    if (!routeId)
      e.routeId = 'Please select a route'
    if (!travelDate)
      e.travelDate = 'Please select the date of travel'
    if (!departureTime)
      e.departureTime = 'Please select the departure time'
    if (!category)
      e.category = 'Please select a complaint category'
    if (category === 'BUS_CONDITION' && !busConditionSubcategory)
      e.busConditionSubcategory = 'Please select what specifically went wrong'
    if (category === 'DELAY_TIMING' && !delaySubcategory)
      e.delaySubcategory = 'Please select the type of delay'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const supabase = createClient()

    // Upload photo
    let photoUrl: string | null = null
    if (photo) {
      try {
        const compressed = await compressImage(photo)
        const fileName   = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('complaint-photos')
          .upload(fileName, compressed, { contentType: 'image/jpeg' })
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('complaint-photos')
            .getPublicUrl(uploadData.path)
          photoUrl = publicUrl
        }
      } catch {
        // Continue without photo
      }
    }

    const cat             = CATEGORIES.find(c => c.value === category)!
    const flagStewardHead = isAboutStewardHead || containsStewardHeadKeyword(description)

    // BUS_CONDITION: severity + maintenance flag come from subcategory
    let finalSeverity: 'HIGH' | 'MEDIUM' | 'LOW' = cat.severity
    let isMaintenanceRequired = false
    if (category === 'BUS_CONDITION' && busConditionSubcategory) {
      const sub = BUS_CONDITION_SUBCATEGORIES.find(s => s.value === busConditionSubcategory)!
      finalSeverity = sub.severity
      isMaintenanceRequired = sub.isMaintenanceRequired
    }

    const { data, error } = await supabase.rpc('submit_complaint', {
      p_passenger_phone:           phoneToE164(phone),
      p_route_id:                  routeId,
      p_travel_date:               travelDate,
      p_departure_time:            departureTime.trim(),
      p_category:                  category,
      p_severity:                  finalSeverity,
      p_passenger_name:            passengerName.trim() || null,
      p_bus_number:                busNumber.trim() || null,
      p_description:               description.trim() || null,
      p_photo_url:                 photoUrl,
      p_is_about_steward_head:     flagStewardHead,
      p_bus_condition_subcategory: category === 'BUS_CONDITION' ? busConditionSubcategory || null : null,
      p_is_maintenance_required:   isMaintenanceRequired,
      p_delay_subcategory:         category === 'DELAY_TIMING' ? delaySubcategory || null : null,
    })

    // RETURNS TABLE gives back an array; take the first (and only) row
    const complaint = Array.isArray(data) ? data[0] : data

    if (error || !complaint) {
      console.error('submit_complaint error:', error)
      setErrors({ submit: 'Something went wrong. Please try again.' })
      setSubmitting(false)
      return
    }

    setConfirmation({
      referenceNumber: complaint.reference_number,
      routeName:       routes.find(r => r.id === routeId)?.name ?? '',
      travelDate,
      busNumber:       busNumber.trim() || 'Not provided',
    })
    setSubmitting(false)
  }

  // ── Confirmation screen ──────────────────────────────────

  if (confirmation) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <CheckCircle2 size={56} className="text-green-500 mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Complaint Received</h1>
            <p className="text-sm text-gray-500 mt-1">
              Aap ki complaint hamare paas pahunch gayi hai
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 text-center mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-3xl font-bold text-green-700 tracking-wider font-mono">
              {confirmation.referenceNumber}
            </p>
          </div>

          <div className="space-y-0 text-sm mb-5 border rounded-xl overflow-hidden divide-y">
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Route</span>
              <span className="font-medium">{confirmation.routeName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Travel Date</span>
              <span className="font-medium">
                {new Date(confirmation.travelDate + 'T00:00:00').toLocaleDateString('en-PK', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Bus Number</span>
              <span className="font-medium">{confirmation.busNumber}</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-4">
            <p className="font-semibold mb-1">We have received your complaint.</p>
            <p>Our team will contact you within 24 hours.</p>
          </div>

          <p className="text-center text-xs text-gray-400 mb-5">
            Please screenshot this page for your records
          </p>

          <a
            href={`/status/${confirmation.referenceNumber}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            <ExternalLink size={16} />
            Track complaint status
          </a>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trust banner */}
      <div className="bg-primary text-primary-foreground text-center py-3 px-4 text-sm font-medium">
        Your complaint goes directly to management
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Submit a Complaint</h1>
        <p className="text-sm text-gray-500 mb-6">Subhan Complaints — شکایت درج کریں</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="03XX-XXXXXXX"
              className={cn(
                'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary',
                errors.phone ? 'border-red-400' : 'border-gray-300'
              )}
            />
            <p className="text-xs text-gray-400 mt-1">Apna mobile number likhein</p>
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Route <span className="text-red-500">*</span>
            </label>
            <select
              value={routeId}
              onChange={handleRouteChange}
              className={cn(
                'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary appearance-none',
                errors.routeId ? 'border-red-400' : 'border-gray-300'
              )}
            >
              <option value="">Select route...</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Apna safar ka rasta chunein</p>
            {errors.routeId && <p className="text-xs text-red-500 mt-1">{errors.routeId}</p>}
          </div>

          {/* Travel Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date of Travel <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={travelDate}
              min={getMinDateStr()}
              max={getTodayStr()}
              onChange={e => {
                setTravelDate(e.target.value)
                if (errors.travelDate) setErrors(prev => ({ ...prev, travelDate: '' }))
              }}
              className={cn(
                'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary',
                errors.travelDate ? 'border-red-400' : 'border-gray-300'
              )}
            />
            <p className="text-xs text-gray-400 mt-1">Jis din safar kiya</p>
            {errors.travelDate && <p className="text-xs text-red-500 mt-1">{errors.travelDate}</p>}
          </div>

          {/* Departure Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Departure Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={e => {
                setDepartureTime(e.target.value)
                if (errors.departureTime) setErrors(prev => ({ ...prev, departureTime: '' }))
              }}
              className={cn(
                'w-full h-12 px-4 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary',
                errors.departureTime ? 'border-red-400' : 'border-gray-300'
              )}
            />
            <p className="text-xs text-gray-400 mt-1">Tap to select — stored as 24-hour, shown as 12-hour on your phone</p>
            {errors.departureTime && <p className="text-xs text-red-500 mt-1">{errors.departureTime}</p>}
          </div>

          {/* Bus Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Bus Number
            </label>
            <input
              type="text"
              value={busNumber}
              onChange={e => setBusNumber(e.target.value)}
              placeholder="e.g. 47"
              className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ticket ya bus ke andar likha number. Agar maloom nahi, "unknown" likhein
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Complaint Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(cat => {
                const Icon        = cat.icon
                const selected    = category === cat.value
                const isSuggestion = cat.variant === 'suggestion'
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategory(cat.value)
                      if (cat.value !== 'BUS_CONDITION') setBusConditionSubcategory('')
                      if (cat.value !== 'DELAY_TIMING')  setDelaySubcategory('')
                      if (errors.category) setErrors(prev => ({ ...prev, category: '' }))
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 font-medium text-sm transition-colors',
                      isSuggestion && 'col-span-2 flex-row gap-3 py-3',
                      isSuggestion && selected
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : isSuggestion
                        ? 'border-teal-200 bg-teal-50 text-teal-700 active:bg-teal-100'
                        : selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
                    )}
                  >
                    <Icon size={isSuggestion ? 22 : 28} />
                    <span className="text-center leading-tight">{cat.label}</span>
                  </button>
                )
              })}
            </div>
            {errors.category && <p className="text-xs text-red-500 mt-2">{errors.category}</p>}
          </div>

          {/* Bus Condition subcategory — required when BUS_CONDITION selected */}
          {category === 'BUS_CONDITION' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What specifically? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BUS_CONDITION_SUBCATEGORIES.map(sub => {
                  const selected = busConditionSubcategory === sub.value
                  return (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => {
                        setBusConditionSubcategory(sub.value)
                        if (errors.busConditionSubcategory)
                          setErrors(prev => ({ ...prev, busConditionSubcategory: '' }))
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 font-medium text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
                      )}
                    >
                      <span className="text-2xl leading-none">{sub.emoji}</span>
                      <span className="text-center leading-tight">{sub.label}</span>
                    </button>
                  )
                })}
              </div>
              {errors.busConditionSubcategory && (
                <p className="text-xs text-red-500 mt-2">{errors.busConditionSubcategory}</p>
              )}
            </div>
          )}

          {/* Delay subcategory — required when DELAY_TIMING selected */}
          {category === 'DELAY_TIMING' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What type of delay? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {DELAY_SUBCATEGORIES.map((sub, i) => {
                  const selected   = delaySubcategory === sub.value
                  const isLastOdd  = i === DELAY_SUBCATEGORIES.length - 1 && DELAY_SUBCATEGORIES.length % 2 !== 0
                  return (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => {
                        setDelaySubcategory(sub.value)
                        if (errors.delaySubcategory)
                          setErrors(prev => ({ ...prev, delaySubcategory: '' }))
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 font-medium text-sm transition-colors',
                        isLastOdd && 'col-span-2 flex-row gap-3 py-3',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-200 bg-white text-gray-700 active:bg-gray-50'
                      )}
                    >
                      <span className="text-2xl leading-none">{sub.emoji}</span>
                      <span className="text-center leading-tight">{sub.label}</span>
                    </button>
                  )
                })}
              </div>
              {errors.delaySubcategory && (
                <p className="text-xs text-red-500 mt-2">{errors.delaySubcategory}</p>
              )}
            </div>
          )}

          {/* Steward head flag — only shown for DRIVER_STEWARD */}
          {category === 'DRIVER_STEWARD' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <input
                id="steward-head-flag"
                type="checkbox"
                checked={isAboutStewardHead}
                onChange={e => setIsAboutStewardHead(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-primary"
              />
              <label htmlFor="steward-head-flag" className="text-sm text-amber-900">
                <span className="font-semibold block">This complaint is about the steward head</span>
                <span className="text-xs text-amber-700">Kya yeh complaint bara steward ke baray mein hai?</span>
              </label>
            </div>
          )}

          {/* Passenger Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Your Name{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={passengerName}
              onChange={e => setPassengerName(e.target.value)}
              placeholder="Full name"
              className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              placeholder="What happened? Brief detail..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">Kya hua? Mukhtasar bataein</p>
              <p className="text-xs text-gray-400">{description.length}/500</p>
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Photo{' '}
              <span className="text-gray-400 font-normal">(optional, max 5MB)</span>
            </label>
            {photoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold leading-none"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-1 text-gray-400 active:bg-gray-50"
              >
                <Upload size={24} />
                <span className="text-sm">Tap to upload photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {errors.photo && <p className="text-xs text-red-500 mt-1">{errors.photo}</p>}
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>

        </form>
      </div>
    </div>
  )
}
