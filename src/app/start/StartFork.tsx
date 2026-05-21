'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Smile, MessageSquareWarning, ChevronRight, Shield } from 'lucide-react'

export default function StartFork() {
  const router = useRouter()
  const params = useSearchParams()
  const qs = params.toString() ? '?' + params.toString() : ''

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Trust strip */}
      <div className="bg-primary text-primary-foreground flex items-center gap-2 px-5 py-2.5 text-[12px] font-medium">
        <Shield size={13} className="opacity-90 shrink-0" />
        <span>We read every rating. Good or bad.</span>
      </div>

      {/* Brand row */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-[46px] h-[46px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
            style={{ boxShadow: '0 6px 18px rgba(15,93,78,0.28), inset 0 1px 0 rgba(255,255,255,0.18)' }}
          >
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <path d="M16 8h4l3 3v4h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
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

        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          How was your journey?
        </h1>
        <p className="text-[13px] italic text-[#9AA59C] mt-1">Aap ka safar kaisa raha?</p>
      </div>

      <div className="flex-1" />

      {/* Cards */}
      <div className="px-5 pb-10 flex flex-col gap-3">
        {/* Positive card */}
        <button
          type="button"
          onClick={() => router.push('/rate' + qs)}
          className="h-24 px-5 rounded-[18px] border-none text-left flex items-center gap-4 cursor-pointer active:scale-[0.985] transition-transform"
          style={{
            background: '#0F5D4E',
            color: '#F7F3E9',
            boxShadow: '0 10px 28px rgba(15,93,78,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          >
            <Smile size={30} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold leading-snug tracking-[-0.005em]">Rate your experience</div>
            <div className="text-[12.5px] font-medium mt-0.5" style={{ color: 'rgba(247,243,233,0.7)' }}>
              2 taps · 15 seconds
            </div>
          </div>
          <ChevronRight size={20} className="opacity-90 shrink-0" />
        </button>

        {/* Negative card */}
        <button
          type="button"
          onClick={() => router.push('/submit' + qs)}
          className="h-24 px-5 rounded-[18px] bg-card border border-border text-left flex items-center gap-4 cursor-pointer active:scale-[0.985] transition-transform"
        >
          <span className="w-14 h-14 rounded-2xl bg-[#F0EAD9] flex items-center justify-center shrink-0 text-primary">
            <MessageSquareWarning size={28} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold leading-snug tracking-[-0.005em] text-foreground">Submit a complaint</div>
            <div className="text-[12.5px] font-medium mt-0.5 text-[#6B776E]">Goes directly to the depot manager</div>
          </div>
          <ChevronRight size={20} className="text-[#9AA59C] shrink-0" />
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1 text-[#9AA59C] text-[11px] tracking-[0.18em] uppercase">
          <span className="flex-1 h-px bg-[#E1D9C5]" />
          <span>or</span>
          <span className="flex-1 h-px bg-[#E1D9C5]" />
        </div>

        <button
          type="button"
          onClick={() => router.push('/status')}
          className="text-center text-[13px] font-medium text-[#6B776E] underline underline-offset-4 decoration-[#C9C0A8] bg-transparent border-none cursor-pointer"
        >
          Track an existing complaint →
        </button>
      </div>
    </div>
  )
}
