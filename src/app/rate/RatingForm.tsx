'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Frown, Meh, Smile, Laugh,
  Sparkles, UserCheck, Clock, Armchair, UtensilsCrossed, Wind,
  Shield, ChevronRight, Hash, AlertTriangle, Star,
  Bus, Check, Share2, Route,
  Lock, RotateCcw, LogOut, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────
type RouteOption = { id: string; name: string }
type Screen = 'form' | 'thanks-pos' | 'thanks-neg'

// ── City code mapping ──────────────────────────────────────────
// Add new cities here when new routes are added
const CITY_CODES: Record<string, string> = {
  Faisalabad: 'FSD',
  Lahore:     'LHR',
  Karachi:    'KHI',
  Islamabad:  'ISB',
  Multan:     'MUL',
  Peshawar:   'PEW',
}

// ── Constants ──────────────────────────────────────────────────
const SMILEYS = [
  { value: 1, label: 'Bad',       urdu: 'Bura',      Icon: Frown },
  { value: 2, label: 'Okay',      urdu: 'Theek',     Icon: Meh   },
  { value: 3, label: 'Good',      urdu: 'Acha',      Icon: Smile },
  { value: 4, label: 'Great',     urdu: 'Behtareen', Icon: Laugh },
] as const

const POSITIVE_TAGS = [
  { value: 'CLEAN',   label: 'Clean bus',        Icon: Sparkles        },
  { value: 'STAFF',   label: 'Friendly staff',   Icon: UserCheck       },
  { value: 'ON_TIME', label: 'On time',          Icon: Clock           },
  { value: 'SEAT',    label: 'Comfortable seat', Icon: Armchair        },
  { value: 'FOOD',    label: 'Good food',        Icon: UtensilsCrossed },
  { value: 'DRIVING', label: 'Smooth driving',   Icon: Wind            },
]

// ── Helpers ────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDateLabel(s: string) {
  if (!s) return '—'
  return new Date(s + 'T00:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }).toUpperCase()
}

function parseRouteName(name: string) {
  const sep = name.match(/\s*[-–→]\s*/)
  if (!sep) return { from: name, to: '', fromCode: CITY_CODES[name] ?? name.slice(0, 3).toUpperCase(), toCode: '---' }
  const parts = name.split(sep[0])
  const from  = (parts[0] ?? '').trim()
  const to    = (parts[1] ?? '').trim()
  const code  = (s: string) => CITY_CODES[s] ?? (s.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '???')
  return { from, to, fromCode: code(from), toCode: code(to) }
}

function reactionBg(rating: number): string {
  if (rating === 4) return '#0F5D4E'
  if (rating === 3) return '#3E8E73'
  if (rating === 2) return '#B47339'
  if (rating === 1) return '#B43D2E'
  return '#D4CCB8'
}

function reactionFg(rating: number): string {
  if (rating === 4) return '#F7F3E9'
  if (rating === 3) return '#F4FBF8'
  if (rating === 2) return '#FFF6EB'
  if (rating === 1) return '#FFF1EC'
  return '#9AA59C'
}

// ── Shared sub-components ──────────────────────────────────────

function BrandMark() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-[46px] h-[46px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
        style={{ boxShadow: '0 6px 18px rgba(15,93,78,0.28), inset 0 1px 0 rgba(255,255,255,0.18)' }}
      >
        <Bus size={23} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-bold tracking-[0.06em] uppercase leading-none">SUBHAN TRAVELS</div>
        <div className="text-[11px] text-muted-foreground tracking-[0.02em] mt-1">Passenger ratings · Faisalabad</div>
      </div>
      <div className="flex flex-col items-center pl-3 border-l border-dashed border-[#C9C0A8] text-muted-foreground">
        <span className="font-mono-brand text-[8.5px] font-semibold tracking-[0.18em] leading-none">EST</span>
        <span className="font-mono-brand text-[11px] font-semibold tracking-[0.06em] text-foreground mt-0.5">2014</span>
      </div>
    </div>
  )
}

function SectionHeader({
  title, caption, optional,
}: {
  title: string; caption: string; optional?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-dashed border-[#C9C0A8] pb-2 mb-4">
      <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.005em]">{title}</h2>
      <span className="text-[11.5px] italic text-[#9AA59C] flex-1">{caption}</span>
      {optional && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground bg-muted px-2 py-0.5 rounded-full leading-none shrink-0">
          Optional
        </span>
      )}
    </div>
  )
}

function FieldLabel({
  children, required, optional,
}: {
  children: React.ReactNode; required?: boolean; optional?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5 mb-2">
      <label className="text-[13px] font-semibold tracking-[-0.005em]">{children}</label>
      {required && <span className="text-destructive text-[11px] font-semibold leading-none">*</span>}
      {optional && (
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-[#9AA59C] leading-none">optional</span>
      )}
    </div>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] text-[#9AA59C] mt-1.5 tracking-[0.01em]">{children}</p>
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p
      className="text-[11.5px] font-medium text-destructive mt-1.5"
      style={{ animation: 'errorFadeIn 220ms ease-out' }}
    >
      {msg}
    </p>
  )
}

// ── Smiley selector ────────────────────────────────────────────

function SmileySelector({
  rating, onChange, shake, error,
}: {
  rating: number
  onChange: (v: number) => void
  shake: boolean
  error?: string
}) {
  return (
    <div className="px-5 py-2" data-smiley-row>
      <div
        className="grid grid-cols-4 gap-2"
        style={{ animation: shake ? 'shakeNudge 380ms cubic-bezier(.36,.07,.19,.97) both' : undefined }}
      >
        {SMILEYS.map((s) => {
          const selected = rating === s.value
          const dimmed   = rating > 0 && !selected
          const bg       = reactionBg(s.value)
          const fg       = reactionFg(s.value)

          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(s.value)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-[18px] border transition-all duration-150 cursor-pointer"
              style={{
                minHeight: 116,
                padding: '14px 6px',
                background: selected ? bg : 'white',
                borderColor: selected ? 'transparent' : 'hsl(var(--border))',
                color: selected ? fg : 'hsl(var(--foreground))',
                opacity: dimmed ? 0.55 : 1,
                transform: selected ? 'scale(1.04)' : 'scale(1)',
                boxShadow: selected ? `0 10px 24px ${bg}55, inset 0 1px 0 rgba(255,255,255,0.18)` : 'none',
                transition: 'transform 180ms cubic-bezier(.34,1.56,.64,1), opacity 150ms, background 150ms',
              }}
            >
              <span
                key={`icon-${selected ? 'on' : 'off'}-${s.value}`}
                className="inline-flex items-center justify-center"
                style={{
                  color: selected ? fg : '#9AA59C',
                  animation: selected ? 'smileyPop 360ms cubic-bezier(.34,1.56,.64,1)' : undefined,
                }}
              >
                <s.Icon size={50} strokeWidth={1.6} />
              </span>
              <span
                className="text-[12.5px] font-semibold leading-none tracking-[-0.005em]"
                style={{ color: selected ? fg : 'hsl(var(--foreground))' }}
              >
                {s.label}
              </span>
              <span
                className="text-[10px] font-medium italic leading-none"
                style={{ color: selected ? `${fg}cc` : '#9AA59C' }}
              >
                {s.urdu}
              </span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p
          className="text-center mt-3.5 text-[12.5px] font-medium text-destructive"
          style={{ animation: 'errorFadeIn 220ms ease-out' }}
        >
          {error}
        </p>
      ) : !rating ? (
        <p className="text-center mt-3.5 text-[12.5px] italic text-[#9AA59C]">Tap a face to start</p>
      ) : null}
    </div>
  )
}

// ── Route select ───────────────────────────────────────────────

function RouteSelect({
  routes, value, onChange, error,
}: {
  routes: RouteOption[]
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = routes.find(r => r.id === value)
  const parsed   = selected ? parseRouteName(selected.name) : null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-[52px] px-4 rounded-lg border bg-card flex items-center gap-3 cursor-pointer text-left transition-all duration-150"
        style={{
          borderColor: error ? 'hsl(var(--destructive))' : open ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          boxShadow: error
            ? '0 0 0 4px hsl(var(--destructive) / 0.12)'
            : open ? '0 0 0 4px hsl(var(--primary) / 0.10)' : 'none',
        }}
      >
        <Route size={18} className="text-muted-foreground shrink-0" />
        <span className={cn('flex-1 min-w-0 text-[15px] truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.name ?? 'Select your route'}
        </span>
        {parsed && (
          <span className="font-mono-brand text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded tracking-[0.04em] shrink-0">
            {parsed.fromCode}→{parsed.toCode}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-card border border-border rounded-lg overflow-hidden z-10 shadow-xl">
          {routes.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onChange(r.id); setOpen(false) }}
              className={cn(
                'w-full text-left px-4 py-3 flex items-center gap-2.5 text-[14px] cursor-pointer hover:bg-muted transition-colors',
                i > 0 && 'border-t border-border',
                value === r.id && 'bg-muted font-medium',
              )}
            >
              <span className="flex-1 text-foreground">{r.name}</span>
              {(() => { const p = parseRouteName(r.name); return <span className="font-mono-brand text-[11px] text-muted-foreground">{p.fromCode}→{p.toCode}</span> })()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Trip details ───────────────────────────────────────────────

function CollapsedTripRow({
  route, travelDate, busNumber, busUnknown, onExpand,
}: {
  route?: RouteOption; travelDate: string; busNumber: string; busUnknown: boolean; onExpand: () => void
}) {
  return (
    <div className="px-5 pt-3.5 pb-1">
      <button
        type="button"
        onClick={onExpand}
        className="w-full h-14 px-4 rounded-lg border border-border bg-card flex items-center gap-3 cursor-pointer text-left"
      >
        <Bus size={20} className="text-primary shrink-0" />
        <span className="flex-1 min-w-0 flex items-center gap-2 text-[13.5px] text-foreground">
          <span className="font-medium truncate">{route?.name ?? '—'}</span>
          <span className="text-[#9AA59C]">·</span>
          <span className="font-mono-brand text-[12px] shrink-0">{formatDateLabel(travelDate)}</span>
          <span className="text-[#9AA59C]">·</span>
          <span className="font-mono-brand text-[12px] shrink-0">{busUnknown ? 'bus #?' : `#${busNumber}`}</span>
        </span>
        <span className="font-mono-brand text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded tracking-[0.08em] uppercase shrink-0">
          Change
        </span>
      </button>
    </div>
  )
}

function TripDetailsExpanded({
  routes, routeId, onRouteChange,
  travelDate, onDateChange,
  departureTime, onTimeChange,
  busNumber, onBusChange,
  busUnknown, onBusUnknownChange,
  errors,
}: {
  routes: RouteOption[]
  routeId: string; onRouteChange: (v: string) => void
  travelDate: string; onDateChange: (v: string) => void
  departureTime: string; onTimeChange: (v: string) => void
  busNumber: string; onBusChange: (v: string) => void
  busUnknown: boolean; onBusUnknownChange: (v: boolean) => void
  errors: { route?: string; bus?: string }
}) {
  return (
    <div className="px-5 pt-3.5 pb-1 flex flex-col gap-3">
      {/* Route */}
      <div>
        <FieldLabel required>Route</FieldLabel>
        <RouteSelect routes={routes} value={routeId} onChange={onRouteChange} error={errors.route} />
        <FieldError msg={errors.route} />
      </div>

      {/* Travel date */}
      <div>
        <FieldLabel required>Travel date</FieldLabel>
        <div className="h-[52px] rounded-xl border border-input bg-card overflow-hidden">
          <input
            dir="ltr"
            type="date"
            value={travelDate}
            max={todayStr()}
            onChange={e => onDateChange(e.target.value)}
            className="w-full h-full px-3 bg-transparent text-base appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Departure time */}
      <div>
        <FieldLabel optional>Departure time</FieldLabel>
        <div className="relative h-[52px] rounded-xl border border-input bg-card overflow-hidden">
          <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            dir="ltr"
            type="time"
            value={departureTime}
            onChange={e => onTimeChange(e.target.value)}
            className="w-full h-full pl-8 pr-2 bg-transparent text-base appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
        <FieldHint>If you remember — helps us identify your trip</FieldHint>
      </div>

      {/* Bus number */}
      <div>
        <FieldLabel required>Bus number</FieldLabel>
        <div className="relative">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            style={{ opacity: busUnknown ? 0.4 : 1 }}
          >
            <Hash size={16} />
          </span>
          <input
            type="text"
            value={busUnknown ? '' : busNumber}
            disabled={busUnknown}
            placeholder={busUnknown ? '—' : '47'}
            onChange={e => onBusChange(e.target.value)}
            className="w-full h-[52px] pl-10 pr-4 rounded-lg border bg-card text-[16px] text-foreground outline-none transition-all duration-150"
            style={{
              borderColor: errors.bus ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
              boxShadow: errors.bus ? '0 0 0 4px hsl(var(--destructive) / 0.12)' : 'none',
              opacity: busUnknown ? 0.5 : 1,
            }}
          />
        </div>
        {errors.bus ? <FieldError msg={errors.bus} /> : <FieldHint>Ticket ya bus par likha number</FieldHint>}

        {/* "I don't remember" checkbox */}
        <label className="inline-flex items-center gap-2.5 cursor-pointer py-2 mt-1.5">
          <input
            type="checkbox"
            checked={busUnknown}
            onChange={e => onBusUnknownChange(e.target.checked)}
            className="sr-only"
          />
          <span
            className="w-5 h-5 rounded-[6px] flex items-center justify-center transition-all duration-150 shrink-0"
            style={{
              background: busUnknown ? '#0F5D4E' : 'white',
              border: busUnknown ? '1.5px solid transparent' : '1.5px solid hsl(var(--input))',
              color: '#F7F3E9',
            }}
          >
            {busUnknown && <Check size={12} />}
          </span>
          <span className="text-[12.5px] font-medium text-foreground">I don&apos;t remember the bus number</span>
        </label>
      </div>
    </div>
  )
}

// ── Positive tags ──────────────────────────────────────────────

function PositiveTags({
  value, onToggle,
}: {
  value: string[]; onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {POSITIVE_TAGS.map(tag => {
          const on = value.includes(tag.value)
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => onToggle(tag.value)}
              className="h-11 pl-3 pr-4 rounded-full flex items-center gap-2 text-[13.5px] font-semibold border cursor-pointer active:scale-[0.96] transition-all duration-150"
              style={{
                background: on ? '#0F5D4E' : 'white',
                color: on ? '#F7F3E9' : 'hsl(var(--foreground))',
                borderColor: on ? 'transparent' : 'hsl(var(--border))',
                boxShadow: on ? '0 4px 12px rgba(15,93,78,0.28)' : 'none',
              }}
            >
              <tag.Icon size={16} style={{ color: on ? '#F7F3E9' : '#0F5D4E' }} />
              {tag.label}
            </button>
          )
        })}
      </div>
      {value.length > 0 && (
        <p className="mt-2.5 text-[11.5px] text-[#9AA59C]">
          Selected {value.length} · tap to remove
        </p>
      )}
    </div>
  )
}

// ── Complaint escape card ──────────────────────────────────────

function ComplaintEscapeCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="rounded-[18px] p-4 mt-1"
      style={{ background: '#FFF1EC', border: '1px dashed rgba(180,61,46,0.4)' }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(180,61,46,0.12)', color: '#B43D2E' }}
        >
          <AlertTriangle size={18} />
        </span>
        <span className="text-[14px] font-semibold text-foreground leading-snug">
          Need a formal investigation?
        </span>
      </div>
      <p className="text-[12.5px] text-[#6B776E] leading-relaxed mb-3">
        A complaint goes to the depot manager with a tracking reference. We respond within 24 hours.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="h-11 px-5 rounded-full inline-flex items-center gap-2 text-[13.5px] font-semibold text-white border-none cursor-pointer"
        style={{ background: '#B43D2E', boxShadow: '0 4px 14px rgba(180,61,46,0.4)' }}
      >
        Open complaint form
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── Submit dock ────────────────────────────────────────────────

function SubmitDock({
  rating, submitting, submitError, onSubmit, captionOverride,
}: {
  rating: number; submitting: boolean; submitError: string; onSubmit: () => void
  captionOverride?: string
}) {
  const enabled = rating > 0
  const bg      = enabled ? reactionBg(rating) : '#D4CCB8'
  const fg      = enabled ? reactionFg(rating) : '#9AA59C'

  const label = !rating ? 'Submit rating'
    : rating >= 3 ? (rating === 4 ? 'Send rating' : 'Send rating')
    : 'Send feedback'

  const caption = !rating ? 'Pick a face to continue'
    : rating === 4 ? 'Thank you — we love this'
    : rating === 3 ? 'We share these with the team weekly'
    : 'Thank you for telling us'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-3 z-10"
      style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(var(--background)) 35%)' }}
    >
      <button
        type="button"
        disabled={!enabled || submitting}
        onClick={onSubmit}
        className="w-full h-14 rounded-[14px] border-none flex items-center justify-center gap-2.5 text-[16px] font-semibold tracking-[-0.005em] transition-all duration-150 active:scale-[0.985]"
        style={{
          background: bg,
          color: fg,
          boxShadow: enabled ? `0 8px 20px ${bg}55, inset 0 1px 0 rgba(255,255,255,0.12)` : 'none',
          cursor: enabled && !submitting ? 'pointer' : 'default',
        }}
      >
        {submitting ? (
          <span className="opacity-70">Submitting…</span>
        ) : (
          <>
            <span>{label}</span>
            {rating === 4 && <Star size={14} fill="currentColor" className="mr-0.5" />}
            {enabled && <ChevronRight size={18} />}
          </>
        )}
      </button>
      {submitError ? (
        <p className="text-center mt-2 text-[11px] text-destructive">{submitError}</p>
      ) : (
        <p className="text-center mt-2 text-[11px] text-[#9AA59C] tracking-[0.02em]">{captionOverride ?? caption}</p>
      )}
    </div>
  )
}

// ── Steward: PIN modal ─────────────────────────────────────────

function PinModal({
  onSuccess, onCancel,
}: {
  onSuccess: () => void; onCancel: () => void
}) {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [shake, setShake]   = useState(false)

  function attempt() {
    const correct = process.env.NEXT_PUBLIC_STEWARD_PIN ?? ''
    if (pin === correct) {
      onSuccess()
    } else {
      setError('Wrong PIN — try again')
      setPin('')
      setShake(true)
      setTimeout(() => setShake(false), 420)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(15,20,18,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm bg-card rounded-[22px] p-6 shadow-2xl">
        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Lock size={22} />
          </div>
          <h2 className="text-[18px] font-semibold tracking-[-0.005em]">Steward Mode</h2>
          <p className="text-[13px] text-muted-foreground mt-1 text-center">Enter the 4-digit PIN to continue</p>
        </div>

        <div
          className="relative h-[52px] rounded-xl border bg-background overflow-hidden mb-3"
          style={{ animation: shake ? 'shakeNudge 380ms cubic-bezier(.36,.07,.19,.97) both' : undefined }}
        >
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            autoFocus
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            onKeyDown={e => e.key === 'Enter' && pin.length === 4 && attempt()}
            placeholder="••••"
            className="w-full h-full px-4 text-center text-[22px] font-mono-brand tracking-[0.5em] bg-transparent outline-none focus:ring-4 focus:ring-primary/10 border-input"
          />
        </div>

        {error && (
          <p className="text-[12px] text-destructive text-center mb-3" style={{ animation: 'errorFadeIn 220ms ease-out' }}>
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-border bg-card text-[14px] font-medium text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pin.length !== 4}
            onClick={attempt}
            className="h-11 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold border-none cursor-pointer disabled:opacity-40"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Steward: setup screen ──────────────────────────────────────

function StewardSetupScreen({
  routes, onStart, onExit,
}: {
  routes: RouteOption[]
  onStart: (routeId: string, bus: string, time: string) => void
  onExit: () => void
}) {
  const [routeId,       setRouteId      ] = useState('')
  const [bus,           setBus          ] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [errors,        setErrors       ] = useState<Record<string, string>>({})

  function clearErr(key: string) {
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleStart() {
    const e: Record<string, string> = {}
    if (!routeId)       e.route = 'Please choose a route'
    if (!bus.trim())    e.bus   = 'Please enter the bus number'
    if (!departureTime) e.time  = 'Please select a departure time'
    if (Object.keys(e).length) { setErrors(e); return }
    onStart(routeId, bus.trim(), departureTime)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header strip */}
      <div className="bg-primary text-primary-foreground flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Users size={15} />
          <span>Steward Mode</span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary-foreground/70 hover:text-primary-foreground bg-transparent border-none cursor-pointer"
        >
          <LogOut size={13} />
          Exit
        </button>
      </div>

      <div className="px-5 pt-7 pb-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1">Set up this trip</h1>
        <p className="text-[13.5px] text-muted-foreground mb-7">
          Route, bus, and time lock in for the whole session. Tap &ldquo;Start&rdquo; when ready.
        </p>

        {/* Route */}
        <div className="mb-4">
          <FieldLabel required>Route</FieldLabel>
          <RouteSelect
            routes={routes}
            value={routeId}
            onChange={v => { setRouteId(v); clearErr('route') }}
            error={errors.route}
          />
          <FieldError msg={errors.route} />
        </div>

        {/* Bus number */}
        <div className="mb-4">
          <FieldLabel required>Bus number</FieldLabel>
          <div className="relative">
            <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={bus}
              placeholder="47"
              onChange={e => { setBus(e.target.value); clearErr('bus') }}
              className="w-full h-[52px] pl-10 pr-4 rounded-lg border bg-card text-[16px] text-foreground outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              style={{ borderColor: errors.bus ? 'hsl(var(--destructive))' : 'hsl(var(--border))' }}
            />
          </div>
          <FieldError msg={errors.bus} />
        </div>

        {/* Departure time — same component as /submit complaint form */}
        <div className="mb-8">
          <FieldLabel required>Departure time</FieldLabel>
          <div className={cn(
            'relative h-[52px] rounded-xl border bg-card overflow-hidden',
            errors.time ? 'border-destructive' : 'border-input',
          )}>
            <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              dir="ltr"
              type="time"
              value={departureTime}
              onChange={e => { setDepartureTime(e.target.value); clearErr('time') }}
              className="w-full h-full pl-8 pr-2 bg-transparent text-base appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <FieldError msg={errors.time} />
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="w-full h-14 rounded-[14px] bg-primary text-primary-foreground text-[16px] font-semibold border-none cursor-pointer flex items-center justify-center gap-2"
          style={{ boxShadow: '0 8px 20px rgba(15,93,78,0.25)' }}
        >
          <Users size={18} />
          Start collecting ratings
        </button>
      </div>
    </div>
  )
}

// ── Steward: active-session banner ────────────────────────────

function StewardBanner({
  count, routeName, busNumber, departureTime, onNewTrip, onExit,
}: {
  count: number; routeName: string; busNumber: string; departureTime: string
  onNewTrip: () => void; onExit: () => void
}) {
  return (
    <div className="bg-primary text-primary-foreground px-4 pt-3 pb-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="opacity-80 shrink-0" />
          <span className="text-[12px] font-semibold tracking-wide uppercase opacity-90">Steward Mode</span>
        </div>
        <span className="font-mono-brand text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-full">
          {count} collected
        </span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[12px] text-primary-foreground/75 truncate max-w-[60%]">
          {routeName} · #{busNumber}{departureTime ? ` · ${departureTime}` : ''}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNewTrip}
            className="flex items-center gap-1 text-[11.5px] font-medium text-primary-foreground/80 hover:text-primary-foreground bg-transparent border-none cursor-pointer"
          >
            <RotateCcw size={11} />
            New Trip
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 text-[11.5px] font-medium text-primary-foreground/80 hover:text-primary-foreground bg-transparent border-none cursor-pointer"
          >
            <LogOut size={11} />
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Thank-you: positive ────────────────────────────────────────

const SPARKLE_SEEDS = [
  { left: '20%', top: '24%', delay: '0s',    size: 16 },
  { left: '78%', top: '20%', delay: '1.4s',  size: 12 },
  { left: '12%', top: '60%', delay: '2.8s',  size: 14 },
  { left: '84%', top: '54%', delay: '0.8s',  size: 12 },
  { left: '50%', top: '10%', delay: '2.0s',  size: 16 },
  { left: '48%', top: '70%', delay: '3.6s',  size: 12 },
]

function ThanksPositive({
  rating, tags, route, travelDate, busNumber, busUnknown, onAnother, onDone,
}: {
  rating: number; tags: string[]; route?: RouteOption
  travelDate: string; busNumber: string; busUnknown: boolean
  onAnother: () => void; onDone: () => void
}) {
  const HeroIcon = rating === 4 ? Laugh : Smile
  const parsed   = route ? parseRouteName(route.name) : null
  const selectedTags = POSITIVE_TAGS.filter(t => tags.includes(t.value))

  return (
    <div
      className="min-h-screen bg-background px-5 pt-16 pb-8 flex flex-col"
      style={{ animation: 'thanksFade 360ms ease-out' }}
    >
      {/* Hero smiley + sparkles */}
      <div className="relative flex justify-center mb-5" style={{ height: 130 }}>
        {SPARKLE_SEEDS.map((s, i) => (
          <span
            key={i}
            className="absolute text-primary pointer-events-none"
            style={{
              left: s.left, top: s.top,
              opacity: 0.35,
              animation: `sparkleFloat 6s ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          >
            <Star size={s.size} fill="currentColor" />
          </span>
        ))}
        <div
          className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center relative"
          style={{
            boxShadow: '0 14px 36px rgba(15,93,78,0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
            animation: 'smileyPop 460ms cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <HeroIcon size={56} strokeWidth={1.6} />
          <span className="absolute inset-[-8px] rounded-full border border-primary/25" />
          <span className="absolute inset-[-18px] rounded-full border border-primary/12" />
        </div>
      </div>

      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-primary text-center mb-1.5">
        Thanks for the love!
      </h1>
      <p className="text-[13px] italic text-[#9AA59C] text-center mb-6">
        Aap ka shukriya — yahi himmat barhata hai.
      </p>

      {/* Recap card */}
      {parsed && (
        <div
          className="rounded-[18px] bg-card border border-[#E1D9C5] p-4"
          style={{ boxShadow: '0 10px 24px rgba(15,93,78,0.06)' }}
        >
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Your trip</span>
            <span className="font-mono-brand text-[10.5px] text-[#9AA59C] tracking-[0.1em]">{formatDateLabel(travelDate)}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div>
              <p className="text-[26px] font-bold leading-none tabular-nums">{parsed.fromCode}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-tight">{parsed.from}</p>
            </div>
            <div className="flex items-center relative h-6">
              <div className="w-full h-0.5" style={{ background: 'repeating-linear-gradient(90deg, hsl(var(--border)) 0 6px, transparent 6px 12px)' }} />
              <span className="absolute left-1/2 -translate-x-1/2 bg-card border border-border rounded-md px-1 text-primary">
                <Bus size={12} />
              </span>
            </div>
            <div className="text-right">
              <p className="text-[26px] font-bold leading-none tabular-nums">{parsed.toCode}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-tight">{parsed.to}</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 pt-2.5 border-t border-dashed border-[#C9C0A8] font-mono-brand text-[12px] text-muted-foreground tracking-[0.06em]">
            <span>BUS #{busUnknown ? '?' : busNumber}</span>
            <span>★ {rating}/4</span>
          </div>
        </div>
      )}

      {/* Tags recap */}
      {selectedTags.length > 0 && (
        <div className="mt-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#9AA59C] mb-2.5">What was great</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <span
                key={tag.value}
                className="h-9 pl-3 pr-3.5 rounded-full flex items-center gap-2 text-[12.5px] font-semibold bg-card border border-border text-foreground"
              >
                <tag.Icon size={14} className="text-primary" />
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2.5 mt-6">
        <button
          type="button"
          className="h-[50px] rounded-[14px] bg-card border border-border text-foreground text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 size={14} />
          Share with a friend
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-[50px] rounded-[14px] bg-primary text-primary-foreground text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer border-none"
          style={{ boxShadow: '0 8px 20px rgba(15,93,78,0.2)' }}
        >
          Done
          <ChevronRight size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onAnother}
        className="mt-5 self-center text-[12.5px] font-medium text-[#6B776E] underline underline-offset-4 decoration-[#C9C0A8] bg-transparent border-none cursor-pointer"
      >
        ← Rate another trip
      </button>
    </div>
  )
}

// ── Thank-you: negative ────────────────────────────────────────

function ThanksNegative({
  rating, hasPhone, onComplaint, onDone,
}: {
  rating: number; hasPhone: boolean; onComplaint: () => void; onDone: () => void
}) {
  const HeroIcon = rating === 1 ? Frown : Meh
  const nextSteps = [
    { title: 'Read by ops within 24h',       sub: 'Two team leads, every weekday morning.' },
    { title: 'Used in team coaching',         sub: 'Specific feedback gets cited in trainings.' },
    {
      title: hasPhone ? 'We will reach out on WhatsApp' : 'Anonymous unless you left your number',
      sub:   hasPhone ? 'Usually within 24 hours.' : 'You can still leave it on the form.',
    },
  ]

  return (
    <div
      className="min-h-screen bg-background px-5 pt-16 pb-8 flex flex-col"
      style={{ animation: 'thanksFade 360ms ease-out' }}
    >
      <div className="flex justify-center mb-5">
        <div
          className="w-24 h-24 rounded-[28px] bg-[#F0EAD9] border border-border flex items-center justify-center text-[#6B776E]"
        >
          <HeroIcon size={54} strokeWidth={1.6} />
        </div>
      </div>

      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground text-center mb-1.5 text-balance">
        Thanks for telling us. We&apos;ll do better.
      </h1>
      <p className="text-[13px] italic text-[#9AA59C] text-center mb-6">Shukriya — hum behtari karenge.</p>

      {/* What happens next */}
      <div className="bg-muted border border-border rounded-[14px] p-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3.5">
          What happens next
        </p>
        <div className="flex flex-col gap-2.5">
          {nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-[5px]" />
              <div>
                <p className="text-[13px] font-semibold text-foreground leading-snug">{step.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ComplaintEscapeCard onOpen={onComplaint} />

      <button
        type="button"
        onClick={onDone}
        className="mt-5 h-14 rounded-[14px] bg-primary text-primary-foreground text-[16px] font-semibold flex items-center justify-center gap-2.5 border-none cursor-pointer"
        style={{ boxShadow: '0 8px 20px rgba(15,93,78,0.2)' }}
      >
        Done
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function RatingForm({ routes }: { routes: RouteOption[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const qrRoute = params.get('route') ?? ''
  const qrBus   = params.get('bus')   ?? ''
  const qrTime  = params.get('time')  ?? ''
  const hasQrParams = !!(qrRoute && qrBus)

  const [screen,        setScreen       ] = useState<Screen>('form')
  const [rating,        setRating       ] = useState(0)
  const [routeId,       setRouteId      ] = useState(qrRoute)
  const [travelDate,    setTravelDate   ] = useState(todayStr())
  const [departureTime, setDepartureTime] = useState(qrTime)
  const [busNumber,     setBusNumber    ] = useState(qrBus)
  const [busUnknown,    setBusUnknown   ] = useState(false)
  const [tags,          setTags         ] = useState<string[]>([])
  const [feedbackText,  setFeedbackText ] = useState('')
  const [name,          setName         ] = useState('')
  const [phone,         setPhone        ] = useState('')
  const [errors,        setErrors       ] = useState<Record<string, string>>({})
  const [shakeSmiley,   setShakeSmiley  ] = useState(false)
  const [submitting,    setSubmitting   ] = useState(false)
  const [submitError,   setSubmitError  ] = useState('')
  const [tripExpanded,  setTripExpanded ] = useState(!hasQrParams)
  const revealedRef = useRef(false)

  // ── Steward mode state ────────────────────────────────────────
  const [stewardMode,   setStewardMode  ] = useState(false)
  const [showPinModal,  setShowPinModal ] = useState(false)
  const [stewardSetup,  setStewardSetup ] = useState(true)
  const [stewardCount,  setStewardCount ] = useState(0)
  const [stewardRoute,  setStewardRoute ] = useState('')
  const [stewardBus,    setStewardBus   ] = useState('')
  const [stewardTime,   setStewardTime  ] = useState('')

  useEffect(() => {
    if (rating > 0) revealedRef.current = true
  }, [rating])

  // Restore steward session from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem('steward_active') !== '1') return
    const r = sessionStorage.getItem('steward_route') ?? ''
    const b = sessionStorage.getItem('steward_bus')   ?? ''
    const t = sessionStorage.getItem('steward_time')  ?? ''
    const c = parseInt(sessionStorage.getItem('steward_count') ?? '0', 10)
    setStewardMode(true)
    if (r && b && t) {
      setStewardRoute(r)
      setStewardBus(b)
      setStewardTime(t)
      setRouteId(r)
      setBusNumber(b)
      setDepartureTime(t)
      setStewardCount(c)
      setStewardSetup(false)
    } else {
      setStewardSetup(true)
    }
  }, [])

  useEffect(() => {
    if (errors.route || errors.bus) setTripExpanded(true)
  }, [errors.route, errors.bus])

  useEffect(() => {
    if (rating && errors.rating) {
      setErrors(e => { const n = { ...e }; delete n.rating; return n })
    }
  }, [rating])

  const clearError = useCallback((key: string) => {
    setErrors(e => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n })
  }, [])

  const isPositive = rating >= 3
  const isNegative = rating > 0 && rating <= 2

  function handlePinSuccess() {
    setStewardMode(true)
    setStewardSetup(true)
    setStewardCount(0)
    sessionStorage.setItem('steward_active', '1')
    setShowPinModal(false)
  }

  function handleStewardStart(rId: string, bus: string, time: string) {
    setStewardRoute(rId)
    setStewardBus(bus)
    setStewardTime(time)
    setRouteId(rId)
    setBusNumber(bus)
    setDepartureTime(time)
    setBusUnknown(false)
    setStewardCount(0)
    setStewardSetup(false)
    sessionStorage.setItem('steward_route', rId)
    sessionStorage.setItem('steward_bus', bus)
    sessionStorage.setItem('steward_time', time)
    sessionStorage.setItem('steward_count', '0')
  }

  function handleStewardNewTrip() {
    setStewardSetup(true)
    setStewardCount(0)
    setStewardRoute('')
    setStewardBus('')
    setStewardTime('')
    setRouteId('')
    setBusNumber('')
    setDepartureTime('')
    setRating(0)
    setTags([])
    setFeedbackText('')
    setErrors({})
    sessionStorage.removeItem('steward_route')
    sessionStorage.removeItem('steward_bus')
    sessionStorage.removeItem('steward_time')
    sessionStorage.setItem('steward_count', '0')
  }

  function handleExitSteward() {
    setStewardMode(false)
    setStewardSetup(true)
    setStewardCount(0)
    setStewardRoute('')
    setStewardBus('')
    setStewardTime('')
    setRating(0)
    setTags([])
    setFeedbackText('')
    setErrors({})
    sessionStorage.removeItem('steward_active')
    sessionStorage.removeItem('steward_route')
    sessionStorage.removeItem('steward_bus')
    sessionStorage.removeItem('steward_time')
    sessionStorage.removeItem('steward_count')
  }

  function buildComplaintUrl() {
    const qs = new URLSearchParams()
    qs.set('from', 'rate')
    qs.set('rating', String(rating))
    if (routeId) qs.set('route', routeId)
    if (travelDate) qs.set('date', travelDate)
    if (!busUnknown && busNumber) qs.set('bus', busNumber)
    if (feedbackText) qs.set('desc', feedbackText.slice(0, 200))
    return `/submit?${qs.toString()}`
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {}
    if (!rating) errs.rating = 'Please rate your experience'
    if (!routeId) errs.route = 'Please choose your route'
    if (!busUnknown && !busNumber.trim()) errs.bus = 'Enter the bus number — or tick "I don\'t remember"'

    if (Object.keys(errs).length) {
      setErrors(errs)
      if (errs.rating) {
        setShakeSmiley(true)
        setTimeout(() => setShakeSmiley(false), 420)
        document.querySelector('[data-smiley-row]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } else {
        document.querySelector('[data-trip-section]')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('submit_rating', {
        p_rating:         rating,
        p_route_id:       routeId,
        p_travel_date:    travelDate || todayStr(),
        p_departure_time: stewardMode ? (stewardTime || null) : (departureTime || null),
        p_bus_number:     busUnknown ? null : busNumber.trim(),
        p_bus_unknown:    busUnknown,
        p_positive_tags:  rating >= 3 ? tags : [],
        p_feedback_text:  rating <= 2 ? feedbackText.trim() : '',
        p_phone:          phone.trim() ? `+92${phone.trim().replace(/\D/g, '').replace(/^0/, '')}` : null,
        p_name:           name.trim() || null,
        p_source:         hasQrParams ? 'qr' : 'direct',
        p_query_string:   typeof window !== 'undefined' ? window.location.search : '',
      })
      if (error) throw error
      if (stewardMode) {
        // Instant reset — no thank-you screen, route/bus stay locked
        const next = stewardCount + 1
        setStewardCount(next)
        sessionStorage.setItem('steward_count', String(next))
        setRating(0)
        setTags([])
        setFeedbackText('')
        setErrors({})
      } else {
        setScreen(rating >= 3 ? 'thanks-pos' : 'thanks-neg')
      }
    } catch (err) {
      console.error(err)
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Steward mode screens ──────────────────────────────────────
  if (stewardMode && stewardSetup) {
    return (
      <StewardSetupScreen
        routes={routes}
        onStart={handleStewardStart}
        onExit={handleExitSteward}
      />
    )
  }

  if (stewardMode && !stewardSetup) {
    const lockedRoute = routes.find(r => r.id === stewardRoute)
    return (
      <div className="min-h-screen bg-background relative pb-36">
        <StewardBanner
          count={stewardCount}
          routeName={lockedRoute?.name ?? ''}
          busNumber={stewardBus}
          departureTime={stewardTime}
          onNewTrip={handleStewardNewTrip}
          onExit={handleExitSteward}
        />

        <div className="px-5 pt-5 pb-2">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground mb-1">
            How was the trip?
          </h1>
          <p className="text-[13.5px] text-muted-foreground">Hand the phone to the passenger</p>
        </div>

        <div className="mt-2">
          <SmileySelector
            rating={rating}
            onChange={setRating}
            shake={shakeSmiley}
            error={errors.rating}
          />
        </div>

        {rating > 0 && (
          <div style={{ animation: 'formRevealIn 280ms ease-out' }}>
            {isPositive && (
              <div className="px-5 pt-5 pb-1">
                <SectionHeader title="What was great?" caption="Kya acha laga?" optional />
                <PositiveTags
                  value={tags}
                  onToggle={v => setTags(cur => cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])}
                />
              </div>
            )}
            {isNegative && (
              <div className="px-5 pt-5 pb-1">
                <SectionHeader title="Sorry to hear that" caption="Bataiye kya hua" />
                <div>
                  <FieldLabel optional>What went wrong?</FieldLabel>
                  <textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value.slice(0, 280))}
                    rows={3}
                    placeholder="A line or two — what went wrong?"
                    className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-[14.5px] text-foreground resize-none leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  <p className="text-[11.5px] text-[#9AA59C] mt-1.5 flex justify-between">
                    <span>We&apos;ll use it to coach the team.</span>
                    <span>{feedbackText.length}/280</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <SubmitDock
          rating={rating}
          submitting={submitting}
          submitError={submitError}
          onSubmit={handleSubmit}
          captionOverride={rating > 0 ? 'Submitting saves and resets instantly' : 'Tap a face to start'}
        />
      </div>
    )
  }

  // ── Passenger thank-you screens ───────────────────────────────
  if (screen === 'thanks-pos') {
    return (
      <ThanksPositive
        rating={rating}
        tags={tags}
        route={routes.find(r => r.id === routeId)}
        travelDate={travelDate}
        busNumber={busNumber}
        busUnknown={busUnknown}
        onAnother={() => { setScreen('form'); setRating(0); setTags([]); setFeedbackText(''); setErrors({}) }}
        onDone={() => router.push('/')}
      />
    )
  }
  if (screen === 'thanks-neg') {
    return (
      <ThanksNegative
        rating={rating}
        hasPhone={!!phone.trim()}
        onComplaint={() => router.push(buildComplaintUrl())}
        onDone={() => router.push('/')}
      />
    )
  }

  const selectedRoute = routes.find(r => r.id === routeId)

  return (
    <div className="min-h-screen bg-background relative pb-36">
      {/* Trust strip */}
      <div className="bg-primary text-primary-foreground flex items-center gap-2 px-5 py-2.5 text-[12px] font-medium">
        <Shield size={13} className="opacity-90 shrink-0" />
        <span>We read every rating. Good or bad.</span>
      </div>

      {/* Hero */}
      <div className="px-5 pt-6 pb-2">
        <BrandMark />
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-foreground mb-2">
          How was your trip?
        </h1>
        <p className="text-[14px] text-muted-foreground">Two taps tells us everything.</p>
        <p className="text-[12px] text-[#9AA59C] mt-1.5 italic">Aap ki raye humein behtar banati hai</p>
      </div>

      {/* Smiley row */}
      <div className="mt-4">
        <SmileySelector
          rating={rating}
          onChange={setRating}
          shake={shakeSmiley}
          error={errors.rating}
        />
      </div>

      {/* Reveal section */}
      {rating > 0 && (
        <div style={{ animation: 'formRevealIn 280ms ease-out' }}>
          {/* Trip section header */}
          <div className="px-5 pt-5 pb-0" data-trip-section>
            <SectionHeader title="Your trip" caption="Safar ki tafseel" />
          </div>

          {tripExpanded ? (
            <TripDetailsExpanded
              routes={routes}
              routeId={routeId}
              onRouteChange={v => { setRouteId(v); clearError('route') }}
              travelDate={travelDate}
              onDateChange={setTravelDate}
              departureTime={departureTime}
              onTimeChange={setDepartureTime}
              busNumber={busNumber}
              onBusChange={v => { setBusNumber(v); clearError('bus') }}
              busUnknown={busUnknown}
              onBusUnknownChange={v => { setBusUnknown(v); clearError('bus') }}
              errors={{ route: errors.route, bus: errors.bus }}
            />
          ) : (
            <CollapsedTripRow
              route={selectedRoute}
              travelDate={travelDate}
              busNumber={busNumber}
              busUnknown={busUnknown}
              onExpand={() => setTripExpanded(true)}
            />
          )}

          {/* Conditional block */}
          {isPositive && (
            <div className="px-5 pt-5 pb-1">
              <SectionHeader title="What was great?" caption="Kya acha laga?" optional />
              <PositiveTags
                value={tags}
                onToggle={v => setTags(cur => cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])}
              />
            </div>
          )}

          {isNegative && (
            <div className="px-5 pt-5 pb-1">
              <SectionHeader title="Sorry to hear that" caption="Bataiye kya hua" />
              <div>
                <FieldLabel optional>What went wrong?</FieldLabel>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value.slice(0, 280))}
                  rows={3}
                  placeholder="A line or two — what went wrong?"
                  className="w-full rounded-lg border border-border bg-card px-3.5 py-3 text-[14.5px] text-foreground resize-none leading-relaxed outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <p className="text-[11.5px] text-[#9AA59C] mt-1.5 flex justify-between">
                  <span>We&apos;ll use it to coach the team.</span>
                  <span>{feedbackText.length}/280</span>
                </p>
              </div>
              <ComplaintEscapeCard onOpen={() => router.push(buildComplaintUrl())} />
            </div>
          )}

          {/* Contact */}
          <div className="px-5 pt-5 pb-1">
            <SectionHeader title="Contact" caption="Sirf agar follow-up chahiye" optional />
            <div className="flex flex-col gap-3">
              <div>
                <FieldLabel>Your name</FieldLabel>
                <input
                  type="text"
                  value={name}
                  placeholder="Full name"
                  onChange={e => setName(e.target.value)}
                  className="w-full h-[52px] px-4 rounded-lg border border-border bg-card text-[16px] text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <FieldHint>Optional — helps us follow up</FieldHint>
              </div>
              <div>
                <FieldLabel>Mobile number</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-brand text-[13px] font-medium text-[#9AA59C] border-r border-border pr-2.5">
                    +92
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    placeholder="0312-4567890"
                    onChange={e => setPhone(e.target.value)}
                    className="w-full h-[52px] pl-16 pr-4 rounded-lg border border-border bg-card text-[16px] text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
                <FieldHint>Only if you want a reply about this rating.</FieldHint>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steward mode entry — subtle, below the form */}
      {rating === 0 && (
        <div className="px-5 pt-8 pb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="flex items-center gap-1.5 text-[12px] text-[#9AA59C] bg-transparent border-none cursor-pointer underline underline-offset-4 decoration-[#C9C0A8]"
          >
            <Users size={12} />
            Steward Mode
          </button>
        </div>
      )}

      {/* Submit dock */}
      <SubmitDock
        rating={rating}
        submitting={submitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />

      {/* PIN modal */}
      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onCancel={() => { setShowPinModal(false) }}
        />
      )}
    </div>
  )
}
