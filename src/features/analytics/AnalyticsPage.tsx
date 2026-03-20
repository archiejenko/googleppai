import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Phone, Award, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import StatCard from '../../components/shared/StatCard';
import FilterBar from '../../components/shared/FilterBar';

const DATE_RANGES = [
  { value: '7d',  label: '7D'  },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

const ACCENT = '#ff6b6b';
const FUNNEL_COLORS = ['#ff6b6b', '#ff8080', '#ff9494', '#ffaaaa', '#ffbfbf', '#ffd4d4'];

const tooltipStyle = {
  backgroundColor: 'rgb(15 23 42)',
  border: '1px solid rgb(30 41 59)',
  color: '#f8fafc',
  fontSize: 12,
  fontFamily: 'Oswald, sans-serif',
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('30d');

  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const { data, isLoading: loading } = useAnalytics(user?.id, days);

  const chartData  = data?.chartData  ?? [];
  const skillRadar = data?.skillRadar ?? [];
  const funnel     = data?.funnel     ?? [];
  const kpis       = data?.kpis       ?? { totalCalls: 0, avgScore: 0, winRate: 0, sessions: 0, prevTotalCalls: 0, prevAvgScore: 0, prevWinRate: 0 };

  return (
    <div className="pb-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Analytics</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">Performance trends and skill insights</p>
        </div>
        <FilterBar
          filters={DATE_RANGES}
          activeFilter={dateRange}
          onFilterChange={setDateRange}
        />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sessions"   value={kpis.totalCalls}        icon={Phone}      delta={kpis.totalCalls - kpis.prevTotalCalls} deltaLabel="vs prev period" delay={0}    />
        <StatCard label="Avg Score"  value={`${kpis.avgScore}/100`} icon={Award}      delta={kpis.avgScore - kpis.prevAvgScore}     deltaLabel="vs prev period" delay={0.05} />
        <StatCard label="Pass Rate"  value={`${kpis.winRate}%`}     icon={TrendingUp} delta={kpis.winRate - kpis.prevWinRate}       deltaLabel="score ≥ 70"     delay={0.1}  />
        <StatCard label="Completed"  value={`${kpis.sessions}`}     icon={Clock}      delta={kpis.sessions - kpis.prevTotalCalls}  deltaLabel="vs prev period"  delay={0.15} />
      </div>

      {/* Call Volume Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6"
      >
        <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-6">
          Session Volume — Last {days} Days
        </h2>
        {loading ? (
          <div className="h-[220px] animate-pulse bg-[rgb(var(--bg-canvas))]" />
        ) : chartData.every(d => d.calls === 0) ? (
          <div className="h-[220px] flex items-center justify-center">
            <p className="text-sm text-[rgb(var(--text-muted))]">No session data in this period. Complete a practice session to see trends.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
              onClick={(e: any) => {
                const pitchId = e?.activePayload?.[0]?.payload?.lastPitchId;
                if (pitchId) navigate(`/pitch/${pitchId}`);
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="callFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(30 41 59)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Oswald' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => v.slice(5)}
                interval={Math.max(1, Math.floor(chartData.length / 6))}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Oswald' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line dataKey="calls"    stroke={ACCENT}    strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT }}    name="Sessions" />
              <Line dataKey="won"      stroke="#60a5fa"   strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} name="Passed (≥70)" />
              <Line dataKey="avgScore" stroke="#a78bfa"   strokeWidth={1} dot={false} strokeDasharray="4 2"                name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center gap-6 mt-4">
          <span className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <span className="w-4 h-0.5 inline-block" style={{ background: ACCENT }} /> Sessions
          </span>
          <span className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <span className="w-4 h-0.5 inline-block bg-blue-400" /> Passed (≥70)
          </span>
          <span className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <span className="w-4 h-0.5 inline-block bg-purple-400" /> Avg Score
          </span>
        </div>
      </motion.div>

      {/* Skill Radar + Score Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6"
        >
          <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-4">Skill Radar</h2>
          {loading ? (
            <div className="h-[280px] animate-pulse bg-[rgb(var(--bg-canvas))]" />
          ) : skillRadar.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center">
              <p className="text-sm text-[rgb(var(--text-muted))] text-center">Complete sessions to build your skill radar.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={skillRadar} cx="50%" cy="50%">
                  <PolarGrid stroke="rgb(30 41 59)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Oswald' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke={ACCENT} fill="rgba(255,107,107,0.15)" fillOpacity={1} strokeWidth={2} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {skillRadar.map(s => (
                  <div key={s.skill} className="flex items-center justify-between text-xs">
                    <span className="text-[rgb(var(--text-muted))]">{s.skill}</span>
                    <span className="font-bold" style={{ color: s.score >= 80 ? '#22c55e' : s.score >= 65 ? '#f59e0b' : '#ef4444' }}>
                      {s.score}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Score Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6"
        >
          <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-4">Score Funnel</h2>
          {loading ? (
            <div className="h-[200px] animate-pulse bg-[rgb(var(--bg-canvas))]" />
          ) : funnel.length === 0 || funnel[0].value === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-[rgb(var(--text-muted))] text-center">No sessions to display yet.</p>
            </div>
          ) : (
            <div className="space-y-2 mt-6">
              {funnel.map((stage, i) => {
                const top = funnel[0].value || 1;
                const pct = Math.round((stage.value / top) * 100);
                const prevVal = i > 0 ? funnel[i - 1].value || 1 : top;
                const convRate = Math.round((stage.value / prevVal) * 100);
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[rgb(var(--text-secondary))] font-bold">{stage.stage}</span>
                      <span className="text-[rgb(var(--text-muted))]">
                        {stage.value} {i > 0 && <span style={{ color: '#f59e0b' }}>({convRate}% conv.)</span>}
                      </span>
                    </div>
                    <div className="h-8 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] relative overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: FUNNEL_COLORS[i], opacity: 0.85 - i * 0.1 }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
