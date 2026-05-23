'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Car, UserCheck, Bus, UtensilsCrossed, Clock, Ticket, AlertTriangle, Lightbulb,
  Camera, Check, ChevronRight, Hash, Shield, Share, X, MapPin, Sparkles,
  PhoneOff, Frown, HelpCircle, Wind, Smartphone, Armchair, Navigation, UserX, Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

type Lang = 'en' | 'ur'
type Route = { id: string; name: string }

interface Props {
  routes: Route[]
}

type SubcategoryEntry = {
  value: string
  label: string
  icon:  LucideIcon
}

type CategoryEntry = {
  value:    string
  label:    string
  icon:     LucideIcon
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  variant?: 'suggestion'
}

type BusSubcategoryEntry = {
  value:                 string
  label:                 string
  icon:                  LucideIcon
  severity:              'HIGH' | 'MEDIUM'
  isMaintenanceRequired: boolean
}

type ConfirmationData = {
  referenceNumber: string
  routeName:       string
  travelDate:      string
  departureTime:   string
  busNumber:       string
}

// ── City code mapping ────────────────────────────────────────
// Add new cities here when new routes are added
const CITY_CODES: Record<string, string> = {
  Faisalabad: 'FSD',
  Lahore:     'LHR',
  Karachi:    'KHI',
  Islamabad:  'ISB',
  Multan:     'MUL',
  Peshawar:   'PEW',
}

// ── Translations ─────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    toggleLabel: 'اردو | English',
    trustStrip: 'Your complaint goes directly to management',
    subLine: 'Passenger complaints · Faisalabad',
    heroTitle: 'Submit a Complaint',
    heroSubtitle: 'Subhan Complaints — شکایت درج کریں',
    heroHint: 'Hum sun rahay hain',

    contactTitle: 'Your contact',
    contactCaption: 'Taake hum aap se rabta kar sakein',
    phoneLabel: 'Mobile Number',
    phoneHint: 'Apna mobile number likhein',
    nameLabel: 'Your Name',
    namePlaceholder: 'Full name',
    nameHint: 'Optional — agar batana chahein',

    tripTitle: 'Your trip',
    tripCaption: 'Safar ki tafseel',
    routeLabel: 'Route',
    routeHint: 'Apna safar ka rasta chunein',
    routePlaceholder: 'Select route...',
    dateLabel: 'Date of Travel',
    timeLabel: 'Departure Time',
    dateTimeHint: 'Tap to select — stored as 24-hour, shown as 12-hour on your phone',
    busNumLabel: 'Bus Number',
    busNumHint: 'Ticket ya bus ke andar likha number',

    journeyLabel: 'YOUR JOURNEY',
    departureLabel: 'Departure',
    busNoLabel: 'Bus No.',

    whatTitle: 'What happened?',
    whatCaption: 'Kya masla hua?',
    categoryLabel: 'Complaint Category',

    catDriver: 'Driver',
    catSteward: 'Steward',
    catBus: 'Bus Condition',
    catFood: 'Food / Drinks',
    catDelay: 'Delay / Timing',
    catTicket: 'Ticket / Refund',
    catOther: 'Other / Serious',
    catSuggestion: 'Suggestion / Feedback',

    driverEyebrow: 'DRIVER · specifics',
    driverReckless: 'Reckless / dangerous driving',
    driverMobile: 'Mobile phone use while driving',
    driverRude: 'Rude behavior',
    driverOther: 'Other',
    driverNameLabel: 'Driver name',
    driverOptional: '(optional)',
    driverNameHint: 'Agar yaad ho — ticket ya bus ke andar likha hota hai',

    stewardEyebrow: 'STEWARD · specifics',
    stewardRude: 'Rude behavior',
    stewardUnresponsive: 'Unresponsive / not helping',
    stewardNotServing: 'Not serving properly',
    stewardOther: 'Other',
    stewardNameLabel: 'Steward name',
    stewardNameHint: 'Agar yaad ho — ticket ya bus ke andar likha hota hai',
    stewardHeadTitle: 'This complaint is about the steward head',
    stewardHeadSub: 'Kya yeh complaint bara steward ke baray mein hai?',

    busEyebrow: 'BUS CONDITION · specifics',
    busAC: 'AC / Heating',
    busTablet: 'Entertainment Tablet',
    busSeat: 'Seat',
    busClean: 'Cleanliness',

    delayEyebrow: 'DELAY / TIMING · specifics',
    delayLate: 'Late Departure',
    delayArrival: 'Late Arrival',
    delayStops: 'Excessive Stops / Slow Journey',
    delayOther: 'Other',

    sevHigh: 'High priority',
    sevHighRoute: 'Flagged to admin',
    sevMed: 'Medium priority',
    sevMedRoute: 'Sent to team lead',
    sevLow: 'Low priority',
    sevLowRoute: 'Standard queue',

    descLabel: 'Description',
    descPlaceholder: 'What happened? Brief detail...',
    descHint: 'Kya hua? Mukhtasar bataein',

    photoLabel: 'Photo',
    photoTap: 'Tap to upload photo',
    photoSub: 'Camera · gallery · max 5 MB',
    photoError: 'Photo must be under 5MB',

    submitBtn: 'Submit Complaint',
    submitting: 'Submitting...',
    submitNote: 'Reference generated instantly · response within 24 hours',
    submitError: 'Something went wrong. Please try again.',

    errPhone: 'Enter a valid Pakistani number (03XX-XXXXXXX)',
    errRoute: 'Please select a route',
    errDate: 'Please select the date of travel',
    errTime: 'Please select the departure time',
    errCategory: 'Please select a complaint category',
    errDriverSub: 'Please select what went wrong',
    errStewardSub: 'Please select what went wrong',
    errBusSub: 'Please select what specifically went wrong',
    errDelaySub: 'Please select the type of delay',
    errBusNum: 'Please enter the bus number',

    optionalBadge: 'Optional',

    confTitle: 'Complaint Received',
    confSub: 'Aap ki complaint hamare paas pahunch gayi hai',
    confReceipt: 'COMPLAINT RECEIPT',
    confRefLabel: 'REFERENCE NUMBER',
    confScreenshot: 'Screenshot to track later',
    confDate: 'Date',
    confTime: 'Time',
    confBus: 'Bus',
    confNext: 'What happens next',
    confStep1Title: 'Auto-triaged',
    confStep1Sub: 'Sent to the right team in seconds',
    confStep2Title: 'We investigate',
    confStep2Sub: 'Within 24 hours, on WhatsApp',
    confStep3Title: 'Resolution + follow-up',
    confStep3Sub: 'Plus a satisfaction check',
    confShare: 'Share',
    confTrack: 'Track status',
    confScreenshotNote: 'Please screenshot this page for your records',
    confBack: '← Back to the form',
  },
  ur: {
    toggleLabel: 'اردو | English',
    trustStrip: 'آپ کی شکایت براہ راست انتظامیہ تک جاتی ہے',
    subLine: 'مسافر شکایات · فیصل آباد',
    heroTitle: 'شکایت درج کریں',
    heroSubtitle: 'سبحان کمپلینٹس — Subhan Complaints',
    heroHint: 'ہم سن رہے ہیں',

    contactTitle: 'آپ کا رابطہ',
    contactCaption: 'تاکہ ہم آپ سے رابطہ کر سکیں',
    phoneLabel: 'موبائل نمبر',
    phoneHint: 'اپنا موبائل نمبر لکھیں',
    nameLabel: 'آپ کا نام',
    namePlaceholder: 'پورا نام',
    nameHint: 'اختیاری — اگر بتانا چاہیں',

    tripTitle: 'آپ کا سفر',
    tripCaption: 'سفر کی تفصیل',
    routeLabel: 'راستہ',
    routeHint: 'اپنے سفر کا راستہ چنیں',
    routePlaceholder: 'راستہ چنیں...',
    dateLabel: 'سفر کی تاریخ',
    timeLabel: 'روانگی کا وقت',
    dateTimeHint: 'ٹیپ کر کے چنیں — 24 گھنٹے فارمیٹ میں محفوظ، فون پر 12 گھنٹے',
    busNumLabel: 'بس نمبر',
    busNumHint: 'ٹکٹ یا بس کے اندر لکھا نمبر',

    journeyLabel: 'آپ کا سفر',
    departureLabel: 'روانگی',
    busNoLabel: 'بس نمبر',

    whatTitle: 'کیا ہوا؟',
    whatCaption: 'کیا مسئلہ ہوا؟',
    categoryLabel: 'شکایت کی قسم',

    catDriver: 'ڈرائیور',
    catSteward: 'اسٹیورڈ',
    catBus: 'بس کی حالت',
    catFood: 'کھانا / مشروبات',
    catDelay: 'تاخیر / وقت',
    catTicket: 'ٹکٹ / واپسی',
    catOther: 'دیگر / سنگین',
    catSuggestion: 'تجویز / رائے',

    driverEyebrow: 'ڈرائیور · تفصیل',
    driverReckless: 'غیر محتاط / خطرناک ڈرائیونگ',
    driverMobile: 'گاڑی چلاتے ہوئے موبائل استعمال',
    driverRude: 'بدتمیزی',
    driverOther: 'دیگر',
    driverNameLabel: 'ڈرائیور کا نام',
    driverOptional: '(اختیاری)',
    driverNameHint: 'اگر یاد ہو — ٹکٹ یا بس کے اندر لکھا ہوتا ہے',

    stewardEyebrow: 'اسٹیورڈ · تفصیل',
    stewardRude: 'بدتمیزی',
    stewardUnresponsive: 'غیر جوابدہ / مدد نہ کرنا',
    stewardNotServing: 'صحیح خدمت نہ کرنا',
    stewardOther: 'دیگر',
    stewardNameLabel: 'اسٹیورڈ کا نام',
    stewardNameHint: 'اگر یاد ہو — ٹکٹ یا بس کے اندر لکھا ہوتا ہے',
    stewardHeadTitle: 'یہ شکایت بڑے اسٹیورڈ کے بارے میں ہے',
    stewardHeadSub: 'کیا یہ شکایت بڑے اسٹیورڈ کے بارے میں ہے؟',

    busEyebrow: 'بس کی حالت · تفصیل',
    busAC: 'اے سی / حرارت',
    busTablet: 'تفریحی ٹیبلٹ',
    busSeat: 'سیٹ',
    busClean: 'صفائی',

    delayEyebrow: 'تاخیر / وقت · تفصیل',
    delayLate: 'دیر سے روانگی',
    delayArrival: 'دیر سے پہنچنا',
    delayStops: 'ضرورت سے زیادہ اسٹاپ / سست سفر',
    delayOther: 'دیگر',

    sevHigh: 'اعلیٰ ترجیح',
    sevHighRoute: 'انتظامیہ کو بھیجا گیا',
    sevMed: 'درمیانی ترجیح',
    sevMedRoute: 'ٹیم لیڈ کو بھیجا گیا',
    sevLow: 'کم ترجیح',
    sevLowRoute: 'معیاری قطار',

    descLabel: 'تفصیل',
    descPlaceholder: 'کیا ہوا؟ مختصر تفصیل...',
    descHint: 'کیا ہوا؟ مختصر بتائیں',

    photoLabel: 'تصویر',
    photoTap: 'تصویر اپ لوڈ کرنے کے لیے ٹیپ کریں',
    photoSub: 'کیمرہ · گیلری · زیادہ سے زیادہ 5 MB',
    photoError: 'تصویر 5MB سے کم ہونی چاہیے',

    submitBtn: 'شکایت جمع کریں',
    submitting: 'جمع ہو رہا ہے...',
    submitNote: 'حوالہ نمبر فوری بنتا ہے · 24 گھنٹے میں جواب',
    submitError: 'کچھ غلط ہوا۔ براہ کرم دوبارہ کوشش کریں۔',

    errPhone: 'درست پاکستانی نمبر درج کریں (03XX-XXXXXXX)',
    errRoute: 'براہ کرم راستہ چنیں',
    errDate: 'براہ کرم سفر کی تاریخ چنیں',
    errTime: 'براہ کرم روانگی کا وقت چنیں',
    errCategory: 'براہ کرم شکایت کی قسم چنیں',
    errDriverSub: 'براہ کرم بتائیں کیا غلط ہوا',
    errStewardSub: 'براہ کرم بتائیں کیا غلط ہوا',
    errBusSub: 'براہ کرم بتائیں کیا مخصوص مسئلہ ہوا',
    errDelaySub: 'براہ کرم تاخیر کی قسم چنیں',
    errBusNum: 'براہ کرم بس نمبر درج کریں',

    optionalBadge: 'اختیاری',

    confTitle: 'شکایت موصول ہوئی',
    confSub: 'آپ کی شکایت ہمارے پاس پہنچ گئی ہے',
    confReceipt: 'شکایت رسید',
    confRefLabel: 'حوالہ نمبر',
    confScreenshot: 'بعد میں ٹریک کرنے کے لیے اسکرین شاٹ لیں',
    confDate: 'تاریخ',
    confTime: 'وقت',
    confBus: 'بس',
    confNext: 'آگے کیا ہوگا',
    confStep1Title: 'خودکار طور پر ترتیب دیا گیا',
    confStep1Sub: 'چند سیکنڈ میں صحیح ٹیم کو بھیجا گیا',
    confStep2Title: 'ہم تحقیق کرتے ہیں',
    confStep2Sub: '24 گھنٹوں میں، واٹس ایپ پر',
    confStep3Title: 'حل + فالو اپ',
    confStep3Sub: 'اطمینان کی جانچ کے ساتھ',
    confShare: 'شیئر کریں',
    confTrack: 'حالت دیکھیں',
    confScreenshotNote: 'اپنے ریکارڈ کے لیے اس صفحے کا اسکرین شاٹ لیں',
    confBack: '← فارم پر واپس جائیں',
  },
} satisfies Record<Lang, Record<string, string>>

// ── Category / subcategory label key maps ────────────────────

const CAT_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  DRIVER:              'catDriver',
  STEWARD:             'catSteward',
  BUS_CONDITION:       'catBus',
  FOOD_DRINKS:         'catFood',
  DELAY_TIMING:        'catDelay',
  TICKET_REFUND:       'catTicket',
  OTHER_SERIOUS:       'catOther',
  SUGGESTION_FEEDBACK: 'catSuggestion',
}

const DRIVER_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  RECKLESS_DRIVING: 'driverReckless',
  MOBILE_USE:       'driverMobile',
  RUDE_BEHAVIOR:    'driverRude',
  OTHER:            'driverOther',
}

const STEWARD_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  RUDE_BEHAVIOR:        'stewardRude',
  UNRESPONSIVE:         'stewardUnresponsive',
  NOT_SERVING_PROPERLY: 'stewardNotServing',
  OTHER:                'stewardOther',
}

const BUS_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  AC_HEATING:           'busAC',
  ENTERTAINMENT_TABLET: 'busTablet',
  SEAT:                 'busSeat',
  CLEANLINESS:          'busClean',
}

const DELAY_KEY: Record<string, keyof typeof TRANSLATIONS.en> = {
  LATE_DEPARTURE:  'delayLate',
  LATE_ARRIVAL:    'delayArrival',
  EXCESSIVE_STOPS: 'delayStops',
  OTHER:           'delayOther',
}

// ── Constants ────────────────────────────────────────────────

const CATEGORIES: CategoryEntry[] = [
  { value: 'DRIVER',              label: 'Driver',                icon: Car,             severity: 'HIGH'   },
  { value: 'STEWARD',             label: 'Steward',               icon: UserCheck,       severity: 'MEDIUM' },
  { value: 'BUS_CONDITION',       label: 'Bus Condition',         icon: Bus,             severity: 'HIGH'   },
  { value: 'FOOD_DRINKS',         label: 'Food / Drinks',         icon: UtensilsCrossed, severity: 'HIGH'   },
  { value: 'DELAY_TIMING',        label: 'Delay / Timing',        icon: Clock,           severity: 'MEDIUM' },
  { value: 'TICKET_REFUND',       label: 'Ticket / Refund',       icon: Ticket,          severity: 'MEDIUM' },
  { value: 'OTHER_SERIOUS',       label: 'Other / Serious',       icon: AlertTriangle,   severity: 'HIGH'   },
  { value: 'SUGGESTION_FEEDBACK', label: 'Suggestion / Feedback', icon: Lightbulb,       severity: 'LOW', variant: 'suggestion' },
]

const NON_SUGGESTION_COUNT = CATEGORIES.filter(c => !c.variant).length

const BUS_CONDITION_SUBCATEGORIES: BusSubcategoryEntry[] = [
  { value: 'AC_HEATING',           label: 'AC / Heating',         icon: Wind,       severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'ENTERTAINMENT_TABLET', label: 'Entertainment Tablet', icon: Smartphone, severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'SEAT',                 label: 'Seat',                 icon: Armchair,   severity: 'MEDIUM', isMaintenanceRequired: true  },
  { value: 'CLEANLINESS',          label: 'Cleanliness',          icon: Sparkles,   severity: 'HIGH',   isMaintenanceRequired: false },
]

const DELAY_SUBCATEGORIES: SubcategoryEntry[] = [
  { value: 'LATE_DEPARTURE',  label: 'Late Departure',                 icon: Clock      },
  { value: 'LATE_ARRIVAL',    label: 'Late Arrival',                   icon: MapPin     },
  { value: 'EXCESSIVE_STOPS', label: 'Excessive Stops / Slow Journey', icon: Navigation },
  { value: 'OTHER',           label: 'Other',                          icon: HelpCircle },
]

const DRIVER_SUBCATEGORIES: SubcategoryEntry[] = [
  { value: 'RECKLESS_DRIVING', label: 'Reckless / dangerous driving',   icon: AlertTriangle },
  { value: 'MOBILE_USE',       label: 'Mobile phone use while driving', icon: PhoneOff      },
  { value: 'RUDE_BEHAVIOR',    label: 'Rude behavior',                  icon: Frown         },
  { value: 'OTHER',            label: 'Other',                          icon: HelpCircle    },
]

const STEWARD_SUBCATEGORIES: SubcategoryEntry[] = [
  { value: 'RUDE_BEHAVIOR',        label: 'Rude behavior',              icon: Frown      },
  { value: 'UNRESPONSIVE',         label: 'Unresponsive / not helping', icon: UserX      },
  { value: 'NOT_SERVING_PROPERLY', label: 'Not serving properly',       icon: Ban        },
  { value: 'OTHER',                label: 'Other',                      icon: HelpCircle },
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
          0.85,
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ── UI primitives ─────────────────────────────────────────────

function SectionHeader({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-[#C9C0A8] pb-2 mb-4">
      <h2 className="text-[18px] font-semibold leading-tight">{title}</h2>
      <p className="text-[11px] italic text-[#9AA59C] ml-3 shrink-0">{caption}</p>
    </div>
  )
}

function FieldLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-[13px] font-semibold">{children}</label>
      {required && <span className="text-destructive text-xs leading-none">*</span>}
      {optional && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-none">
          {optional}
        </span>
      )}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] text-[#9AA59C] mt-1.5">{children}</p>
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-destructive mt-1">{msg}</p>
}

function SubcategoryReveal({ eyebrow, error, children }: { eyebrow: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-[18px] p-4 animate-in slide-in-from-top-1 duration-200 ease-out">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA59C] mb-3">{eyebrow}</p>
      {children}
      <FieldError msg={error} />
    </div>
  )
}

function SubPill({
  sub, label, selected, onClick,
}: {
  sub: SubcategoryEntry | BusSubcategoryEntry
  label: string
  selected: boolean
  onClick: () => void
}) {
  const Icon = sub.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-row items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all min-h-[76px] text-left',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_hsl(167_71%_21%/0.28)]'
          : 'border-input bg-card text-foreground active:bg-muted',
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-md flex items-center justify-center shrink-0',
        selected ? 'bg-white/20' : 'bg-muted',
      )}>
        <Icon size={17} className={selected ? 'text-primary-foreground' : 'text-primary'} />
      </div>
      <span className="text-[13px] font-medium leading-tight">{label}</span>
    </button>
  )
}

function SeverityBar({ severity, label, routing }: { severity: 'HIGH' | 'MEDIUM' | 'LOW'; label: string; routing: string }) {
  const filled = severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1
  const pip    = severity === 'HIGH' ? 'bg-destructive' : severity === 'MEDIUM' ? 'bg-[#B47339]' : 'bg-primary'
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-xl">
      <div className="flex gap-1 shrink-0">
        {[1, 2, 3].map(n => (
          <div key={n} className={cn('w-[7px] h-[18px] rounded-sm', n <= filled ? pip : 'bg-[#E1D9C5]')} />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold leading-none">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{routing}</p>
      </div>
      <span className="font-mono-brand text-[9px] font-bold bg-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
        AUTO
      </span>
    </div>
  )
}

function parseRouteName(name: string) {
  const sep   = name.match(/\s*[-–→]\s*/)
  if (!sep) return { fromCode: CITY_CODES[name] ?? name.slice(0, 3).toUpperCase(), from: name, toCode: '---', to: '' }
  const parts = name.split(sep[0])
  const from  = (parts[0] ?? '').trim()
  const to    = (parts[1] ?? '').trim()
  const code  = (s: string) => CITY_CODES[s] ?? (s.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || '???')
  return { fromCode: code(from), from, toCode: code(to), to }
}

function JourneyStrip({ routeName, travelDate, departureTime, busNumber, labels }: {
  routeName: string; travelDate: string; departureTime: string; busNumber: string
  labels: { journey: string; departure: string; busNo: string }
}) {
  const route = routeName ? parseRouteName(routeName) : null
  const displayDate = travelDate
    ? new Date(travelDate + 'T00:00:00')
        .toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
        .toUpperCase()
    : '— — —'
  return (
    <div className="rounded-[18px] bg-card border border-[#E1D9C5] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#9AA59C]">{labels.journey}</p>
        <p className="font-mono-brand text-[10px] text-[#9AA59C]">{displayDate}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-1">
        <div>
          <p className="text-[26px] font-bold leading-none tabular-nums">
            {route ? route.fromCode : '---'}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-tight truncate">
            {route ? route.from : 'Origin'}
          </p>
        </div>
        <div className="flex items-center gap-1 px-1">
          <div className="w-7 border-t border-dashed border-[#C9C0A8]" />
          <span className="text-[26px] font-bold leading-none">→</span>
          <div className="w-7 border-t border-dashed border-[#C9C0A8]" />
        </div>
        <div className="text-right">
          <p className="text-[26px] font-bold leading-none tabular-nums">
            {route ? route.toCode : '---'}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-tight truncate">
            {route ? route.to : 'Destination'}
          </p>
        </div>
      </div>
      {/* Perforation */}
      <div className="relative flex items-center my-3">
        <div className="absolute -left-3 w-6 h-6 rounded-full bg-background border border-[#E1D9C5]" />
        <div className="w-full border-t border-dashed border-[#C9C0A8] mx-3" />
        <div className="absolute -right-3 w-6 h-6 rounded-full bg-background border border-[#E1D9C5]" />
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#9AA59C] mb-0.5">{labels.departure}</p>
          <p className="font-mono-brand text-[13px] font-medium">{departureTime || '--:--'}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-[#9AA59C] mb-0.5">{labels.busNo}</p>
          <p className="font-mono-brand text-[13px] font-medium">{busNumber || '—'}</p>
        </div>
      </div>
    </div>
  )
}

// ── Confirmation-screen primitives ────────────────────────────

function SerrationEdge({ flip }: { flip?: boolean }) {
  const pts = Array.from({ length: 21 }, (_, i) => `${i * 5},${i % 2 === 0 ? (flip ? 0 : 10) : (flip ? 10 : 0)}`).join(' ')
  return (
    <svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" className="block w-full">
      <polyline points={pts} fill="hsl(38 32% 93%)" stroke="hsl(42 28% 83%)" strokeWidth="0.4" />
    </svg>
  )
}

function Barcode({ value }: { value: string }) {
  const segs: { w: number; dark: boolean }[] = []
  for (const ch of value) {
    const c = ch.charCodeAt(0)
    segs.push({ w: (c % 3) + 1, dark: true  })
    segs.push({ w: (c % 2) + 1, dark: false })
  }
  return (
    <div className="flex items-stretch gap-[1.5px] h-8 justify-center overflow-hidden">
      {segs.map((s, i) => (
        <div key={i} style={{ width: `${s.w * 3}px` }} className={s.dark ? 'bg-foreground rounded-[1px]' : ''} />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function ComplaintForm({ routes }: Props) {
  const searchParams = useSearchParams()

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

  // ── Language ─────────────────────────────────────────────

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return (localStorage.getItem('subhan-lang') as Lang) ?? 'en'
  })

  const isRtl = lang === 'ur'
  const t = (k: keyof typeof TRANSLATIONS.en) => TRANSLATIONS[lang][k]

  function toggleLang() {
    const next: Lang = lang === 'en' ? 'ur' : 'en'
    setLang(next)
    localStorage.setItem('subhan-lang', next)
  }

  // ── Form state ───────────────────────────────────────────

  const [phone,                   setPhone]                   = useState('')
  const [routeId,                 setRouteId]                 = useState(initialRouteId)
  const [travelDate,              setTravelDate]              = useState('')
  const [departureTime,           setDepartureTime]           = useState(qrTime)
  const [busNumber,               setBusNumber]               = useState(qrBus)
  const [category,                setCategory]                = useState('')
  const [busConditionSubcategory, setBusConditionSubcategory] = useState('')
  const [delaySubcategory,        setDelaySubcategory]        = useState('')
  const [driverSubcategory,       setDriverSubcategory]       = useState('')
  const [stewardSubcategory,      setStewardSubcategory]      = useState('')
  const [driverName,              setDriverName]              = useState('')
  const [stewardName,             setStewardName]             = useState('')
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
      setErrors(prev => ({ ...prev, photo: t('photoError') }))
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

  function handleCategorySelect(val: string) {
    setCategory(val)
    setBusConditionSubcategory('')
    setDelaySubcategory('')
    setDriverSubcategory('')
    setStewardSubcategory('')
    setDriverName('')
    setStewardName('')
    setIsAboutStewardHead(false)
    if (errors.category) setErrors(prev => ({ ...prev, category: '' }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!validatePhone(phone))
      e.phone = t('errPhone')
    if (!routeId)
      e.routeId = t('errRoute')
    if (!travelDate)
      e.travelDate = t('errDate')
    if (!departureTime)
      e.departureTime = t('errTime')
    if (!category)
      e.category = t('errCategory')
    if (category === 'DRIVER' && !driverSubcategory)
      e.driverSubcategory = t('errDriverSub')
    if (category === 'STEWARD' && !stewardSubcategory)
      e.stewardSubcategory = t('errStewardSub')
    if (category === 'BUS_CONDITION' && !busConditionSubcategory)
      e.busConditionSubcategory = t('errBusSub')
    if (category === 'DELAY_TIMING' && !delaySubcategory)
      e.delaySubcategory = t('errDelaySub')
    if (!busNumber.trim())
      e.busNumber = t('errBusNum')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const supabase = createClient()

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

    const cat = CATEGORIES.find(c => c.value === category)!
    const flagStewardHead = category === 'STEWARD' && (isAboutStewardHead || containsStewardHeadKeyword(description))

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
      p_delay_subcategory:         category === 'DELAY_TIMING'  ? delaySubcategory   || null : null,
      p_driver_subcategory:        category === 'DRIVER'        ? driverSubcategory  || null : null,
      p_steward_subcategory:       category === 'STEWARD'       ? stewardSubcategory || null : null,
      p_driver_name:               category === 'DRIVER'        ? driverName.trim()  || null : null,
      p_steward_name:              category === 'STEWARD'       ? stewardName.trim() || null : null,
    })

    const complaint = Array.isArray(data) ? data[0] : data

    if (error || !complaint) {
      console.error('submit_complaint error:', error)
      setErrors({ submit: t('submitError') })
      setSubmitting(false)
      return
    }

    void fetch('/api/notify-complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: complaint.id }),
    }).catch(() => {})

    setConfirmation({
      referenceNumber: complaint.reference_number,
      routeName:       routes.find(r => r.id === routeId)?.name ?? '',
      travelDate,
      departureTime,
      busNumber:       busNumber.trim() || 'Not provided',
    })
    setSubmitting(false)
  }

  // ── Derived ───────────────────────────────────────────────

  let computedSeverity: 'HIGH' | 'MEDIUM' | 'LOW' | null = null
  if (category) {
    const cat = CATEGORIES.find(c => c.value === category)
    if (cat) {
      computedSeverity = cat.severity
      if (category === 'BUS_CONDITION' && busConditionSubcategory) {
        const sub = BUS_CONDITION_SUBCATEGORIES.find(s => s.value === busConditionSubcategory)
        if (sub) computedSeverity = sub.severity
      }
    }
  }

  const sevLabel   = computedSeverity === 'HIGH' ? t('sevHigh') : computedSeverity === 'MEDIUM' ? t('sevMed') : t('sevLow')
  const sevRouting = computedSeverity === 'HIGH' ? t('sevHighRoute') : computedSeverity === 'MEDIUM' ? t('sevMedRoute') : t('sevLowRoute')

  // ── Confirmation screen ──────────────────────────────────

  if (confirmation) {
    const route = parseRouteName(confirmation.routeName)
    const fmtDate = confirmation.travelDate
      ? new Date(confirmation.travelDate + 'T00:00:00')
          .toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
    const fmtDateShort = confirmation.travelDate
      ? new Date(confirmation.travelDate + 'T00:00:00')
          .toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }).toUpperCase()
      : '—'

    const confSteps = [
      { done: true,  title: t('confStep1Title'), sub: t('confStep1Sub') },
      { done: false, title: t('confStep2Title'), sub: t('confStep2Sub') },
      { done: false, title: t('confStep3Title'), sub: t('confStep3Sub') },
    ]

    return (
      <div
        dir={isRtl ? 'rtl' : undefined}
        className="min-h-screen bg-background flex flex-col items-center px-4 py-10"
      >

        {/* Check mark */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border border-primary/15" />
          <div className="absolute w-[68px] h-[68px] rounded-full border border-primary/25" />
          <div className="relative w-[56px] h-[56px] rounded-full bg-primary flex items-center justify-center z-10">
            <Check size={26} className="text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-[26px] font-semibold tracking-tight mb-1">{t('confTitle')}</h1>
        <p className="text-[13px] text-muted-foreground mb-8 text-center">
          {t('confSub')}
        </p>

        {/* Receipt card */}
        <div className="w-full max-w-sm">
          <SerrationEdge />
          <div className="bg-card border-x border-[#E1D9C5] px-5">

            {/* Brand row */}
            <div className="flex items-center justify-between py-4 border-b border-[#E1D9C5]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bus size={14} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.08em] uppercase leading-none">SUBHAN TRAVELS</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">{t('confReceipt')}</p>
                </div>
              </div>
              <p className="font-mono-brand text-[10px] text-muted-foreground">{fmtDate.toUpperCase()}</p>
            </div>

            {/* Route viz */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4">
              <div>
                <p className="text-[24px] font-bold leading-none">{route.fromCode}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight truncate">{route.from}</p>
              </div>
              <div className="flex items-center gap-1 text-[#9AA59C]">
                <div className="w-6 border-t border-dashed border-[#C9C0A8]" />
                <Bus size={13} className="text-primary shrink-0" />
                <div className="w-6 border-t border-dashed border-[#C9C0A8]" />
              </div>
              <div className="text-right">
                <p className="text-[24px] font-bold leading-none">{route.toCode}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight truncate">{route.to}</p>
              </div>
            </div>

            {/* Perforation */}
            <div className="relative flex items-center my-1">
              <div className="absolute -left-5 w-9 h-9 rounded-full bg-background border border-[#E1D9C5]" />
              <div className="flex-1 border-t border-dashed border-[#C9C0A8] mx-5" />
              <div className="absolute -right-5 w-9 h-9 rounded-full bg-background border border-[#E1D9C5]" />
            </div>

            {/* Reference block */}
            <div className="text-center py-5">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#9AA59C] mb-1.5">{t('confRefLabel')}</p>
              <p className="font-mono-brand text-[26px] font-bold text-primary tracking-widest leading-none">
                {confirmation.referenceNumber}
              </p>
              <p className="text-[11px] italic text-[#9AA59C] mt-2">{t('confScreenshot')}</p>
            </div>

            {/* Trip details */}
            <div className="grid grid-cols-3 gap-2 pb-4 text-center">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#9AA59C] mb-0.5">{t('confDate')}</p>
                <p className="font-mono-brand text-[11px] font-medium">{fmtDateShort}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#9AA59C] mb-0.5">{t('confTime')}</p>
                <p className="font-mono-brand text-[11px] font-medium">{confirmation.departureTime || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[#9AA59C] mb-0.5">{t('confBus')}</p>
                <p className="font-mono-brand text-[11px] font-medium">{confirmation.busNumber}</p>
              </div>
            </div>

            {/* Barcode */}
            <div className="pb-5">
              <Barcode value={confirmation.referenceNumber} />
              <p className="font-mono-brand text-[9px] tracking-[0.3em] text-center text-[#9AA59C] mt-1.5">
                {confirmation.referenceNumber}
              </p>
            </div>

          </div>
          <SerrationEdge flip />
        </div>

        {/* What happens next */}
        <div className="w-full max-w-sm mt-6 bg-muted rounded-[18px] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA59C] mb-4">{t('confNext')}</p>
          <div className="relative">
            <div className="absolute left-[13px] top-7 bottom-7 w-px bg-border" />
            {confSteps.map((step, i) => (
              <div key={i} className={cn('flex gap-3', i < 2 && 'pb-5')}>
                <div className={cn(
                  'relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  step.done ? 'bg-primary' : 'bg-card border border-border',
                )}>
                  {step.done
                    ? <Check size={13} className="text-primary-foreground" />
                    : <span className="text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                  }
                </div>
                <div className="pt-0.5">
                  <p className="text-[13px] font-semibold leading-tight">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-sm mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ text: `My Subhan Travels complaint ref: ${confirmation.referenceNumber}` }).catch(() => {})
              }
            }}
            className="h-[50px] rounded-xl border-2 border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share size={16} />
            {t('confShare')}
          </button>
          <a
            href={`/status/${confirmation.referenceNumber}`}
            className="h-[50px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            {t('confTrack')}
            <ChevronRight size={16} />
          </a>
        </div>

        <p className="text-center text-xs text-[#9AA59C] mt-3 mb-1">
          {t('confScreenshotNote')}
        </p>

        <button
          type="button"
          onClick={() => setConfirmation(null)}
          className="text-sm underline text-muted-foreground mt-1"
        >
          {t('confBack')}
        </button>

      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────

  return (
    <div dir={isRtl ? 'rtl' : undefined} className="min-h-screen bg-background overflow-x-hidden">

      {/* Trust strip */}
      <div className="bg-primary text-primary-foreground flex items-center justify-center gap-2 h-10 px-4 text-xs font-medium">
        <Shield size={13} className="shrink-0" />
        <span>{t('trustStrip')}</span>
      </div>

      {/* Hero */}
      <div className="w-full max-w-lg mx-auto px-5 pt-5 pb-1">

        {/* Language toggle */}
        <div className={cn('flex mb-3', isRtl ? 'justify-start' : 'justify-end')}>
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-input bg-card text-[12px] font-medium text-muted-foreground active:bg-muted transition-colors"
          >
            <span className={cn(lang === 'ur' ? 'text-foreground font-semibold' : '')}>اردو</span>
            <span className="text-[#C9C0A8]">|</span>
            <span className={cn(lang === 'en' ? 'text-foreground font-semibold' : '')}>English</span>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Bus size={20} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold tracking-[0.06em] uppercase leading-tight">SUBHAN TRAVELS</p>
            <p className="text-[12px] text-muted-foreground leading-tight">{t('subLine')}</p>
          </div>
          <div className="border-l border-dashed border-[#C9C0A8] pl-3 text-right shrink-0">
            <p className="text-[9px] font-bold tracking-widest uppercase text-[#9AA59C]">EST</p>
            <p className="font-mono-brand text-[13px] font-bold leading-tight">2014</p>
          </div>
        </div>
        <h1 className="text-[30px] font-semibold tracking-tight leading-tight">{t('heroTitle')}</h1>
        <p className="text-[13px] text-muted-foreground mt-1">{t('heroSubtitle')}</p>
        <p className="text-[12px] italic text-[#9AA59C] mt-0.5">{t('heroHint')}</p>
      </div>

      {/* Form */}
      <form id="cf" onSubmit={handleSubmit} noValidate className="w-full max-w-lg mx-auto px-5 pb-32">

        {/* ── Section: Your contact ─────────────────────── */}
        <div className="pt-6">
          <SectionHeader title={t('contactTitle')} caption={t('contactCaption')} />
          <div className="space-y-4">

            {/* Phone */}
            <div>
              <FieldLabel required>{t('phoneLabel')}</FieldLabel>
              <input
                dir="ltr"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="03XX-XXXXXXX"
                className={cn(
                  'w-full h-[52px] px-4 rounded-xl border bg-card text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary',
                  errors.phone ? 'border-destructive' : 'border-input',
                )}
              />
              <Hint>{t('phoneHint')}</Hint>
              <FieldError msg={errors.phone} />
            </div>

            {/* Passenger Name */}
            <div>
              <FieldLabel optional={t('optionalBadge')}>{t('nameLabel')}</FieldLabel>
              <input
                dir="ltr"
                type="text"
                value={passengerName}
                onChange={e => setPassengerName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full h-[52px] px-4 rounded-xl border border-input bg-card text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
              />
              <Hint>{t('nameHint')}</Hint>
            </div>

          </div>
        </div>

        {/* ── Section: Your trip ───────────────────────── */}
        <div className="pt-8">
          <SectionHeader title={t('tripTitle')} caption={t('tripCaption')} />

          <JourneyStrip
            routeName={routes.find(r => r.id === routeId)?.name ?? ''}
            travelDate={travelDate}
            departureTime={departureTime}
            busNumber={busNumber}
            labels={{ journey: t('journeyLabel'), departure: t('departureLabel'), busNo: t('busNoLabel') }}
          />

          <div className="space-y-4 mt-4">

            {/* Route */}
            <div>
              <FieldLabel required>{t('routeLabel')}</FieldLabel>
              <div className={cn(
                'relative h-[52px] rounded-xl border bg-card overflow-hidden',
                errors.routeId ? 'border-destructive' : 'border-input',
              )}>
                <Bus size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <select
                  dir="ltr"
                  value={routeId}
                  onChange={handleRouteChange}
                  className="w-full h-full pl-10 pr-4 bg-transparent text-base focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                >
                  <option value="">{t('routePlaceholder')}</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <Hint>{t('routeHint')}</Hint>
              <FieldError msg={errors.routeId} />
            </div>

            {/* Travel Date + Departure Time */}
            <div className="grid grid-cols-[1.2fr_1fr] gap-3">
              <div>
                <FieldLabel required>{t('dateLabel')}</FieldLabel>
                <div className={cn(
                  'h-[52px] rounded-xl border bg-card overflow-hidden',
                  errors.travelDate ? 'border-destructive' : 'border-input',
                )}>
                  <input
                    dir="ltr"
                    type="date"
                    value={travelDate}
                    min={getMinDateStr()}
                    max={getTodayStr()}
                    onChange={e => {
                      setTravelDate(e.target.value)
                      if (errors.travelDate) setErrors(prev => ({ ...prev, travelDate: '' }))
                    }}
                    className="w-full h-full px-3 bg-transparent text-base appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <FieldError msg={errors.travelDate} />
              </div>
              <div>
                <FieldLabel required>{t('timeLabel')}</FieldLabel>
                <div className={cn(
                  'relative h-[52px] rounded-xl border bg-card overflow-hidden',
                  errors.departureTime ? 'border-destructive' : 'border-input',
                )}>
                  <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    dir="ltr"
                    type="time"
                    value={departureTime}
                    onChange={e => {
                      setDepartureTime(e.target.value)
                      if (errors.departureTime) setErrors(prev => ({ ...prev, departureTime: '' }))
                    }}
                    className="w-full h-full pl-8 pr-2 bg-transparent text-base appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <FieldError msg={errors.departureTime} />
              </div>
            </div>
            <Hint>{t('dateTimeHint')}</Hint>

            {/* Bus Number */}
            <div>
              <FieldLabel required>{t('busNumLabel')}</FieldLabel>
              <div className={cn(
                'relative h-[52px] rounded-xl border bg-card overflow-hidden',
                errors.busNumber ? 'border-destructive' : 'border-input',
              )}>
                <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  dir="ltr"
                  type="text"
                  value={busNumber}
                  onChange={e => {
                    setBusNumber(e.target.value)
                    if (errors.busNumber) setErrors(prev => ({ ...prev, busNumber: '' }))
                  }}
                  placeholder="e.g. 47"
                  className="w-full h-full pl-9 pr-4 bg-transparent text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
                />
              </div>
              <Hint>{t('busNumHint')}</Hint>
              <FieldError msg={errors.busNumber} />
            </div>

          </div>
        </div>

        {/* ── Section: What happened? ───────────────────── */}
        <div className="pt-8">
          <SectionHeader title={t('whatTitle')} caption={t('whatCaption')} />
          <div className="space-y-4">

            {/* Category grid */}
            <div>
              <FieldLabel required>{t('categoryLabel')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat, i) => {
                  const Icon         = cat.icon
                  const selected     = category === cat.value
                  const isSugg       = cat.variant === 'suggestion'
                  const isWide       = isSugg || (!isSugg && i === NON_SUGGESTION_COUNT - 1 && NON_SUGGESTION_COUNT % 2 !== 0)
                  const selClass     = isSugg
                    ? 'bg-[#B47339] border-[#B47339] text-white shadow-[0_6px_16px_#B4733940]'
                    : 'bg-primary border-primary text-primary-foreground shadow-[0_6px_16px_hsl(167_71%_21%/0.25)]'
                  const unselClass   = isSugg
                    ? 'border-[#F2E4CF] bg-[#F2E4CF] text-[#B47339]'
                    : 'border-input bg-card text-foreground active:bg-muted'
                  const catLabel = t(CAT_KEY[cat.value])
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategorySelect(cat.value)}
                      className={cn(
                        'relative flex flex-col items-start justify-end p-3 rounded-[18px] border-2 transition-all min-h-[92px]',
                        isWide && 'col-span-2',
                        selected ? selClass : unselClass,
                      )}
                    >
                      {selected && (
                        <div className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-white/25 flex items-center justify-center">
                          <Check size={10} />
                        </div>
                      )}
                      <div className={cn(
                        'w-[38px] h-[38px] rounded-md flex items-center justify-center mb-2',
                        selected ? 'bg-white/20' : 'bg-muted',
                      )}>
                        <Icon size={20} className={selected ? undefined : 'text-primary'} />
                      </div>
                      <span className="text-[13.5px] font-semibold leading-tight">{catLabel}</span>
                    </button>
                  )
                })}
              </div>
              <FieldError msg={errors.category} />
            </div>

            {/* Driver subcategory */}
            {category === 'DRIVER' && (
              <SubcategoryReveal eyebrow={t('driverEyebrow')} error={errors.driverSubcategory}>
                <div className="grid grid-cols-2 gap-2.5">
                  {DRIVER_SUBCATEGORIES.map(sub => (
                    <SubPill
                      key={sub.value}
                      sub={sub}
                      label={t(DRIVER_KEY[sub.value])}
                      selected={driverSubcategory === sub.value}
                      onClick={() => {
                        setDriverSubcategory(sub.value)
                        if (errors.driverSubcategory) setErrors(prev => ({ ...prev, driverSubcategory: '' }))
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-[13px] font-semibold mb-1.5">
                    {t('driverNameLabel')} <span className="text-muted-foreground font-normal text-xs">{t('driverOptional')}</span>
                  </label>
                  <input
                    dir="ltr"
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="e.g. Muhammad Ahmed"
                    className="w-full h-[52px] px-4 rounded-xl border border-input bg-card text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
                  />
                  <p className="text-[11.5px] text-[#9AA59C] mt-1.5">{t('driverNameHint')}</p>
                </div>
              </SubcategoryReveal>
            )}

            {/* Steward subcategory + head flag */}
            {category === 'STEWARD' && (
              <SubcategoryReveal eyebrow={t('stewardEyebrow')} error={errors.stewardSubcategory}>
                <div className="grid grid-cols-2 gap-2.5">
                  {STEWARD_SUBCATEGORIES.map(sub => (
                    <SubPill
                      key={sub.value}
                      sub={sub}
                      label={t(STEWARD_KEY[sub.value])}
                      selected={stewardSubcategory === sub.value}
                      onClick={() => {
                        setStewardSubcategory(sub.value)
                        if (errors.stewardSubcategory) setErrors(prev => ({ ...prev, stewardSubcategory: '' }))
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-[13px] font-semibold mb-1.5">
                    {t('stewardNameLabel')} <span className="text-muted-foreground font-normal text-xs">{t('driverOptional')}</span>
                  </label>
                  <input
                    dir="ltr"
                    type="text"
                    value={stewardName}
                    onChange={e => setStewardName(e.target.value)}
                    placeholder="e.g. Ali Hassan"
                    className="w-full h-[52px] px-4 rounded-xl border border-input bg-card text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
                  />
                  <p className="text-[11.5px] text-[#9AA59C] mt-1.5">{t('stewardNameHint')}</p>
                </div>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
                  <input
                    id="steward-head-flag"
                    type="checkbox"
                    checked={isAboutStewardHead}
                    onChange={e => setIsAboutStewardHead(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-primary"
                  />
                  <label htmlFor="steward-head-flag" className="text-sm text-amber-900">
                    <span className="font-semibold block">{t('stewardHeadTitle')}</span>
                    <span className="text-xs text-amber-700">{t('stewardHeadSub')}</span>
                  </label>
                </div>
              </SubcategoryReveal>
            )}

            {/* Bus Condition subcategory */}
            {category === 'BUS_CONDITION' && (
              <SubcategoryReveal eyebrow={t('busEyebrow')} error={errors.busConditionSubcategory}>
                <div className="grid grid-cols-2 gap-2.5">
                  {BUS_CONDITION_SUBCATEGORIES.map(sub => (
                    <SubPill
                      key={sub.value}
                      sub={sub}
                      label={t(BUS_KEY[sub.value])}
                      selected={busConditionSubcategory === sub.value}
                      onClick={() => {
                        setBusConditionSubcategory(sub.value)
                        if (errors.busConditionSubcategory)
                          setErrors(prev => ({ ...prev, busConditionSubcategory: '' }))
                      }}
                    />
                  ))}
                </div>
              </SubcategoryReveal>
            )}

            {/* Delay subcategory */}
            {category === 'DELAY_TIMING' && (
              <SubcategoryReveal eyebrow={t('delayEyebrow')} error={errors.delaySubcategory}>
                <div className="grid grid-cols-2 gap-2.5">
                  {DELAY_SUBCATEGORIES.map(sub => (
                    <SubPill
                      key={sub.value}
                      sub={sub}
                      label={t(DELAY_KEY[sub.value])}
                      selected={delaySubcategory === sub.value}
                      onClick={() => {
                        setDelaySubcategory(sub.value)
                        if (errors.delaySubcategory)
                          setErrors(prev => ({ ...prev, delaySubcategory: '' }))
                      }}
                    />
                  ))}
                </div>
              </SubcategoryReveal>
            )}

            {/* Severity bar */}
            {computedSeverity && (
              <SeverityBar severity={computedSeverity} label={sevLabel} routing={sevRouting} />
            )}

            {/* Description */}
            <div>
              <FieldLabel optional={t('optionalBadge')}>{t('descLabel')}</FieldLabel>
              <textarea
                dir="ltr"
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 500))}
                placeholder={t('descPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-input bg-card text-base focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-[11.5px] text-[#9AA59C]">{t('descHint')}</p>
                <p className="text-[11.5px] text-[#9AA59C]">{description.length}/500</p>
              </div>
            </div>

            {/* Photo */}
            <div>
              <FieldLabel optional={t('optionalBadge')}>{t('photoLabel')}</FieldLabel>
              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/75 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[84px] rounded-xl border-2 border-dashed border-[#C9C0A8] bg-card flex items-center justify-center gap-3 text-muted-foreground active:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Camera size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium">{t('photoTap')}</p>
                    <p className="text-[11px] text-[#9AA59C]">{t('photoSub')}</p>
                  </div>
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
              <FieldError msg={errors.photo} />
            </div>

            {errors.submit && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
                {errors.submit}
              </div>
            )}

          </div>
        </div>

      </form>

      {/* Fixed submit dock */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg mx-auto px-5 pb-5 pt-8"
             style={{ background: 'linear-gradient(to bottom, transparent, hsl(38 32% 93%) 38%)' }}>
          <button
            type="submit"
            form="cf"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
          >
            {submitting ? t('submitting') : (
              <>
                {t('submitBtn')}
                <ChevronRight size={18} />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-[#9AA59C] mt-2">
            {t('submitNote')}
          </p>
        </div>
      </div>

    </div>
  )
}
