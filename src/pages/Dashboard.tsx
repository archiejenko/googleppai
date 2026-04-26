import {
  Target, Phone, CheckCircle, Award, Zap, BookOpen, Calendar,
  GitCompareArrows, AlertTriangle, ChevronRight, Briefcase,
  Mic, Video, BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

// Components
import { useAuth } from '../context/AuthContext';
import { useTier } from '../context/TierContext';
import { useUserPerformance } from '../hooks/useUserPerformance';
import { useTransferGapEfficacy } from '../hooks/useTransferGap';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import RepNudgeBanner from '../features/rep-coaching/RepNudgeBanner';
import AssignedPlaybookCard from '../features/insights/AssignedPlaybookCard';
import MetricTile from '../components/dashboard/MetricTile';
import RepsAtRiskTable from '../components/dashboard/RepsAtRiskTable';
import GrowthHeatmap from '../components/dashboard/GrowthHeatmap';
import CoachNotes from '../components/dashboard/CoachNotes';
import PerformanceMomentum from '../components/dashboard/PerformanceMomentum';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import RepDNACard from '../features/rep-dna/RepDNACard';
import DailyDrillWidget from '../features/daily-drill/DailyDrillWidget';
import DealPrepModal from '../features/deal-prep/DealPrepModal';
import SimPerformanceCard from '../features/training-analytics/SimPerformanceCard';
import PeerBenchmarkingCard from '../features/peer-benchmarking/PeerBenchmarkingCard';
import { StartLiveSessionButton } from '../components/live/OastLiveWidget';

function TransferGapWidget() {
    const navigate = useNavigate();
    const { isRevIntel } = useTier();
    const { data: efficacy, isLoading } = useTransferGapEfficacy();

    if (!isRevIntel) return null;
    if (isLoading) return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-5 animate-pulse h-24" />
    );
    if (!efficacy || efficacy.total_reps_analysed === 0) return (
        <div className="card-os rounded-xl p-5 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))] h-full flex flex-col">
            <div className="card-title">Transfer Gap</div>
            <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-[rgb(var(--text-muted))]">No data yet</p>
            </div>
        </div>
    );

    const avgGap = efficacy.avg_transfer_gap ?? 0;
    const gapColor = avgGap >= 15 ? 'var(--color-coral, #FF6B6B)' : avgGap >= 8 ? 'var(--color-amber, #FBBF24)' : 'var(--color-green, #4ADE80)';

    return (
        <button
            onClick={() => navigate('/transfer-gap')}
            className="w-full text-left card-os rounded-xl p-5 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))] hover:border-[rgba(255,107,107,0.3)] transition-all group h-full flex flex-col"
        >
            <div className="card-title flex items-center justify-between">
                <span>Transfer Gap</span>
                <ChevronRight className="w-4 h-4 text-[rgb(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
                {efficacy.rep_snapshots?.slice(0, 6).map((rep, i) => {
                    const gap = rep.transfer_gap_overall ?? 0;
                    const barColor = gap >= 30 ? '#FF6B6B' : gap >= 15 ? '#FBBF24' : '#4ADE80';
                    const initials = rep.rep_id.substring(0, 2).toUpperCase();
                    return (
                        <div key={rep.rep_id}>
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[8px] font-bold"
                                    style={{
                                        fontFamily: "'Oswald', sans-serif",
                                        background: `${barColor}1F`,
                                        color: barColor,
                                    }}
                                >
                                    {initials}
                                </span>
                                <span className="flex-1 text-[11px] text-[rgb(var(--text-primary))]">Rep {i + 1}</span>
                                <span
                                    className="text-xs font-semibold w-8 text-right"
                                    style={{ fontFamily: "'Oswald', sans-serif", color: barColor }}
                                >
                                    {Math.round(gap)}%
                                </span>
                            </div>
                            <div className="h-1 rounded-sm mt-1" style={{ background: 'rgb(var(--border-default))' }}>
                                <div
                                    className="h-full rounded-sm"
                                    style={{ width: `${Math.min(gap, 100)}%`, background: barColor }}
                                />
                            </div>
                        </div>
                    );
                })}
                {(!efficacy.rep_snapshots || efficacy.rep_snapshots.length === 0) && (
                    <p className="text-xs text-[rgb(var(--text-muted))]">No rep data yet</p>
                )}
            </div>
            {efficacy.reps_with_decay > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[rgb(var(--border-default))]">
                    <AlertTriangle className="w-3 h-3 text-[#FBBF24]" />
                    <p className="text-[10px] text-[#FBBF24]">
                        {efficacy.reps_with_decay} rep{efficacy.reps_with_decay !== 1 ? 's' : ''} showing skill decay
                    </p>
                </div>
            )}
        </button>
    );
}

export default function Dashboard() {
    const { user, isManager } = useAuth();
    const { weeklyTarget, isRevIntel } = useTier();
    const [dealPrepOpen, setDealPrepOpen] = useState(false);
    const { data, isLoading: loading, error, refetch } = useUserPerformance(user?.id);

    const performance = data?.performance ?? null;
    const momentum = data?.momentum ?? null;
    const fetchError = error ? (error as Error).message : null;

    // Calculate Stats from View
    const weeklyCalls = performance?.weekly_pitches || 0;
    const quotaAttainment = Math.round((weeklyCalls / weeklyTarget) * 100);
    const averageScore = performance?.avg_score || 0;
    const conversionRate = performance?.high_score_rate || 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <LoadingSpinner message="Loading dashboard..." size="lg" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <ErrorMessage
                    error={fetchError}
                    onRetry={refetch}
                    showSupport={true}
                />
            </div>
        );
    }

    // Zero-data empty state for new users
    const isZeroData = !loading && !fetchError && weeklyCalls === 0 && averageScore === 0;

    if (isZeroData) {
        return (
            <div className="pb-8 space-y-5">
                {/* ── Page Header ── */}
                <div className="flex justify-between items-start">
                    <DashboardHeader userName={user?.name || user?.email?.split('@')[0] || 'User'} streakCount={momentum?.streak_count} />
                    <div className="flex gap-2 items-center">
                        <Link
                            to="/analytics"
                            className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-all"
                        >
                            Export
                        </Link>
                        <Link
                            to="/training"
                            className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:opacity-90 transition-all"
                        >
                            Start Session
                        </Link>
                    </div>
                </div>

                {/* ── 5 Stat Cards (empty) ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Active Reps', value: '0', color: 'rgb(var(--text-primary))' },
                        { label: 'Sessions This Week', value: '0', color: 'rgb(var(--text-primary))' },
                        { label: 'Avg Training Score', value: '—', color: 'rgb(var(--text-muted))' },
                        { label: 'Avg Transfer Gap', value: '—', color: 'rgb(var(--text-muted))' },
                        { label: 'Pipeline Value', value: '—', color: 'rgb(var(--text-muted))' },
                    ].map((s) => (
                        <div key={s.label} className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-4">
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value mt-1.5" style={{ color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* ── Onboarding CTA ── */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-10 text-center max-w-2xl mx-auto space-y-6">
                    <div className="w-14 h-14 flex items-center justify-center bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.3)] rounded-xl mx-auto">
                        <Zap className="w-7 h-7 text-[#FF6B6B]" />
                    </div>
                    <div>
                        <h2 className="text-xl text-[rgb(var(--text-primary))] mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            You're all set. Time to practise.
                        </h2>
                        <p className="text-sm text-[rgb(var(--text-secondary))] max-w-sm mx-auto">
                            Your dashboard will fill up with metrics, scores, and coaching insights as you complete training sessions.
                            Start your first session now.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                        {[
                            { icon: Zap, label: 'Start Training', desc: 'Run your first AI simulation', href: '/training' },
                            { icon: BookOpen, label: 'Explore Library', desc: 'Read sales methodology guides', href: '/library' },
                            { icon: Calendar, label: 'Book a Session', desc: 'Schedule coaching or practice', href: '/schedule' },
                        ].map(({ icon: Icon, label, desc, href }) => (
                            <Link
                                key={label}
                                to={href}
                                className="flex items-start gap-3 p-3 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-deep))] rounded-lg hover:bg-[rgb(var(--bg-surface-raised))] hover:border-[rgba(255,107,107,0.3)] transition-all"
                            >
                                <Icon className="w-4 h-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-[rgb(var(--text-primary))]">{label}</p>
                                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">{desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Empty grid sections ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <DailyDrillWidget userId={user?.id} delay={0} />
                    <RepDNACard userId={user?.id} delay={0.05} />
                    {isRevIntel && (
                        <button
                            onClick={() => setDealPrepOpen(true)}
                            className="bg-[rgb(var(--bg-surface-raised))] border border-[rgba(255,107,107,0.3)] rounded-xl p-5 text-left hover:border-[rgba(255,107,107,0.5)] transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-4 h-4 text-[#FF6B6B]" />
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">Deal-Linked Prep</p>
                            </div>
                            <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                                Train against a real deal persona before your next call.
                            </p>
                            <p className="text-xs text-[#FF6B6B] mt-2 group-hover:underline">Start deal prep &rarr;</p>
                        </button>
                    )}
                </div>

                <DealPrepModal open={dealPrepOpen} onClose={() => setDealPrepOpen(false)} />
            </div>
        );
    }

    return (
        <div className="pb-8 space-y-5">
            {/* ── Page Header ── */}
            <div className="flex justify-between items-start">
                <DashboardHeader userName={user?.name || user?.email?.split('@')[0] || 'User'} streakCount={momentum?.streak_count} />
                <div className="flex gap-2 items-center">
                    <Link
                        to="/analytics"
                        className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-all"
                    >
                        Export
                    </Link>
                    {isRevIntel && <StartLiveSessionButton />}
                    <Link
                        to="/training"
                        className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:opacity-90 transition-all"
                    >
                        Start Session
                    </Link>
                </div>
            </div>

            <AssignedPlaybookCard />
            <RepNudgeBanner />

            {/* ── Row 0: 5-col Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <MetricTile
                    label="Quota Attainment"
                    value={`${Math.min(quotaAttainment, 100)}%`}
                    icon={Target}
                    trend={quotaAttainment - 100}
                    trendLabel="vs target"
                    delay={0}
                />
                <MetricTile
                    label="Weekly Calls"
                    value={weeklyCalls.toString()}
                    icon={Phone}
                    trend={weeklyCalls - weeklyTarget}
                    trendUnit=""
                    isPositive={weeklyCalls >= weeklyTarget}
                    trendLabel={`vs target (${weeklyTarget})`}
                    delay={0.1}
                />
                <MetricTile
                    label="High Score Rate"
                    value={`${conversionRate}%`}
                    icon={CheckCircle}
                    trend={conversionRate - 20}
                    trendLabel="vs avg"
                    delay={0.2}
                />
                <MetricTile
                    label="Avg Confidence"
                    value={averageScore.toString()}
                    icon={Award}
                    trend={averageScore - 60}
                    trendLabel="rolling 30d"
                    delay={0.3}
                />
                {/* 5th card: Pipeline / Sessions this week */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-4">
                    <div className="stat-label">Sessions This Week</div>
                    <div className="stat-value mt-1.5 text-[rgb(var(--text-primary))]">
                        {momentum?.sessions_this_week ?? 0}
                    </div>
                </div>
            </div>

            {/* ── Row 1: 2fr / 1fr  -  Trend chart + Team snapshot ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                {/* Training Score Trend / Growth Heatmap */}
                <div className="min-h-[300px]">
                    <GrowthHeatmap />
                </div>
                {/* Team Snapshot / Focus Areas */}
                <div className="min-h-[300px]">
                    <RepsAtRiskTable />
                </div>
            </div>

            {/* ── Row 2: 3-col  -  Quick Actions + Transfer Gap + Recent Sessions / Sim ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Quick Actions */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-5">
                    <div className="card-title">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                        <Link
                            to="/training"
                            className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg p-3 hover:border-[rgba(255,107,107,0.4)] hover:bg-[rgb(var(--bg-surface-raised))] transition-all"
                        >
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                                style={{ background: 'rgba(255,107,107,0.12)' }}
                            >
                                <Mic className="w-4 h-4 text-[#FF6B6B]" />
                            </div>
                            <div className="text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                New Session
                            </div>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Start a training sim</div>
                        </Link>
                        <Link
                            to="/recordings"
                            className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg p-3 hover:border-[rgba(255,107,107,0.4)] hover:bg-[rgb(var(--bg-surface-raised))] transition-all"
                        >
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                                style={{ background: 'rgba(96,165,250,0.12)' }}
                            >
                                <Video className="w-4 h-4 text-[#60A5FA]" />
                            </div>
                            <div className="text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                Review
                            </div>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Watch recordings</div>
                        </Link>
                        <Link
                            to="/goals"
                            className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg p-3 hover:border-[rgba(255,107,107,0.4)] hover:bg-[rgb(var(--bg-surface-raised))] transition-all"
                        >
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                                style={{ background: 'rgba(74,222,128,0.12)' }}
                            >
                                <Target className="w-4 h-4 text-[#4ADE80]" />
                            </div>
                            <div className="text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                Set Goals
                            </div>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Update team OKRs</div>
                        </Link>
                        <Link
                            to="/drills"
                            className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg p-3 hover:border-[rgba(255,107,107,0.4)] hover:bg-[rgb(var(--bg-surface-raised))] transition-all"
                        >
                            <div
                                className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                                style={{ background: 'rgba(167,139,250,0.12)' }}
                            >
                                <BarChart3 className="w-4 h-4 text-[#A78BFA]" />
                            </div>
                            <div className="text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                Drills
                            </div>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Assign new drills</div>
                        </Link>
                    </div>
                </div>

                {/* Transfer Gap Mini */}
                {isManager ? (
                    <TransferGapWidget />
                ) : (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-5">
                        <SimPerformanceCard userId={user?.id} compact />
                    </div>
                )}

                {/* Recent Sessions / Sim Performance */}
                {isManager ? (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-5">
                        <SimPerformanceCard userId={user?.id} compact />
                    </div>
                ) : (
                    <TransferGapWidget />
                )}
            </div>

            {/* ── Row 3: 2-col  -  AI Coaching Insights + Activity Feed ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AI Coaching Insights / Coach Notes */}
                <CoachNotes delay={0.5} />

                {/* Activity Feed / Momentum */}
                <div className="flex flex-col gap-4">
                    {momentum && (
                        <PerformanceMomentum data={momentum} delay={0.4} />
                    )}
                    {!isManager && (
                        <PeerBenchmarkingCard userId={user?.id} />
                    )}
                    {!momentum && !(!isManager) && (
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-xl p-5 flex flex-col items-center justify-center h-full">
                            <p className="text-xs text-[rgb(var(--text-muted))]">No activity yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 4: 2-col  -  Team Skills + Weekly Challenges ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Team Skills / Rep DNA */}
                <RepDNACard userId={user?.id} delay={0.4} />

                {/* Weekly Challenges / Daily Drill */}
                <DailyDrillWidget userId={user?.id} delay={0.35} />
            </div>

            {/* ── Deal Prep (RevIntel) ── */}
            {isRevIntel && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <button
                        onClick={() => setDealPrepOpen(true)}
                        className="bg-[rgb(var(--bg-surface-raised))] border border-[rgba(255,107,107,0.3)] rounded-xl p-5 text-left hover:border-[rgba(255,107,107,0.5)] transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-[#FF6B6B]" />
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">Deal-Linked Prep</p>
                        </div>
                        <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                            Train against a real deal persona before your next call.
                        </p>
                        <p className="text-xs text-[#FF6B6B] mt-2 group-hover:underline">Start deal prep &rarr;</p>
                    </button>
                </div>
            )}

            <DealPrepModal open={dealPrepOpen} onClose={() => setDealPrepOpen(false)} />
        </div>
    );
}
