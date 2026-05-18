'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────

type TimeRange = '7d' | '30d' | '90d' | 'all'

type ComplaintRow = {
  id:            string
  created_at:    string
  status:        string
  severity:      string
  category:      string
  resolved_at:   string | null
  csat_response: string | null
  bus_number:    string | null
  driver_name:   string | null
  steward_name:  string | null
  routes:        { name: string } | null
}

// ── Constants ─────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────

export default function AnalyticsTab({ userRole }: { userRole: 'ADMIN' | 'STEWARD_HEAD' }) {
  const supabase = useMemo(() => createClient(), [])
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [complaints, setComplaints] = useState<ComplaintRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('complaints')
        .select('id, created_at, status, severity, category, resolved_at, csat_response, bus_number, driver_name, steward_name, routes(name)')
        .order('created_at', { ascending: true })
      setComplaints((data as ComplaintRow[] | null) ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  // ── Derived date boundaries ───────────────────────────────

  const now = new Date()

  const rangeStart = useMemo<Date | null>(() => {
    if (timeRange === 'all') return null
    const d = new Date(now)
    d.setDate(d.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))
    d.setHours(0, 0, 0, 0)
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  const allComplaints = complaints ?? []

  const filtered = useMemo(
    () => rangeStart
      ? allComplaints.filter(c => new Date(c.created_at) >= rangeStart)
      : allComplaints,
    [allComplaints, rangeStart],
  )

  // ── Section 1: Fixed totals ───────────────────────────────

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const countToday = allComplaints.filter(c => new Date(c.created_at) >= todayStart).length
  const countWeek  = allComplaints.filter(c => new Date(c.created_at) >= weekStart).length
  const countMonth = allComplaints.filter(c => new Date(c.created_at) >= monthStart).length
  const countAll   = allComplaints.length

  // ── Section 2: Resolution metrics ────────────────────────

  const resolved = filtered.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED')
  const resolutionRate = filtered.length > 0 ? (resolved.length / filtered.length) * 100 : null

  const resolvedWithTime = resolved.filter(c => c.resolved_at)
  const avgResolutionHours = resolvedWithTime.length > 0
    ? resolvedWithTime.reduce((sum, c) => {
        return sum + (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / 3_600_000
      }, 0) / resolvedWithTime.length
    : null

  // ── Section 3: SLA ────────────────────────────────────────

  const slaThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const slaBreached = filtered.filter(
    c => (c.status === 'OPEN' || c.status === 'INVESTIGATING') && new Date(c.created_at) < slaThreshold,
  ).length

  // ── Section 4: CSAT ───────────────────────────────────────

  const withCsat  = filtered.filter(c => c.csat_response && c.csat_response !== 'NO_RESPONSE')
  const satisfied = withCsat.filter(c => c.csat_response === 'SATISFIED').length
  const csatRate  = withCsat.length > 0 ? (satisfied / withCsat.length) * 100 : null

  // ── Section 5: Severity breakdown ────────────────────────

  const sevCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  filtered.forEach(c => {
    if (c.severity in sevCounts) sevCounts[c.severity as keyof typeof sevCounts]++
  })
  const sevTotal = filtered.length

  // ── Section 6: Trend ─────────────────────────────────────

  const trendData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(c => {
      const date = c.created_at.split('T')[0]
      map[date] = (map[date] ?? 0) + 1
    })

    const end = new Date()
    let start: Date

    if (timeRange === 'all') {
      if (filtered.length === 0) return []
      const sortedDates = Object.keys(map).sort()
      start = new Date(sortedDates[0])
    } else {
      start = new Date(end)
      start.setDate(start.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))
    }

    const days: { label: string; count: number }[] = []
    const d = new Date(start)
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count: map[dateStr] ?? 0,
      })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [filtered, timeRange])

  const trendInterval = trendData.length <= 7 ? 0
    : trendData.length <= 31 ? Math.floor(trendData.length / 6)
    : Math.floor(trendData.length / 5)

  // ── Section 7: By category ────────────────────────────────

  const catMap: Record<string, number> = {}
  filtered.forEach(c => { catMap[c.category] = (catMap[c.category] ?? 0) + 1 })
  const byCategory = Object.entries(catMap)
    .map(([cat, count]) => ({ label: CATEGORY_LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count)

  // ── Section 8: By route ───────────────────────────────────

  const routeMap: Record<string, number> = {}
  filtered.forEach(c => {
    const name = (c.routes as { name: string } | null)?.name ?? 'Unknown'
    routeMap[name] = (routeMap[name] ?? 0) + 1
  })
  const byRoute = Object.entries(routeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // ── Section 9: By bus number (top 10) ────────────────────

  const busMap: Record<string, number> = {}
  filtered.forEach(c => { if (c.bus_number) busMap[c.bus_number] = (busMap[c.bus_number] ?? 0) + 1 })
  const byBus = Object.entries(busMap)
    .map(([num, count]) => ({ name: `Bus #${num}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Section 10: By driver name (top 10) ──────────────────

  const driverMap: Record<string, number> = {}
  filtered.forEach(c => {
    const n = (c as { driver_name?: string | null }).driver_name
    if (n) driverMap[n] = (driverMap[n] ?? 0) + 1
  })
  const byDriver = Object.entries(driverMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Section 11: By steward name (top 10) — ADMIN only ────

  const stewardMap: Record<string, number> = {}
  filtered.forEach(c => {
    const n = (c as { steward_name?: string | null }).steward_name
    if (n) stewardMap[n] = (stewardMap[n] ?? 0) + 1
  })
  const bySteward = Object.entries(stewardMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">Loading analytics…</div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Time range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">Analytics Overview</p>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as TimeRange)}
          className="h-9 px-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* 1 — Total Complaints */}
      <Section title="Total Complaints" note="Fixed counts, not affected by date filter">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Today"      value={countToday} />
          <StatTile label="This Week"  value={countWeek}  />
          <StatTile label="This Month" value={countMonth} />
          <StatTile label="All Time"   value={countAll}   highlight />
        </div>
      </Section>

      {/* 2 — Resolution Metrics */}
      <Section title="Resolution Metrics">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Resolution Rate"
            value={resolutionRate !== null ? `${resolutionRate.toFixed(1)}%` : '—'}
            sub={filtered.length > 0 ? `${resolved.length} of ${filtered.length}` : undefined}
          />
          <StatTile
            label="Avg Resolution"
            value={avgResolutionHours !== null ? `${avgResolutionHours.toFixed(1)}h` : '—'}
            sub={avgResolutionHours !== null ? `${resolvedWithTime.length} resolved` : 'No data yet'}
          />
        </div>
      </Section>

      {/* 3 — SLA */}
      <Section title="Open Past SLA (48 h)">
        <div className={cn(
          'rounded-2xl p-5 text-center border-2',
          slaBreached > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
        )}>
          <p className={cn(
            'text-[44px] font-bold leading-none tabular-nums',
            slaBreached > 0 ? 'text-red-600' : 'text-green-600',
          )}>
            {slaBreached}
          </p>
          <p className={cn(
            'text-sm mt-2 font-medium',
            slaBreached > 0 ? 'text-red-700' : 'text-green-700',
          )}>
            {slaBreached > 0
              ? `${slaBreached} complaint${slaBreached !== 1 ? 's' : ''} past 48-hour SLA`
              : 'All complaints within SLA'}
          </p>
        </div>
      </Section>

      {/* 4 — CSAT */}
      <Section title="CSAT Score">
        <div className="grid grid-cols-1 gap-3">
          <StatTile
            label="Satisfaction Rate"
            value={csatRate !== null ? `${csatRate.toFixed(1)}%` : '—'}
            sub={
              withCsat.length > 0
                ? `${satisfied} satisfied of ${withCsat.length} response${withCsat.length !== 1 ? 's' : ''}`
                : 'No CSAT responses yet'
            }
          />
        </div>
      </Section>

      {/* 5 — Severity Breakdown */}
      <Section title="Severity Breakdown">
        {sevTotal === 0 ? <EmptyState /> : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <SeverityTile label="High"   count={sevCounts.HIGH}   pct={sevCounts.HIGH   / sevTotal * 100} color="text-red-600"     bg="bg-red-50"     border="border-red-200"     />
              <SeverityTile label="Medium" count={sevCounts.MEDIUM} pct={sevCounts.MEDIUM / sevTotal * 100} color="text-amber-600"   bg="bg-amber-50"   border="border-amber-200"   />
              <SeverityTile label="Low"    count={sevCounts.LOW}    pct={sevCounts.LOW    / sevTotal * 100} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-200" />
            </div>
            <div className="mt-3 h-2.5 rounded-full overflow-hidden flex">
              {sevCounts.HIGH   > 0 && <div style={{ width: `${sevCounts.HIGH   / sevTotal * 100}%` }} className="bg-red-500" />}
              {sevCounts.MEDIUM > 0 && <div style={{ width: `${sevCounts.MEDIUM / sevTotal * 100}%` }} className="bg-amber-400" />}
              {sevCounts.LOW    > 0 && <div style={{ width: `${sevCounts.LOW    / sevTotal * 100}%` }} className="bg-emerald-500" />}
            </div>
          </>
        )}
      </Section>

      {/* 6 — Complaints Trend */}
      <Section title="Complaints Trend">
        {trendData.length === 0 || trendData.every(d => d.count === 0) ? <EmptyState /> : (
          <div className="overflow-x-auto -mx-1 px-1">
            <div style={{ minWidth: 260, height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval={trendInterval}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', padding: '6px 10px' }}
                    labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                    itemStyle={{ color: 'hsl(167,71%,21%)' }}
                    cursor={{ stroke: '#e5e7eb' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Complaints"
                    stroke="hsl(167,71%,21%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(167,71%,21%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Section>

      {/* 7 — By Category */}
      <Section title="Complaints by Category">
        {byCategory.length === 0 ? <EmptyState /> : (
          <div className="space-y-2.5">
            {byCategory.map(({ label, count }) => (
              <RankedBar key={label} label={label} count={count} max={byCategory[0].count} />
            ))}
          </div>
        )}
      </Section>

      {/* 8 — By Route */}
      <Section title="Complaints by Route">
        {byRoute.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byRoute.map(({ name, count }, i) => (
              <RankedRow key={name} rank={i + 1} label={name} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* 9 — By Bus Number */}
      <Section title="Complaints by Bus Number (Top 10)">
        {byBus.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byBus.map(({ name, count }, i) => (
              <RankedRow key={name} rank={i + 1} label={name} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* 10 — By Driver Name */}
      <Section title="Complaints by Driver Name (Top 10)">
        {byDriver.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byDriver.map(({ name, count }, i) => (
              <RankedRow key={name} rank={i + 1} label={name} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* 11 — By Steward Name — ADMIN only */}
      {userRole === 'ADMIN' && (
        <Section title="Complaints by Steward Name (Top 10)">
          {bySteward.length === 0 ? <EmptyState /> : (
            <div className="space-y-2">
              {bySteward.map(({ name, count }, i) => (
                <RankedRow key={name} rank={i + 1} label={name} count={count} />
              ))}
            </div>
          )}
        </Section>
      )}

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
        {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  )
}

function StatTile({ label, value, sub, highlight }: {
  label:      string
  value:      string | number
  sub?:       string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl p-4 border',
      highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100',
    )}>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn(
        'text-[28px] font-bold leading-none tabular-nums',
        highlight ? 'text-primary' : 'text-gray-900',
      )}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function SeverityTile({ label, count, pct, color, bg, border }: {
  label:  string
  count:  number
  pct:    number
  color:  string
  bg:     string
  border: string
}) {
  return (
    <div className={cn('rounded-xl p-3 border text-center', bg, border)}>
      <p className={cn('text-[22px] font-bold leading-none tabular-nums', color)}>{count}</p>
      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</p>
      <p className={cn('text-[11px] font-bold mt-0.5', color)}>{pct.toFixed(0)}%</p>
    </div>
  )
}

function RankedBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-medium text-gray-700 truncate pr-2">{label}</p>
        <p className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">{count}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function RankedRow({ rank, label, count }: { rank: number; label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-bold text-gray-300 w-5 text-right shrink-0">{rank}</span>
      <p className="flex-1 text-[13px] text-gray-700 truncate">{label}</p>
      <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">{count}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="text-center text-sm text-gray-400 py-4">No data yet</p>
  )
}
