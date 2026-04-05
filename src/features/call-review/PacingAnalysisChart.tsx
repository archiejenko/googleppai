/**
 * PacingAnalysisChart — L8
 *
 * AreaChart on CallReviewPage:
 *   - Y axis: wpm; X axis: window mid-point in seconds
 *   - Shaded optimal zone (140–170 wpm) in green low opacity
 *   - Points coloured coral (too_fast), indigo (too_slow), green (optimal)
 *   - ReferenceLine annotations on out-of-range windows
 *   - Pacing score, avg wpm, variance label in header
 *
 * Wrapped in TierGate.
 */

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceDot,
} from 'recharts'
import TierGate from '../../components/shared/TierGate'
import { useCallPacingWindows, usePacingScore } from '../../hooks/useCallPacing'
import {
  WPM_SHADE_LOW, WPM_SHADE_HIGH, WPM_OPT_LOW, WPM_OPT_HIGH,
  pacingScoreColor, varianceLabel, flagColor,
} from '../../config/pacing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Inner component ───────────────────────────────────────────────────────────

function PacingAnalysisChartInner({ callId }: { callId: string }) {
  const { data: windows, isLoading: wLoading } = useCallPacingWindows(callId)
  const { data: score,   isLoading: sLoading } = usePacingScore(callId)

  const header = (
    <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-4">
      Pacing Analysis
    </p>
  )

  if (wLoading || sLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {header}
        <div className="h-5 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-48 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!windows?.length) {
    return (
      <div>
        {header}
        <p className="text-xs text-[rgb(var(--text-muted))]">No pacing data available.</p>
      </div>
    )
  }

  const scored = windows.filter(w => w.wpm !== null)
  const chartData = scored.map(w => ({
    t:    w.window_start_seconds + 15,  // mid-point of 30s window
    wpm:  w.wpm,
    flag: w.flag,
  }))

  const scoreColor = pacingScoreColor(score?.pacing_score ?? null)
  const varLabel   = varianceLabel(score?.speech_rate_variance ?? null)

  // Out-of-range windows for annotation dots
  const outOfRange = chartData.filter(d => d.flag !== 'optimal')

  return (
    <div className="space-y-4">
      {header}

      {/* Summary stats */}
      <div className="flex flex-wrap gap-5 items-end">
        {score?.pacing_score !== null && score?.pacing_score !== undefined && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Pacing Score</p>
            <span
              className="text-3xl font-black tabular-nums"
              style={{ fontFamily: 'Oswald, sans-serif', color: scoreColor }}
            >
              {Math.round(score.pacing_score)}
            </span>
          </div>
        )}
        {score?.avg_speech_rate_wpm !== null && score?.avg_speech_rate_wpm !== undefined && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Avg WPM</p>
            <span className="text-xl font-bold tabular-nums text-[rgb(var(--text-primary))]">
              {Math.round(score.avg_speech_rate_wpm)}
            </span>
          </div>
        )}
        {varLabel && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Variation</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">{varLabel}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={formatTime}
            tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0, 250]}
            tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1b', border: '1px solid rgb(var(--border-default))', borderRadius: 0, fontSize: 11 }}
            labelFormatter={(v: number) => formatTime(v)}
            formatter={(v: number | undefined) => [`${v ?? 0} wpm`, 'Speech rate']}
          />

          {/* Optimal zone: shaded reference area (ReferenceArea not imported — use two lines) */}
          <ReferenceLine y={WPM_SHADE_HIGH} stroke="#10B981" strokeDasharray="2 4" strokeOpacity={0.35}
            label={{ value: `${WPM_SHADE_HIGH} wpm`, fill: '#10B981', fontSize: 8, position: 'insideTopRight' }} />
          <ReferenceLine y={WPM_SHADE_LOW}  stroke="#10B981" strokeDasharray="2 4" strokeOpacity={0.35}
            label={{ value: `${WPM_SHADE_LOW} wpm`, fill: '#10B981', fontSize: 8, position: 'insideBottomRight' }} />
          <ReferenceLine y={WPM_OPT_HIGH} stroke="#F59E0B" strokeDasharray="1 6" strokeOpacity={0.25} />
          <ReferenceLine y={WPM_OPT_LOW}  stroke="#F59E0B" strokeDasharray="1 6" strokeOpacity={0.25} />

          <Area
            type="monotone"
            dataKey="wpm"
            stroke="#6366F1"
            strokeWidth={1.5}
            fill="url(#wpmGrad)"
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { wpm: number; flag: string } }
              return (
                <circle
                  key={`dot-${cx}`}
                  cx={cx} cy={cy} r={3}
                  fill={flagColor(payload.flag as 'too_fast' | 'too_slow' | 'optimal')}
                  stroke="none"
                />
              )
            }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />

          {/* Annotation dots for out-of-range windows */}
          {outOfRange.map(d => (
            <ReferenceDot
              key={d.t}
              x={d.t} y={(d.wpm ?? 0) + 12}
              r={0}
              label={{
                value:    d.flag === 'too_fast' ? '⚡ Fast' : '🔵 Slow',
                fill:     d.flag === 'too_fast' ? '#FF6B6B' : '#6366F1',
                fontSize: 8,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[9px] text-[rgb(var(--text-muted))]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>Optimal ({WPM_SHADE_LOW}–{WPM_SHADE_HIGH} wpm)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF6B6B]" />
          <span>Too fast (&gt;{WPM_OPT_HIGH} wpm)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
          <span>Too slow (&lt;{WPM_OPT_LOW} wpm)</span>
        </div>
      </div>
    </div>
  )
}

export default function PacingAnalysisChart({ callId }: { callId: string }) {
  return (
    <TierGate>
      <PacingAnalysisChartInner callId={callId} />
    </TierGate>
  )
}
