/**
 * OnboardingAccelerationPanel — X3
 *
 * One card per new rep tracking their trajectory to 80% of team avg call score.
 * Line chart showing all new rep trajectories overlaid on the benchmark curve.
 * Can be scoped to a single rep via repId prop (rep self-view).
 */

import { Rocket } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useOnboardingAcceleration, type RepOnboardingData } from '../../hooks/useOnboardingAcceleration'

interface Props {
  repId?: string  // if provided, shows only this rep's card
}

function statusColor(status: RepOnboardingData['status']): string {
  switch (status) {
    case 'proficient':        return '#10B981'
    case 'ahead':             return '#10B981'
    case 'behind':            return '#FF6B6B'
    case 'insufficient_data': return '#6b7280'
  }
}

function statusLabel(status: RepOnboardingData['status'], weeks: number | null): string {
  switch (status) {
    case 'proficient':        return 'Proficiency reached'
    case 'ahead':             return weeks != null ? `${Math.abs(weeks).toFixed(0)}w ahead of benchmark` : 'Ahead of benchmark'
    case 'behind':            return weeks != null ? `${Math.abs(weeks).toFixed(0)}w behind benchmark` : 'Behind benchmark'
    case 'insufficient_data': return 'Insufficient data (< 4 calls)'
  }
}

function RepCard({ rep }: { rep: RepOnboardingData }) {
  const color = statusColor(rep.status)

  return (
    <div className="bg-[#1c1c1f] border border-[#2a2a2e] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-white font-mono font-bold">{rep.rep_name}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">{rep.tenure_months}mo tenure</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono" style={{ color }}>
            {statusLabel(rep.status, rep.weeks_vs_benchmark)}
          </p>
          {rep.projected_date && rep.status !== 'proficient' && (
            <p className="text-xs text-[#6b7280] mt-0.5">
              Projected: {new Date(rep.projected_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </p>
          )}
          {rep.status === 'proficient' && rep.projected_date && (
            <p className="text-xs text-[#6b7280] mt-0.5">
              Reached: {new Date(rep.projected_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs font-mono text-[#6b7280] mb-1">
          <span>0</span>
          <span>Target: {rep.target_score.toFixed(0)}</span>
        </div>
        <div className="h-3 bg-[#2a2a2e] relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-700"
            style={{
              width: `${Math.min(100, rep.progress_pct)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono mt-1">
          <span style={{ color }}>
            {rep.current_score != null ? rep.current_score.toFixed(1) : '—'}
          </span>
          <span className="text-[#6b7280]">{rep.progress_pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingAccelerationPanel({ repId }: Props) {
  const { data, isLoading } = useOnboardingAcceleration(repId)

  const reps          = data?.reps ?? []
  const benchCurve    = data?.benchmark_curve ?? []
  const targetScore   = data?.target_score ?? 0

  // Build chart data — align scores by call index
  const maxTrendLen = Math.max(...reps.map(r => r.score_trend.length), benchCurve.length, 1)

  const chartData = Array.from({ length: maxTrendLen }, (_, i) => {
    const point: Record<string, number | undefined> = { index: i }
    for (const rep of reps) {
      if (rep.score_trend[i]) point[rep.rep_id] = rep.score_trend[i].score
    }
    if (benchCurve[i]) point['benchmark'] = benchCurve[i].score
    return point
  })

  const isManager = !repId

  return (
    <div className="bg-[#161618] border border-[#2a2a2e]">
      <div className="px-6 py-4 border-b border-[#2a2a2e] flex items-center gap-3">
        <Rocket size={18} className="text-[#10B981]" />
        <div>
          <h2 className="font-display font-bold text-white tracking-wide">
            {isManager ? 'ONBOARDING ACCELERATION' : 'YOUR ONBOARDING PROGRESS'}
          </h2>
          <p className="text-xs text-[#6b7280] mt-0.5">
            {isManager
              ? 'Tracking new rep trajectories to 80% of team average call score'
              : 'Tracking your trajectory to 80% of team average call score'}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
          Computing onboarding trajectories…
        </div>
      )}

      {!isLoading && !reps.length && (
        <div className="px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
          No reps with tenure &lt; 6 months found.{' '}
          {isManager && 'Set tenure_months on rep profiles to enable this panel.'}
        </div>
      )}

      {!isLoading && reps.length > 0 && (
        <>
          {/* Rep cards */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reps.map(rep => <RepCard key={rep.rep_id} rep={rep} />)}
          </div>

          {/* Trend chart — manager view only */}
          {isManager && reps.some(r => r.score_trend.length >= 2) && (
            <div className="px-4 pb-4 border-t border-[#2a2a2e] pt-4">
              <p className="text-xs text-[#6b7280] font-mono mb-3 uppercase tracking-wider">
                Score Trajectories vs Benchmark
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                  <XAxis
                    dataKey="index"
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'DM Mono' }}
                    tickFormatter={v => `Call ${v + 1}`}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'DM Mono' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1c1c1f', border: '1px solid #2a2a2e', borderRadius: 0 }}
                    labelStyle={{ color: '#9ca3af', fontFamily: 'DM Mono', fontSize: 11 }}
                    itemStyle={{ fontFamily: 'DM Mono', fontSize: 11 }}
                    labelFormatter={v => `Call ${Number(v) + 1}`}
                  />
                  {targetScore > 0 && (
                    <ReferenceLine
                      y={targetScore}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      label={{ value: 'Target', position: 'right', fill: '#F59E0B', fontSize: 10, fontFamily: 'DM Mono' }}
                    />
                  )}
                  {/* Benchmark curve */}
                  {benchCurve.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      name="Benchmark"
                    />
                  )}
                  {/* Rep lines */}
                  {reps.map(rep => (
                    <Line
                      key={rep.rep_id}
                      type="monotone"
                      dataKey={rep.rep_id}
                      stroke={statusColor(rep.status)}
                      strokeWidth={1.5}
                      dot={false}
                      name={rep.rep_name}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: 'DM Mono', color: '#9ca3af' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
