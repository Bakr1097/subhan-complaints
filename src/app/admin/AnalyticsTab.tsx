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
  id:                        string
  created_at:                string
  status:                    string
  severity:                  string
  category:                  string
  resolved_at:               string | null
  csat_response:             string | null
  bus_number:                string | null
  driver_name:               string | null
  steward_name:              string | null
  driver_subcategory?:       string | null
  steward_subcategory?:      string | null
  bus_condition_subcategory?: string | null
  delay_subcategory?:        string | null
  routes:                    { name: string } | null
}

type RatingRow = {
  id:            string
  created_at:    string
  rating:        number
  positive_tags: string[] | null
  feedback_text: string | null
  bus_number:    string | null
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

const SUBCAT_LABELS: Record<string, Record<string, string>> = {
  DRIVER: {
    RECKLESS_DRIVING:     'Reckless Driving',
    MOBILE_USE:           'Mobile Use',
    RUDE_BEHAVIOR:        'Rude Behavior',
    OTHER:                'Other',
  },
  STEWARD: {
    RUDE_BEHAVIOR:        'Rude Behavior',
    UNRESPONSIVE:         'Unresponsive',
    NOT_SERVING_PROPERLY: 'Not Serving Properly',
    OTHER:                'Other',
  },
  BUS_CONDITION: {
    AC_HEATING:           'AC / Heating',
    ENTERTAINMENT_TABLET: 'Entertainment Tablet',
    SEAT:                 'Seat',
    CLEANLINESS:          'Cleanliness',
  },
  DELAY_TIMING: {
    LATE_DEPARTURE:  'Late Departure',
    LATE_ARRIVAL:    'Late Arrival',
    EXCESSIVE_STOPS: 'Excessive Stops',
  },
}

const TAG_LABELS: Record<string, string> = {
  CLEAN:   'Clean bus',
  STAFF:   'Friendly staff',
  ON_TIME: 'On time',
  SEAT:    'Comfortable seat',
  FOOD:    'Good food',
  DRIVING: 'Smooth driving',
}

// ── Main component ────────────────────────────────────────────

export default function AnalyticsTab({ userRole }: { userRole: 'ADMIN' | 'STEWARD_HEAD' }) {
  const supabase = useMemo(() => createClient(), [])
  const [view,       setView      ] = useState<'complaints' | 'ratings'>('complaints')
  const [timeRange,  setTimeRange ] = useState<TimeRange>('30d')
  const [complaints, setComplaints] = useState<ComplaintRow[] | null>(null)
  const [ratings,    setRatings   ] = useState<RatingRow[] | null>(null)
  const [loading,    setLoading   ] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: cData }, { data: rData }] = await Promise.all([
        supabase
          .from('complaints')
          .select('id, created_at, status, severity, category, resolved_at, csat_response, bus_number, driver_name, steward_name, driver_subcategory, steward_subcategory, bus_condition_subcategory, delay_subcategory, routes(name)')
          .order('created_at', { ascending: true }),
        supabase
          .from('trip_ratings')
          .select('id, created_at, rating, positive_tags, feedback_text, bus_number, routes(name)')
          .order('created_at', { ascending: true }),
      ])
      setComplaints((cData as ComplaintRow[] | null) ?? [])
      setRatings((rData as RatingRow[] | null) ?? [])
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

  const allComplaints = useMemo(() => complaints ?? [], [complaints])
  const allRatings    = useMemo(() => ratings ?? [],    [ratings])

  const filtered = useMemo(
    () => rangeStart
      ? allComplaints.filter(c => new Date(c.created_at) >= rangeStart)
      : allComplaints,
    [allComplaints, rangeStart],
  )

  const filteredRatings = useMemo(
    () => rangeStart
      ? allRatings.filter(r => new Date(r.created_at) >= rangeStart)
      : allRatings,
    [allRatings, rangeStart],
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

  // ── Section 6: Complaints trend ──────────────────────────

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
      start = new Date(Object.keys(map).sort()[0])
    } else {
      start = new Date(end)
      start.setDate(start.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))
    }
    const days: { label: string; count: number }[] = []
    const d = new Date(start)
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0]
      days.push({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count: map[dateStr] ?? 0 })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [filtered, timeRange])

  const trendInterval = trendData.length <= 7 ? 0
    : trendData.length <= 31 ? Math.floor(trendData.length / 6)
    : Math.floor(trendData.length / 5)

  // ── Section 7: By category + subcategories ───────────────

  const catMap: Record<string, number> = {}
  filtered.forEach(c => { catMap[c.category] = (catMap[c.category] ?? 0) + 1 })
  const byCategory = Object.entries(catMap)
    .map(([cat, count]) => ({ cat, label: CATEGORY_LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count)

  const subcatData = useMemo(() => {
    const maps: Record<string, Record<string, number>> = {
      DRIVER: {}, STEWARD: {}, BUS_CONDITION: {}, DELAY_TIMING: {},
    }
    filtered.forEach(c => {
      const sub =
        c.category === 'DRIVER'        ? c.driver_subcategory :
        c.category === 'STEWARD'       ? c.steward_subcategory :
        c.category === 'BUS_CONDITION' ? c.bus_condition_subcategory :
        c.category === 'DELAY_TIMING'  ? c.delay_subcategory :
        null
      if (sub && c.category in maps) {
        maps[c.category][sub] = (maps[c.category][sub] ?? 0) + 1
      }
    })
    return maps
  }, [filtered])

  // ── Section 8: By route (complaints) ─────────────────────

  const routeMap: Record<string, number> = {}
  filtered.forEach(c => {
    const name = c.routes?.name ?? 'Unknown'
    routeMap[name] = (routeMap[name] ?? 0) + 1
  })
  const byRoute = Object.entries(routeMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // ── Section 9: By bus number ──────────────────────────────

  const busMap: Record<string, number> = {}
  filtered.forEach(c => { if (c.bus_number) busMap[c.bus_number] = (busMap[c.bus_number] ?? 0) + 1 })
  const byBus = Object.entries(busMap)
    .map(([num, count]) => ({ name: `Bus #${num}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Section 10: By driver name ────────────────────────────

  const driverMap: Record<string, number> = {}
  filtered.forEach(c => {
    const n = (c as { driver_name?: string | null }).driver_name
    if (n) driverMap[n] = (driverMap[n] ?? 0) + 1
  })
  const byDriver = Object.entries(driverMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Section 11: By steward name ───────────────────────────

  const stewardMap: Record<string, number> = {}
  filtered.forEach(c => {
    const n = (c as { steward_name?: string | null }).steward_name
    if (n) stewardMap[n] = (stewardMap[n] ?? 0) + 1
  })
  const bySteward = Object.entries(stewardMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Ratings: R1 + R2 — average + total ───────────────────

  const avgRating = filteredRatings.length > 0
    ? filteredRatings.reduce((s, r) => s + r.rating, 0) / filteredRatings.length
    : null

  // ── Ratings: R3 — distribution ───────────────────────────

  const ratingDist = ([5, 4, 3, 2, 1] as const).map(v => ({
    value: v,
    count: filteredRatings.filter(r => r.rating === v).length,
  }))
  const ratingDistMax = Math.max(...ratingDist.map(d => d.count), 1)

  // ── Ratings: R4 — trend (avg per day) ────────────────────

  const ratingTrend = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {}
    filteredRatings.forEach(r => {
      const date = r.created_at.split('T')[0]
      if (!map[date]) map[date] = { sum: 0, count: 0 }
      map[date].sum += r.rating
      map[date].count++
    })
    const end = new Date()
    let start: Date
    if (timeRange === 'all') {
      if (filteredRatings.length === 0) return []
      start = new Date(Object.keys(map).sort()[0])
    } else {
      start = new Date(end)
      start.setDate(start.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90))
    }
    const days: { label: string; avg: number | null }[] = []
    const d = new Date(start)
    while (d <= end) {
      const dateStr = d.toISOString().split('T')[0]
      const entry = map[dateStr]
      days.push({
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        avg: entry ? parseFloat((entry.sum / entry.count).toFixed(2)) : null,
      })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [filteredRatings, timeRange])

  const ratingTrendInterval = ratingTrend.length <= 7 ? 0
    : ratingTrend.length <= 31 ? Math.floor(ratingTrend.length / 6)
    : Math.floor(ratingTrend.length / 5)

  // ── Ratings: R5 — by route ────────────────────────────────

  const ratingRouteMap: Record<string, { sum: number; count: number }> = {}
  filteredRatings.forEach(r => {
    const name = r.routes?.name ?? 'Unknown'
    if (!ratingRouteMap[name]) ratingRouteMap[name] = { sum: 0, count: 0 }
    ratingRouteMap[name].sum += r.rating
    ratingRouteMap[name].count++
  })
  const byRouteRatings = Object.entries(ratingRouteMap)
    .map(([name, { sum, count }]) => ({ name, avg: sum / count, count }))
    .sort((a, b) => b.count - a.count)

  // ── Ratings: R6 — by bus (top 10) ────────────────────────

  const ratingBusMap: Record<string, { sum: number; count: number }> = {}
  filteredRatings.forEach(r => {
    if (!r.bus_number) return
    if (!ratingBusMap[r.bus_number]) ratingBusMap[r.bus_number] = { sum: 0, count: 0 }
    ratingBusMap[r.bus_number].sum += r.rating
    ratingBusMap[r.bus_number].count++
  })
  const byBusRatings = Object.entries(ratingBusMap)
    .map(([num, { sum, count }]) => ({ name: `Bus #${num}`, avg: sum / count, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Ratings: R7 — top positive tags ──────────────────────

  const tagMap: Record<string, number> = {}
  filteredRatings.forEach(r => {
    r.positive_tags?.forEach(t => { tagMap[t] = (tagMap[t] ?? 0) + 1 })
  })
  const topTags = Object.entries(tagMap)
    .map(([value, count]) => ({ label: TAG_LABELS[value] ?? value, count }))
    .sort((a, b) => b.count - a.count)

  // ── Ratings: R8 — negative comments feed ─────────────────

  const negComments = [...filteredRatings]
    .filter(r => r.rating <= 2 && r.feedback_text?.trim())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  // ── Route Health (combined) ───────────────────────────────

  const allRouteNames = Array.from(new Set([
    ...byRoute.map(r => r.name),
    ...byRouteRatings.map(r => r.name),
  ]))
  const routeHealth = allRouteNames.map(name => {
    const cEntry = byRoute.find(r => r.name === name)
    const rEntry = byRouteRatings.find(r => r.name === name)
    const openCount = filtered.filter(
      c => c.routes?.name === name && (c.status === 'OPEN' || c.status === 'INVESTIGATING'),
    ).length
    return {
      name,
      avgRating:       rEntry?.avg ?? null,
      totalRatings:    rEntry?.count ?? 0,
      totalComplaints: cEntry?.count ?? 0,
      openComplaints:  openCount,
    }
  }).sort((a, b) => (b.totalRatings + b.totalComplaints) - (a.totalRatings + a.totalComplaints))

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center py-16 text-sm text-gray-400">Loading analytics…</div>
  }

  return (
    <div className="space-y-5">

      {/* Tab switcher */}
      <div className="bg-gray-100 rounded-2xl p-1 grid grid-cols-2 gap-1">
        {(['complaints', 'ratings'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'h-11 rounded-xl text-[14px] font-semibold transition-all duration-150 capitalize',
              view === v
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {v === 'complaints' ? 'Complaints' : 'Ratings'}
          </button>
        ))}
      </div>

      {/* Time range selector */}
      <div className="flex items-center justify-end">
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

      {/* ── Complaints view ─────────────────────────────────── */}
      {view === 'complaints' && <>

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
        <StatTile
          label="Satisfaction Rate"
          value={csatRate !== null ? `${csatRate.toFixed(1)}%` : '—'}
          sub={
            withCsat.length > 0
              ? `${satisfied} satisfied of ${withCsat.length} response${withCsat.length !== 1 ? 's' : ''}`
              : 'No CSAT responses yet'
          }
        />
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
          <ChartWrap>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={trendInterval} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL} itemStyle={{ color: PRIMARY }} cursor={{ stroke: '#e5e7eb' }} />
                <Line type="monotone" dataKey="count" name="Complaints" stroke={PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: PRIMARY }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>
        )}
      </Section>

      {/* 7 — By Category */}
      <Section title="Complaints by Category">
        {byCategory.length === 0 ? <EmptyState /> : (
          <div className="space-y-4">
            {byCategory.map(({ cat, label, count }) => {
              const subMap    = subcatData[cat] ?? {}
              const subLabels = SUBCAT_LABELS[cat] ?? {}
              const subcats   = Object.entries(subMap)
                .filter(([, n]) => n > 0)
                .map(([key, n]) => ({ label: subLabels[key] ?? key, count: n }))
                .sort((a, b) => b.count - a.count)
              return (
                <CategoryWithSubs key={cat} label={label} count={count} max={byCategory[0].count} subcats={subcats} />
              )
            })}
          </div>
        )}
      </Section>

      {/* 8 — By Route (complaints) */}
      <Section title="Complaints by Route">
        {byRoute.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byRoute.map(({ name, count }, i) => (
              <RankedRow key={name} rank={i + 1} label={name} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* 9 — By Bus Number (complaints) */}
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

      </>}

      {/* ── Ratings view ────────────────────────────────────── */}
      {view === 'ratings' && <>

      {/* R1 — Average rating + total */}
      <Section title="Overview">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg Rating</p>
            {avgRating !== null ? (
              <>
                <p className="text-[44px] font-bold leading-none tabular-nums text-primary">
                  {avgRating.toFixed(1)}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">out of 5</p>
              </>
            ) : (
              <p className="text-[28px] font-bold text-gray-300">—</p>
            )}
          </div>
          <StatTile label="Total Ratings" value={filteredRatings.length} highlight />
        </div>
      </Section>

      {/* R2 — Rating distribution */}
      <Section title="Rating Distribution">
        {filteredRatings.length === 0 ? <EmptyState /> : (
          <div className="space-y-2.5">
            {ratingDist.map(({ value, count }) => (
              <RatingDistBar key={value} value={value} count={count} max={ratingDistMax} />
            ))}
          </div>
        )}
      </Section>

      {/* R3 — Rating trend */}
      <Section title="Rating Trend">
        {ratingTrend.length === 0 || ratingTrend.every(d => d.avg === null) ? <EmptyState /> : (
          <ChartWrap>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratingTrend} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={ratingTrendInterval} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL}
                  itemStyle={{ color: PRIMARY }}
                  cursor={{ stroke: '#e5e7eb' }}
                  formatter={(v) => [typeof v === 'number' ? v.toFixed(2) : '—', 'Avg Rating']}
                />
                <Line type="monotone" dataKey="avg" name="Avg Rating" stroke={PRIMARY} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, fill: PRIMARY }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrap>
        )}
      </Section>

      {/* R4 — By route */}
      <Section title="Ratings by Route">
        {byRouteRatings.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byRouteRatings.map(({ name, avg, count }, i) => (
              <RatingRankedRow key={name} rank={i + 1} label={name} avg={avg} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* R5 — By bus */}
      <Section title="Ratings by Bus Number (Top 10)">
        {byBusRatings.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {byBusRatings.map(({ name, avg, count }, i) => (
              <RatingRankedRow key={name} rank={i + 1} label={name} avg={avg} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* R6 — Top positive tags */}
      <Section title="Top Positive Tags">
        {topTags.length === 0 ? <EmptyState /> : (
          <div className="space-y-2">
            {topTags.map(({ label, count }, i) => (
              <RankedRow key={label} rank={i + 1} label={label} count={count} />
            ))}
          </div>
        )}
      </Section>

      {/* R7 — Negative feedback feed */}
      <Section title="Negative Feedback" note="Rating 1–2 with written comments, most recent first">
        {negComments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">No negative feedback yet</p>
        ) : (
          <div className="space-y-2.5">
            {negComments.map(r => (
              <NegCommentCard
                key={r.id}
                rating={r.rating}
                comment={r.feedback_text!}
                route={r.routes?.name ?? null}
                bus={r.bus_number}
                date={new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Route Health */}
      <SectionDivider label="Route Health" />

      <Section title="Ratings + Complaints per Route" note="Combines both signals to show route quality at a glance">
        {routeHealth.length === 0 ? <EmptyState /> : (
          <div className="space-y-2.5">
            {routeHealth.map(r => (
              <RouteHealthRow key={r.name} {...r} />
            ))}
          </div>
        )}
      </Section>

      </>}

    </div>
  )
}

// ── Shared constants ──────────────────────────────────────────

const PRIMARY       = 'hsl(167,71%,21%)'
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', padding: '6px 10px' }
const TOOLTIP_LABEL = { fontWeight: 600, marginBottom: 2 }

// ── Sub-components ────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 px-2">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function ChartWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div style={{ minWidth: 260, height: 190 }}>{children}</div>
    </div>
  )
}

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
  label: string; value: string | number; sub?: string; highlight?: boolean
}) {
  return (
    <div className={cn('rounded-xl p-4 border', highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100')}>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-[28px] font-bold leading-none tabular-nums', highlight ? 'text-primary' : 'text-gray-900')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function SeverityTile({ label, count, pct, color, bg, border }: {
  label: string; count: number; pct: number; color: string; bg: string; border: string
}) {
  return (
    <div className={cn('rounded-xl p-3 border text-center', bg, border)}>
      <p className={cn('text-[22px] font-bold leading-none tabular-nums', color)}>{count}</p>
      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</p>
      <p className={cn('text-[11px] font-bold mt-0.5', color)}>{pct.toFixed(0)}%</p>
    </div>
  )
}

function CategoryWithSubs({ label, count, max, subcats }: {
  label: string; count: number; max: number; subcats: { label: string; count: number }[]
}) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-semibold text-gray-800 truncate pr-2">{label}</p>
        <p className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">{count}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {subcats.length > 0 && (
        <div className="ml-3 pl-3 border-l-2 border-gray-100 space-y-2">
          {subcats.map(sub => {
            const subPct = count > 0 ? (sub.count / count) * 100 : 0
            return (
              <div key={sub.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11.5px] text-gray-500 truncate pr-2">{sub.label}</p>
                  <p className="text-[11.5px] font-medium text-gray-600 tabular-nums shrink-0">{sub.count}</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/35 rounded-full" style={{ width: `${subPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
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
  return <p className="text-center text-sm text-gray-400 py-4">No data yet</p>
}

// ── Ratings sub-components ────────────────────────────────────

function RatingDistBar({ value, count, max }: { value: number; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  const cfg: Record<number, { label: string; bar: string; text: string }> = {
    5: { label: '★★★★★ Excellent', bar: 'bg-emerald-600', text: 'text-emerald-800' },
    4: { label: '★★★★ Great', bar: 'bg-emerald-500', text: 'text-emerald-700' },
    3: { label: '★★★ Good',  bar: 'bg-green-400',   text: 'text-green-700'   },
    2: { label: '★★  Okay',  bar: 'bg-amber-400',   text: 'text-amber-700'   },
    1: { label: '★    Bad',   bar: 'bg-red-500',     text: 'text-red-700'     },
  }
  const c = cfg[value]
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11.5px] font-semibold text-gray-500 w-[80px] shrink-0">{c.label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', c.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-[12px] font-bold tabular-nums w-7 text-right shrink-0', c.text)}>{count}</span>
    </div>
  )
}

function RatingRankedRow({ rank, label, avg, count }: {
  rank: number; label: string; avg: number; count: number
}) {
  const color = avg >= 4 ? 'text-emerald-600' : avg >= 3 ? 'text-green-600' : avg >= 2 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-bold text-gray-300 w-5 text-right shrink-0">{rank}</span>
      <p className="flex-1 text-[13px] text-gray-700 truncate">{label}</p>
      <span className={cn('text-[12px] font-bold tabular-nums shrink-0', color)}>★ {avg.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400 tabular-nums shrink-0 w-8 text-right">{count}</span>
    </div>
  )
}

function NegCommentCard({ rating, comment, route, bus, date }: {
  rating: number; comment: string; route: string | null; bus: string | null; date: string
}) {
  return (
    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-red-600 shrink-0">
          {rating === 1 ? '★ Bad' : '★★ Okay'}
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">{date}</span>
      </div>
      <p className="text-[13px] text-gray-800 leading-snug mb-1.5">{comment}</p>
      {(route || bus) && (
        <p className="text-[11px] text-gray-400">
          {route ?? '—'}{bus ? ` · Bus #${bus}` : ''}
        </p>
      )}
    </div>
  )
}

function RouteHealthRow({ name, avgRating, totalRatings, totalComplaints, openComplaints }: {
  name: string; avgRating: number | null; totalRatings: number
  totalComplaints: number; openComplaints: number
}) {
  const rColor = avgRating === null ? 'text-gray-300'
    : avgRating >= 4 ? 'text-emerald-600'
    : avgRating >= 3 ? 'text-green-600'
    : avgRating >= 2 ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[13px] font-semibold text-gray-800 truncate mb-2.5">{name}</p>
      <div className="grid grid-cols-4 gap-1 text-center">
        <div>
          <p className={cn('text-[18px] font-bold leading-none tabular-nums', rColor)}>
            {avgRating !== null ? avgRating.toFixed(1) : '—'}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">Avg ★</p>
        </div>
        <div>
          <p className="text-[18px] font-bold leading-none tabular-nums text-gray-700">{totalRatings}</p>
          <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">Ratings</p>
        </div>
        <div>
          <p className="text-[18px] font-bold leading-none tabular-nums text-gray-700">{totalComplaints}</p>
          <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">Complaints</p>
        </div>
        <div>
          <p className={cn('text-[18px] font-bold leading-none tabular-nums', openComplaints > 0 ? 'text-red-600' : 'text-gray-700')}>
            {openComplaints}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">Open</p>
        </div>
      </div>
    </div>
  )
}
