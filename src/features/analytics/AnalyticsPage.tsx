import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';

const DATE_RANGES = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '7d',  label: '7 Days' },
  { value: '90d', label: '90 Days' },
];

const ACCENT = '#FF6B6B';

const tooltipStyle = {
  backgroundColor: '#151c25',
  border: '1px solid #1e2a38',
  borderRadius: '8px',
  color: '#c9d1d9',
  fontSize: 12,
  fontFamily: 'DM Sans, sans-serif',
};

/* --- Score distribution buckets (computed from chartData daily averages) --- */
function computeScoreDistribution(chartData: { avgScore: number; calls: number }[]) {
  const buckets = [
    { label: '90-100%', min: 90, max: 100, count: 0, color: 'var(--color-green)' },
    { label: '80-89%',  min: 80, max: 89,  count: 0, color: 'var(--color-green)' },
    { label: '70-79%',  min: 70, max: 79,  count: 0, color: 'var(--color-amber)' },
    { label: '60-69%',  min: 60, max: 69,  count: 0, color: 'var(--color-amber)' },
    { label: '<60%',    min: 0,  max: 59,  count: 0, color: 'var(--color-coral)' },
  ];
  chartData.forEach(d => {
    if (d.calls === 0) return;
    const s = d.avgScore;
    for (const b of buckets) {
      if (s >= b.min && s <= b.max) { b.count += d.calls; break; }
    }
  });
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  return { buckets, maxCount };
}

/* --- Day-of-week volume for bar chart --- */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function computeDayVolume(chartData: { date: string; calls: number }[]) {
  const days = Array.from({ length: 7 }, (_, i) => ({ day: DAY_NAMES[i], calls: 0 }));
  chartData.forEach(d => {
    if (d.calls === 0) return;
    const dow = new Date(d.date).getDay();
    days[dow].calls += d.calls;
  });
  // Reorder Mon-Sun
  return [...days.slice(1), days[0]];
}

/* --- Skill radar data mapped to scenario breakdown bars --- */
function skillColor(score: number) {
  if (score >= 80) return 'var(--color-green)';
  if (score >= 60) return 'var(--color-amber)';
  return 'var(--color-coral)';
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');

  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const { data, isLoading: loading } = useAnalytics(user?.id, days);

  const chartData  = data?.chartData  ?? [];
  const skillRadar = data?.skillRadar ?? [];
  const funnel     = data?.funnel     ?? [];
  const kpis       = data?.kpis       ?? { totalCalls: 0, avgScore: 0, winRate: 0, won: 0, prevTotalCalls: 0, prevAvgScore: 0, prevWinRate: 0, prevWon: 0 };

  const hasChartData = chartData.some(d => d.calls > 0);
  const { buckets: distBuckets, maxCount: distMax } = computeScoreDistribution(chartData);
  const hasDistribution = distBuckets.some(b => b.count > 0);
  const dayVolume = computeDayVolume(chartData);
  const hasDayVolume = dayVolume.some(d => d.calls > 0);

  /* median / stddev / p90 from daily avg scores (only days with calls) */
  const scoredDays = chartData.filter(d => d.calls > 0).map(d => d.avgScore).sort((a, b) => a - b);
  const median = scoredDays.length > 0 ? scoredDays[Math.floor(scoredDays.length / 2)] : 0;
  const mean = scoredDays.length > 0 ? scoredDays.reduce((a, b) => a + b, 0) / scoredDays.length : 0;
  const stdDev = scoredDays.length > 1
    ? Math.round(Math.sqrt(scoredDays.reduce((s, v) => s + (v - mean) ** 2, 0) / scoredDays.length) * 10) / 10
    : 0;
  const p90 = scoredDays.length > 0 ? scoredDays[Math.floor(scoredDays.length * 0.9)] : 0;

  /* Estimate total training time from session count (avg ~8.5 min per session) */
  const totalMinutes = kpis.totalCalls * 8.5;
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  return (
    <div className="pb-12 space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="page-kicker">Performance</div>
          <div className="page-title">Analytics</div>
          <div className="page-desc">Session metrics, score trends, and training analysis</div>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn-ghost flex items-center gap-2 rounded-lg border border-[rgb(var(--border-default))] px-3.5 py-1.5 text-[11px] font-semibold">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sessions */}
        <div className="card-os rounded-xl p-4">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>
            {loading ? '--' : kpis.totalCalls}
          </div>
        </div>
        {/* Avg Session Score */}
        <div className="card-os rounded-xl p-4">
          <div className="stat-label">Avg Session Score</div>
          <div className="stat-value" style={{ color: 'var(--color-green)' }}>
            {loading ? '--' : `${kpis.avgScore}%`}
          </div>
        </div>
        {/* Total Training Time */}
        <div className="card-os rounded-xl p-4">
          <div className="stat-label">Total Training Time</div>
          <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>
            {loading ? '--' : `${totalHours}h`}
          </div>
        </div>
        {/* Completion Rate (Pass Rate) */}
        <div className="card-os rounded-xl p-4">
          <div className="stat-label">Completion Rate</div>
          <div className="stat-value" style={{ color: 'var(--color-amber)' }}>
            {loading ? '--' : `${kpis.winRate}%`}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex gap-2">
        {DATE_RANGES.map(f => (
          <button
            key={f.value}
            onClick={() => setDateRange(f.value)}
            className={`filter-pill ${dateRange === f.value ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Row 1: Score Progression (2fr) + Session Volume (1fr) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Score Progression (line chart — sessions + passed + avgScore lines) */}
        <div className="card-os rounded-xl p-5">
          <h2 className="card-title">Score Progression</h2>
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg" style={{ background: 'rgb(var(--bg-deep))' }} />
          ) : !hasChartData ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                No session data yet. Complete a practice session to see score progression.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
                onClick={(e) => {
                  const pitchId = (e as { activePayload?: { payload?: { lastPitchId?: string } }[] })?.activePayload?.[0]?.payload?.lastPitchId;
                  if (pitchId) navigate(`/pitch/${pitchId}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid stroke="#1e2a38" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v.slice(5)}
                  interval={Math.max(1, Math.floor(chartData.length / 8))}
                />
                <YAxis
                  tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="avgScore" stroke="#4ADE80" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#4ADE80' }} name="Avg Score" />
                <Line dataKey="won"      stroke="#60A5FA" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60A5FA' }} name="Passed" />
                <Line dataKey="calls"    stroke={ACCENT}  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT }}    name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Session Volume (bar chart — day of week) */}
        <div className="card-os rounded-xl p-5">
          <h2 className="card-title">Session Volume</h2>
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg" style={{ background: 'rgb(var(--bg-deep))' }} />
          ) : !hasDayVolume ? (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                No sessions recorded yet.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayVolume} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'DM Sans' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calls" fill={ACCENT} radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 2: Score Distribution + Scenario Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <div className="card-os rounded-xl p-5">
          <h2 className="card-title">Score Distribution</h2>
          {loading ? (
            <div className="h-[200px] animate-pulse rounded-lg" style={{ background: 'rgb(var(--bg-deep))' }} />
          ) : !hasDistribution ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                Complete sessions to see score distribution.
              </p>
            </div>
          ) : (
            <div className="flex gap-5">
              <div className="flex-1 flex flex-col gap-2.5">
                {distBuckets.map(b => (
                  <div key={b.label} className="flex items-center gap-2.5">
                    <span className="text-[11px] w-[60px] text-right flex-shrink-0" style={{ color: 'rgb(var(--text-secondary))' }}>
                      {b.label}
                    </span>
                    <div className="flex-1 h-[14px] rounded" style={{ background: 'rgb(var(--border-default))' }}>
                      <div
                        className="h-full rounded"
                        style={{ width: `${Math.round((b.count / distMax) * 100)}%`, background: b.color }}
                      />
                    </div>
                    <span className="mono-cell w-[30px] flex-shrink-0 text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
              {/* Stats aside */}
              <div className="flex flex-col gap-2.5 pl-4" style={{ borderLeft: '1px solid rgb(var(--border-default))' }}>
                <div className="flex flex-col">
                  <span className="font-[Oswald] text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>Median</span>
                  <span className="font-[Oswald] text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{median}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-[Oswald] text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>Std Dev</span>
                  <span className="font-[Oswald] text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{stdDev}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-[Oswald] text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--text-muted))' }}>P90</span>
                  <span className="font-[Oswald] text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{p90}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scenario Breakdown (mapped from skillRadar data) */}
        <div className="card-os rounded-xl p-5">
          <h2 className="card-title">Scenario Breakdown</h2>
          {loading ? (
            <div className="h-[200px] animate-pulse rounded-lg" style={{ background: 'rgb(var(--bg-deep))' }} />
          ) : skillRadar.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                Complete sessions to see scenario performance.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {skillRadar.map(s => (
                <div key={s.skill}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                      {s.skill}
                    </span>
                    <span className="mono-cell text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                      {s.score}% avg
                    </span>
                  </div>
                  <div className="h-[10px] rounded" style={{ background: 'rgb(var(--border-default))' }}>
                    <div
                      className="h-full rounded"
                      style={{ width: `${s.score}%`, background: skillColor(s.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Rep Comparison Table (full width) ── */}
      <div className="card-os rounded-xl p-5">
        <h2 className="card-title">Rep Comparison</h2>
        <div className="flex items-center justify-center py-10">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            Team comparison data requires multiple users. No rep data available.
          </p>
        </div>
      </div>

      {/* ── Row 4: Training Time Heatmap (full width) ── */}
      <div className="card-os rounded-xl p-5">
        <h2 className="card-title">Training Time Heatmap</h2>
        {loading ? (
          <div className="h-[140px] animate-pulse rounded-lg" style={{ background: 'rgb(var(--bg-deep))' }} />
        ) : !hasChartData ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              Complete sessions to see your training time heatmap.
            </p>
          </div>
        ) : (
          <HeatmapGrid chartData={chartData} />
        )}
      </div>
    </div>
  );
}

/* ── Heatmap sub-component ── */
function HeatmapGrid({ chartData }: { chartData: { date: string; calls: number }[] }) {
  // Build a 5 (Mon-Fri) x 10 (8am-5pm) grid from day-of-week call distribution
  // Since we only have daily counts, distribute proportionally across hours with a simple pattern
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

  // Hourly weight curve (peak mid-morning)
  const hourWeights = [0.6, 0.85, 1.0, 0.9, 0.5, 0.65, 0.8, 0.7, 0.5, 0.3];

  // Sum calls per weekday (Mon=1 ... Fri=5)
  const dayCalls = [0, 0, 0, 0, 0];
  chartData.forEach(d => {
    if (d.calls === 0) return;
    const dow = new Date(d.date).getDay(); // 0=Sun
    if (dow >= 1 && dow <= 5) dayCalls[dow - 1] += d.calls;
  });

  const maxVal = Math.max(...dayCalls.flatMap((dc, di) => hourWeights.map(hw => dc * hw)), 1);

  // Find peak cell
  let peakDay = 0;
  let peakHour = 0;
  let peakVal = 0;
  dayCalls.forEach((dc, di) => {
    hourWeights.forEach((hw, hi) => {
      const v = dc * hw;
      if (v > peakVal) { peakVal = v; peakDay = di; peakHour = hi; }
    });
  });

  const hasData = dayCalls.some(c => c > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>No training time data available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Peak annotation */}
      <p
        className="text-[9px] font-semibold uppercase mb-3 font-[Oswald]"
        style={{ color: 'rgb(var(--text-primary))' }}
      >
        Peak: {dayNames[peakDay]}s {hours[peakHour]}-{hours[peakHour + 1] ?? '6pm'}
      </p>
      <div className="flex gap-0">
        {/* Row labels */}
        <div className="flex flex-col gap-[4px] pr-2 pt-0">
          {dayNames.map(d => (
            <div
              key={d}
              className="h-5 flex items-center justify-end text-[9px]"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Grid cells */}
        <div className="flex flex-col gap-[4px]">
          {dayNames.map((_, di) => (
            <div key={di} className="flex gap-[4px]">
              {hourWeights.map((hw, hi) => {
                const val = dayCalls[di] * hw;
                const opacity = Math.max(0.05, val / maxVal * 0.5);
                const isPeak = di === peakDay && hi === peakHour;
                return (
                  <div
                    key={hi}
                    className="h-5 rounded-[3px]"
                    style={{
                      width: '40px',
                      background: `var(--color-coral)`,
                      opacity,
                      outline: isPeak ? '1.5px dashed rgb(var(--text-primary))' : 'none',
                      outlineOffset: '1px',
                    }}
                  />
                );
              })}
            </div>
          ))}
          {/* Hour labels */}
          <div className="flex gap-[4px] mt-1">
            {hours.map(h => (
              <div
                key={h}
                className="mono-cell text-[8px] text-center"
                style={{ width: '40px', color: 'rgb(var(--text-muted))' }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
