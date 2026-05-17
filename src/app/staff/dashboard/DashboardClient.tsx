'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, RefreshCw, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Route = { id: string; name: string }

type Complaint = {
  id: string
  reference_number: string
  created_at: string
  route_id: string | null
  bus_number: string | null
  category: string
  bus_condition_subcategory: string | null
  delay_subcategory: string | null
  driver_subcategory: string | null
  steward_subcategory: string | null
  driver_name: string | null
  steward_name: string | null
  severity: string
  status: string
  is_about_steward_head: boolean
  routes: { name: string } | null
}

type Stats = {
  open: number
  investigating: number
  resolvedThisWeek: number
  avgResolutionHours: number | null
}

type StatusFilter   = 'ALL' | 'ACTIVE' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED'
type SeverityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'
type CategoryFilter = 'ALL' | 'DRIVER' | 'STEWARD' | 'BUS_CONDITION' | 'FOOD_DRINKS' | 'DELAY_TIMING' | 'TICKET_REFUND' | 'OTHER_SERIOUS' | 'SUGGESTION_FEEDBACK'
type DateRangeFilter = '7d' | '30d' | 'month' | 'all'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'ALL',                label: 'All Categories'        },
  { value: 'DRIVER',             label: 'Driver'                },
  { value: 'STEWARD',            label: 'Steward'               },
  { value: 'BUS_CONDITION',      label: 'Bus Condition'         },
  { value: 'FOOD_DRINKS',        label: 'Food / Drinks'         },
  { value: 'DELAY_TIMING',       label: 'Delay / Timing'        },
  { value: 'TICKET_REFUND',      label: 'Ticket / Refund'       },
  { value: 'OTHER_SERIOUS',      label: 'Other / Serious'       },
  { value: 'SUGGESTION_FEEDBACK', label: 'Suggestion / Feedback' },
]

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

const STATUS_LABELS: Record<string, string> = {
  OPEN:          'Open',
  INVESTIGATING: 'Investigating',
  RESOLVED:      'Resolved',
  CLOSED:        'Closed',
  ARCHIVED:      'Archived',
}

const SEVERITY_COLORS: Record<string, string> = {
  HIGH:   'bg-red-100 text-red-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW:    'bg-green-100 text-green-800',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN:          'bg-blue-100 text-blue-800',
  INVESTIGATING: 'bg-amber-100 text-amber-800',
  RESOLVED:      'bg-green-100 text-green-800',
  CLOSED:        'bg-gray-100 text-gray-700',
  ARCHIVED:      'bg-gray-100 text-gray-500',
}

const PAGE_SIZE = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000
}

function formatAge(hours: number): string {
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${Math.floor(hours)}h ago`
  const d = Math.floor(hours / 24)
  const h = Math.floor(hours % 24)
  return h > 0 ? `${d}d ${h}h ago` : `${d}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function subcategoryLabel(complaint: Complaint): string | null {
  if (complaint.bus_condition_subcategory) {
    const map: Record<string, string> = {
      AC_HEATING:           'AC / Heating',
      ENTERTAINMENT_TABLET: 'Entertainment Tablet',
      SEAT:                 'Seat',
      CLEANLINESS:          'Cleanliness',
    }
    return map[complaint.bus_condition_subcategory] ?? complaint.bus_condition_subcategory
  }
  if (complaint.delay_subcategory) {
    const map: Record<string, string> = {
      LATE_DEPARTURE:  'Late Departure',
      LATE_ARRIVAL:    'Late Arrival',
      EXCESSIVE_STOPS: 'Excessive Stops',
    }
    return map[complaint.delay_subcategory] ?? complaint.delay_subcategory
  }
  if (complaint.driver_subcategory) {
    const map: Record<string, string> = {
      RECKLESS_DRIVING: 'Reckless driving',
      MOBILE_USE:       'Mobile use',
      RUDE_BEHAVIOR:    'Rude behavior',
      OTHER:            'Other',
    }
    return map[complaint.driver_subcategory] ?? complaint.driver_subcategory
  }
  if (complaint.steward_subcategory) {
    const map: Record<string, string> = {
      RUDE_BEHAVIOR:        'Rude behavior',
      UNRESPONSIVE:         'Unresponsive',
      NOT_SERVING_PROPERLY: 'Not serving properly',
      OTHER:                'Other',
    }
    return map[complaint.steward_subcategory] ?? complaint.steward_subcategory
  }
  return null
}

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  userName: string
  userRole: 'ADMIN' | 'STEWARD_HEAD'
  routes: Route[]
}

export default function DashboardClient({ userName, userRole, routes }: Props) {
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // ── Filters ──
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('ACTIVE')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [routeFilter,    setRouteFilter]    = useState<string>('ALL')
  const [dateRange,      setDateRange]      = useState<DateRangeFilter>('all')
  const [showArchived,   setShowArchived]   = useState(false)
  const [page,           setPage]           = useState(0)

  // ── Data ──
  const [stats,       setStats]       = useState<Stats>({ open: 0, investigating: 0, resolvedThisWeek: 0, avgResolutionHours: null })
  const [complaints,  setComplaints]  = useState<Complaint[]>([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [loading,     setLoading]     = useState(true)

  // ── Logout ──
  async function handleLogout() {
    await fetch('/auth/logout', { method: 'POST', redirect: 'manual' })
    router.push('/login')
    router.refresh()
  }

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    const [openRes, invRes, resolvedRes] = await Promise.all([
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'INVESTIGATING'),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'RESOLVED').gte('resolved_at', weekAgo),
    ])

    // Average resolution time: sample recent resolved/closed complaints
    const { data: resolvedSample } = await supabase
      .from('complaints')
      .select('created_at, resolved_at')
      .in('status', ['RESOLVED', 'CLOSED'])
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(100)

    let avgHours: number | null = null
    if (resolvedSample && resolvedSample.length > 0) {
      const total = resolvedSample.reduce((sum, c) => {
        const diff = (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / 3_600_000
        return sum + diff
      }, 0)
      avgHours = Math.round(total / resolvedSample.length)
    }

    setStats({
      open:              openRes.count     ?? 0,
      investigating:     invRes.count      ?? 0,
      resolvedThisWeek:  resolvedRes.count ?? 0,
      avgResolutionHours: avgHours,
    })
  }, [supabase])

  // ── Fetch complaints list ──
  const fetchComplaints = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('complaints')
      .select(
        'id, reference_number, created_at, route_id, bus_number, category, bus_condition_subcategory, delay_subcategory, driver_subcategory, steward_subcategory, driver_name, steward_name, severity, status, is_about_steward_head, routes(name)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    // STEWARD_HEAD extra guard (RLS also enforces this)
    if (userRole === 'STEWARD_HEAD') {
      query = query.eq('is_about_steward_head', false)
    }

    // Archived toggle
    if (!showArchived) {
      query = query.neq('status', 'ARCHIVED')
    }

    if (statusFilter === 'ACTIVE') query = query.in('status', ['OPEN', 'INVESTIGATING'])
    else if (statusFilter !== 'ALL') query = query.eq('status', statusFilter)
    if (severityFilter !== 'ALL') query = query.eq('severity', severityFilter)
    if (categoryFilter !== 'ALL') query = query.eq('category', categoryFilter)
    if (routeFilter    !== 'ALL') query = query.eq('route_id', routeFilter)

    if (dateRange !== 'all') {
      const now = new Date()
      const fromDate =
        dateRange === '7d'   ? new Date(now.getTime() - 7  * 86_400_000).toISOString() :
        dateRange === '30d'  ? new Date(now.getTime() - 30 * 86_400_000).toISOString() :
        /* month */            new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      query = query.gte('created_at', fromDate)
    }

    const { data, count, error } = await query

    if (!error) {
      setComplaints((data as unknown as Complaint[]) ?? [])
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }, [supabase, userRole, showArchived, statusFilter, severityFilter, categoryFilter, routeFilter, dateRange, page])

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0) }, [statusFilter, severityFilter, categoryFilter, routeFilter, dateRange, showArchived])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchComplaints() }, [fetchComplaints])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function refresh() {
    fetchStats()
    fetchComplaints()
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 leading-tight">Subhan Complaints</p>
            <p className="text-xs text-gray-500 truncate">{userName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/staff/log-complaint')}
              className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 px-3 py-2 rounded-xl"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Log Complaint</span>
            </button>
            {userRole === 'ADMIN' && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-3 py-2 rounded-xl"
              >
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">⚙️</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-3 py-2 rounded-xl"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">

        {/* ── Stat Tiles ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Open"             value={stats.open}             color="text-blue-600"  />
          <StatTile label="Investigating"    value={stats.investigating}    color="text-amber-600" />
          <StatTile label="Resolved This Week" value={stats.resolvedThisWeek} color="text-green-600" />
          <StatTile
            label="Avg Resolution"
            value={stats.avgResolutionHours !== null ? `${stats.avgResolutionHours}h` : '—'}
            color="text-gray-700"
          />
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={v => setStatusFilter(v as StatusFilter)}
              options={[
                { value: 'ACTIVE',        label: 'Active'        },
                { value: 'ALL',           label: 'All'           },
                { value: 'OPEN',          label: 'Open'          },
                { value: 'INVESTIGATING', label: 'Investigating'  },
                { value: 'RESOLVED',      label: 'Resolved'      },
                { value: 'CLOSED',        label: 'Closed'        },
                { value: 'ARCHIVED',      label: 'Archived'      },
              ]}
            />

            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={v => setSeverityFilter(v as SeverityFilter)}
              options={[
                { value: 'ALL',    label: 'All'    },
                { value: 'HIGH',   label: 'High'   },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW',    label: 'Low'    },
              ]}
            />

            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={v => setCategoryFilter(v as CategoryFilter)}
              options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
              minWidth="min-w-[160px]"
            />

            <FilterSelect
              label="Route"
              value={routeFilter}
              onChange={v => setRouteFilter(v)}
              options={[
                { value: 'ALL', label: 'All Routes' },
                ...routes.map(r => ({ value: r.id, label: r.name })),
              ]}
              minWidth="min-w-[160px]"
            />

            <FilterSelect
              label="Date Range"
              value={dateRange}
              onChange={v => setDateRange(v as DateRangeFilter)}
              options={[
                { value: 'all',   label: 'All Time'     },
                { value: '7d',    label: 'Last 7 Days'  },
                { value: '30d',   label: 'Last 30 Days' },
                { value: 'month', label: 'This Month'   },
              ]}
            />
          </div>

          {/* Show archived toggle */}
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            Show archived complaints
          </label>
        </div>

        {/* ── Complaints List ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-700">
              {loading
                ? 'Loading...'
                : `${totalCount} complaint${totalCount !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={refresh}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg"
              aria-label="Refresh list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              Loading complaints…
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="space-y-2">
                {complaints.map(c => (
                  <ComplaintRow
                    key={c.id}
                    complaint={c}
                    onClick={() => router.push(`/staff/complaint/${c.id}`)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-4 py-3">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 text-sm font-medium text-gray-600 disabled:opacity-40"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
      <p className={cn('text-2xl font-bold leading-tight tabular-nums', color)}>{value}</p>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  minWidth = 'min-w-[130px]',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  minWidth?: string
}) {
  return (
    <div className={cn('flex-1', minWidth)}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function ComplaintRow({ complaint, onClick }: { complaint: Complaint; onClick: () => void }) {
  const hours    = ageHours(complaint.created_at)
  const isActive = complaint.status === 'OPEN' || complaint.status === 'INVESTIGATING'

  const rowBg =
    isActive && hours > 48 ? 'bg-red-50 border-red-200' :
    isActive && hours >= 36 ? 'bg-amber-50 border-amber-200' :
    'bg-white border-gray-200'

  const sub = subcategoryLabel(complaint)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border p-4 space-y-2 active:scale-[0.99] transition-transform',
        rowBg,
      )}
    >
      {/* Reference + badges */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-base font-bold text-gray-900 leading-tight tracking-wide">
          {complaint.reference_number}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', SEVERITY_COLORS[complaint.severity] ?? 'bg-gray-100 text-gray-700')}>
            {complaint.severity.charAt(0) + complaint.severity.slice(1).toLowerCase()}
          </span>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_COLORS[complaint.status] ?? 'bg-gray-100 text-gray-700')}>
            {STATUS_LABELS[complaint.status] ?? complaint.status}
          </span>
        </div>
      </div>

      {/* Date + age */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <span>{formatDate(complaint.created_at)}</span>
        <span className={cn(
          'font-medium',
          isActive && hours > 48 ? 'text-red-600' :
          isActive && hours >= 36 ? 'text-amber-600' :
          'text-gray-600',
        )}>
          {formatAge(hours)}
        </span>
      </div>

      {/* Route + bus */}
      {(complaint.routes?.name || complaint.bus_number) && (
        <p className="text-xs text-gray-600">
          {complaint.routes?.name}
          {complaint.routes?.name && complaint.bus_number && (
            <span className="text-gray-400"> → </span>
          )}
          {complaint.bus_number && (
            <span className="font-medium">Bus {complaint.bus_number}</span>
          )}
        </p>
      )}

      {/* Category + subcategory */}
      <p className="text-xs text-gray-600">
        {categoryLabel(complaint.category)}
        {sub && <span className="text-gray-400"> · {sub}</span>}
      </p>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <div className="text-5xl mb-3 select-none">📭</div>
      <p className="font-semibold text-gray-700 text-base">No complaints found</p>
      <p className="text-sm text-gray-400 mt-1">Try adjusting the filters above.</p>
    </div>
  )
}
