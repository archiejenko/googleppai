import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import AvatarChip from '../../components/shared/AvatarChip';
import EmptyState from '../../components/shared/EmptyState';

function RankChange({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-xs text-[#4ADE80] font-semibold"><TrendingUp className="w-3 h-3" />+{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-xs text-[#FF6B6B] font-semibold"><TrendingDown className="w-3 h-3" />{change}</span>;
  return <span className="flex items-center gap-0.5 text-xs text-[rgb(var(--text-muted))] font-semibold"><Minus className="w-3 h-3" />-</span>;
}

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#D97706'];

function AnimatedNumber({ target, delay = 0 }: { target: number; delay?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 900;
      const raf = requestAnimationFrame(function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(ease * target));
        if (t < 1) requestAnimationFrame(tick);
      });
      return () => cancelAnimationFrame(raf);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);
  return <>{val}</>;
}


export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');

  const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 3650;
  const { data: board = [], isLoading: loading } = useLeaderboard(user?.id, days);

  const podiumOrder = board.length >= 3 ? [board[1], board[0], board[2]] : board;
  const tableRows = board.slice(3);

  return (
    <div className="pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="page-kicker">Coaching</p>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-desc">Team rankings by composite score: training performance, Transfer Gap, session volume, and win rate.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {(['weekly', 'monthly', 'alltime'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`filter-pill ${period === p ? 'active' : ''}`}
          >
            {p === 'alltime' ? 'All Time' : p === 'weekly' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg animate-pulse" />)}
        </div>
      ) : board.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No leaderboard data yet"
          description="Complete practice sessions to appear on the leaderboard. Join a team to compete with peers."
          action={{ label: 'Start Training', onClick: () => navigate('/training') }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Main leaderboard */}
          <div className="space-y-6">
            {/* Podium */}
            {podiumOrder.length >= 2 && (
              <div className="flex items-end justify-center gap-4 py-5">
                {podiumOrder.map((entry, i) => {
                  const position = i === 0 ? 1 : i === 1 ? 0 : 2;
                  const medalColor = MEDAL_COLORS[position];
                  const isFirst = position === 0;
                  return (
                    <div
                      key={entry.userId}
                      className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg text-center relative overflow-hidden"
                      style={{ width: isFirst ? 230 : 200, padding: isFirst ? '20px 20px 28px' : '20px' }}
                    >
                      {/* Top gradient bar */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: medalColor }} />

                      {/* Rank */}
                      <p className="text-3xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif", color: medalColor, lineHeight: 1 }}>
                        {entry.rank}
                      </p>

                      {/* Avatar */}
                      <div
                        className="mx-auto mb-2.5 rounded-lg flex items-center justify-center font-bold"
                        style={{
                          width: isFirst ? 56 : 48,
                          height: isFirst ? 56 : 48,
                          background: `${medalColor}18`,
                          color: medalColor,
                          fontFamily: "'Oswald', sans-serif",
                          fontSize: isFirst ? 18 : 16,
                        }}
                      >
                        {(entry.name || entry.email || '?').slice(0, 2)}
                      </div>

                      {/* Name & role */}
                      <p className="font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif", fontSize: isFirst ? 18 : 16 }}>
                        {entry.name}
                      </p>
                      {entry.isCurrentUser && (
                        <span className="text-[8px] font-bold bg-[rgb(var(--accent-primary))] text-white px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          YOU
                        </span>
                      )}

                      {/* Score */}
                      <p className="mt-2" style={{ fontFamily: "'Oswald', sans-serif", fontSize: isFirst ? 34 : 28, fontWeight: 700, color: medalColor }}>
                        <AnimatedNumber target={entry.score} delay={position * 150} />
                      </p>
                      <p className="text-[9px] text-[rgb(var(--text-muted))] uppercase tracking-widest">Points</p>

                      {/* Stats row */}
                      <div className="flex justify-center gap-4 mt-3">
                        <div className="text-center">
                          <p className="text-sm font-semibold" style={{ fontFamily: "'Oswald', sans-serif", color: entry.winRate >= 40 ? '#4ADE80' : entry.winRate >= 30 ? '#FBBF24' : '#FF6B6B' }}>
                            {entry.winRate}%
                          </p>
                          <p className="text-[8px] text-[rgb(var(--text-muted))] uppercase tracking-wider">Win Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            {entry.calls}
                          </p>
                          <p className="text-[8px] text-[rgb(var(--text-muted))] uppercase tracking-wider">Sessions</p>
                        </div>
                      </div>
                      <div className="mt-2"><RankChange change={entry.rankChange} /></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table */}
            {tableRows.length > 0 && (
              <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                <p className="card-title">Full Rankings</p>
                <p className="text-[10px] text-[rgb(var(--text-muted))] mb-4">Composite score breakdown for remaining team members.</p>
                <table className="table-os">
                  <thead>
                    <tr>
                      {['#', 'Rep', 'Score', 'Sessions', 'Win Rate', 'XP', 'Move'].map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((entry, i) => (
                      <motion.tr
                        key={entry.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <td style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, color: 'rgb(var(--text-muted))' }}>
                          {entry.rank}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <AvatarChip name={entry.name} seed={entry.email} showName />
                            {entry.isCurrentUser && (
                              <span className="pill pill-coral text-[9px]">You</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                          <AnimatedNumber target={entry.score} delay={i * 80} />
                        </td>
                        <td>{entry.calls}</td>
                        <td>
                          <span className="font-semibold" style={{ color: entry.winRate >= 40 ? '#4ADE80' : entry.winRate >= 30 ? '#FBBF24' : '#FF6B6B' }}>
                            {entry.winRate}%
                          </span>
                        </td>
                        <td>{entry.xp.toLocaleString()} XP</td>
                        <td><RankChange change={entry.rankChange} /></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Your Stats card */}
            {(() => {
              const me = board.find(e => e.isCurrentUser);
              if (!me) return null;
              return (
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                  <p className="card-title">Your Stats</p>
                  <p className="text-[10px] text-[rgb(var(--text-muted))] mb-4">Your current standings this period.</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Rank</span>
                      <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">#{me.rank}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Avg Score</span>
                      <span className="text-[11px] font-semibold" style={{ color: me.score >= 80 ? '#4ADE80' : me.score >= 60 ? '#FBBF24' : '#FF6B6B' }}>
                        {me.score > 0 ? me.score : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Sessions</span>
                      <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">{me.calls}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Best Score</span>
                      <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">{me.bestScore > 0 ? me.bestScore : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Win Rate</span>
                      <span className="text-[11px] font-semibold" style={{ color: me.winRate >= 40 ? '#4ADE80' : me.winRate >= 30 ? '#FBBF24' : '#FF6B6B' }}>
                        {me.winRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)]">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Rank Change</span>
                      <RankChange change={me.rankChange} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[11px] text-[rgb(var(--text-muted))]">Total XP</span>
                      <span className="text-[11px] font-semibold text-[var(--color-coral)]">{me.xp.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Achievements card */}
            {(() => {
              const me = board.find(e => e.isCurrentUser);
              if (!me) return null;
              const achievements = [
                { emoji: '🏆', label: 'Ranked #1', earned: me.rank === 1 },
                { emoji: '🎯', label: 'Pass rate >= 80%', earned: me.winRate >= 80 },
                { emoji: '🔥', label: '10+ sessions', earned: me.calls >= 10 },
              ];
              return (
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                  <p className="card-title">Achievements</p>
                  <div className="space-y-2">
                    {achievements.map(a => (
                      <div key={a.label} className={`flex gap-2 text-xs ${a.earned ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-muted))] opacity-40'}`}>
                        <span>{a.emoji}</span>
                        <span>{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
