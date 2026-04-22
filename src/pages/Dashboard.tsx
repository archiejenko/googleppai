import { Target, Phone, CheckCircle, Award, Zap, BookOpen, Calendar, GitCompareArrows, AlertTriangle, ChevronRight, Briefcase } from 'lucide-react';
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
        <div className="card-os border border-border p-5 animate-pulse h-24 bg-bg-raised" />
    );
    if (!efficacy || efficacy.total_reps_analysed === 0) return null;

    const avgGap = efficacy.avg_transfer_gap ?? 0;
    const gapColor = avgGap >= 15 ? 'text-status-danger' : avgGap >= 8 ? 'text-status-warning' : 'text-status-success';

    return (
        <button
            onClick={() => navigate('/transfer-gap')}
            className="w-full text-left card-os border border-border p-5 hover:border-accent/40 hover:bg-bg-raised transition-all group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <GitCompareArrows className="w-4 h-4 text-accent" />
                    <p className="text-[10px] uppercase tracking-widest text-text-muted">Transfer Gap</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <p className={`text-2xl ${gapColor}`}>{avgGap.toFixed(1)}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Avg gap (pts)</p>
                </div>
                <div>
                    <p className={`text-2xl ${efficacy.reps_with_decay > 0 ? 'text-status-warning' : 'text-status-success'}`}>
                        {efficacy.reps_with_decay}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Reps decaying</p>
                </div>
                <div>
                    <p className="text-2xl text-text-secondary">{efficacy.total_reps_analysed}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Reps analysed</p>
                </div>
            </div>
            {efficacy.reps_with_decay > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                    <AlertTriangle className="w-3 h-3 text-status-warning" />
                    <p className="text-xs text-status-warning">
                        {efficacy.reps_with_decay} rep{efficacy.reps_with_decay !== 1 ? 's' : ''} showing skill decay — view details
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
            <div className="pb-12 space-y-10">
                <DashboardHeader userName={user?.name || user?.email?.split('@')[0] || 'User'} streakCount={momentum?.streak_count} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <DailyDrillWidget userId={user?.id} delay={0} />
                    <RepDNACard userId={user?.id} delay={0.05} />
                    {isRevIntel && (
                        <button
                            onClick={() => setDealPrepOpen(true)}
                            className="card-os border border-accent/30 p-5 text-left hover:border-accent/60 transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Briefcase className="w-4 h-4 text-accent" />
                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Deal-Linked Prep</p>
                            </div>
                            <p className="text-sm text-text-secondary leading-relaxed">
                                Train against a real deal persona before your next call.
                            </p>
                            <p className="text-xs text-accent mt-2 group-hover:underline">Start deal prep →</p>
                        </button>
                    )}
                </div>
                <div className="border border-border bg-bg-surface p-10 text-center max-w-2xl mx-auto space-y-6">
                    <div className="w-14 h-14 flex items-center justify-center bg-accent/10 border border-accent/30 mx-auto">
                        <Zap className="w-7 h-7 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-xl text-text-primary mb-2">You're all set. Time to practise.</h2>
                        <p className="text-sm text-text-secondary max-w-sm mx-auto">
                            Your dashboard will fill up with metrics, scores, and coaching insights as you complete training sessions.
                            Start your first session now.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                        {[
                            { icon: Zap, label: 'Start Training', desc: 'Run your first AI simulation', href: '/training' },
                            { icon: BookOpen, label: 'Explore Library', desc: 'Read sales methodology guides', href: '/library' },
                            { icon: Calendar, label: 'Book a Session', desc: 'Schedule coaching or practice', href: '/schedule' },
                        ].map(({ icon: Icon, label, desc, href }) => (
                            <Link
                                key={label}
                                to={href}
                                className="flex items-start gap-3 p-4 border border-border bg-bg-canvas hover:bg-bg-raised hover:border-accent/40 transition-all"
                            >
                                <Icon className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-text-primary">{label}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
                <DealPrepModal open={dealPrepOpen} onClose={() => setDealPrepOpen(false)} />
            </div>
        );
    }

    return (
        <div className="pb-12 space-y-10">
            <div className="flex items-center justify-between">
                <DashboardHeader userName={user?.name || user?.email?.split('@')[0] || 'User'} streakCount={momentum?.streak_count} />
                {isRevIntel && <StartLiveSessionButton />}
            </div>
            <AssignedPlaybookCard />
            <RepNudgeBanner />

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            </div>

            {/* Simulation Performance (compact) */}
            <SimPerformanceCard userId={user?.id} compact />

            {/* Rep DNA + Daily Drill + Deal Prep Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DailyDrillWidget userId={user?.id} delay={0.35} />
                <RepDNACard userId={user?.id} delay={0.4} />
                {isRevIntel && (
                    <button
                        onClick={() => setDealPrepOpen(true)}
                        className="card-os border border-accent/30 p-5 text-left hover:border-accent/60 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-accent" />
                            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Deal-Linked Prep</p>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            Train against a real deal persona before your next call.
                        </p>
                        <p className="text-xs text-accent mt-2 group-hover:underline">Start deal prep →</p>
                    </button>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Col 1: Momentum & Coach Notes */}
                <div className="lg:col-span-1 space-y-8">
                    {!isManager && (
                        <PeerBenchmarkingCard userId={user?.id} />
                    )}
                    {momentum && (
                        <PerformanceMomentum data={momentum} delay={0.4} />
                    )}
                    <CoachNotes delay={0.5} />
                </div>

                {/* Col 2: Reps Table (Span 2) */}
                <div className="card-os lg:col-span-2 min-h-[400px]">
                    <RepsAtRiskTable />
                </div>
            </div>

            {/* Row 2: Growth Heatmap — full width */}
            <div className="card-os min-h-[350px]">
                <GrowthHeatmap />
            </div>

            {/* Transfer Gap widget — managers/admins only */}
            {isManager && (
                <div className="max-w-xl">
                    <TransferGapWidget />
                </div>
            )}

            <DealPrepModal open={dealPrepOpen} onClose={() => setDealPrepOpen(false)} />
        </div>
    );
}
