import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import AvatarChip from '../../components/shared/AvatarChip';
import EmptyState from '../../components/shared/EmptyState';

function RankChange({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-xs text-[#22c55e] font-bold"><TrendingUp className="w-3 h-3" />+{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-xs text-[#ef4444] font-bold"><TrendingDown className="w-3 h-3" />{change}</span>;
  return <span className="flex items-center gap-0.5 text-xs text-[rgb(var(--text-muted))] font-bold"><Minus className="w-3 h-3" />—</span>;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_LABELS = ['🥇', '🥈', '🥉'];

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
    <div className="pb-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Leaderboard</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">See how you stack up against the team</p>
        </div>
        <div className="flex items-center border border-[rgb(var(--border-default))]">
          {(['weekly', 'monthly', 'alltime'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors
                ${period === p ? 'bg-[rgb(var(--accent-primary))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-raised))]'}`}
            >
              {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] animate-pulse" />)}
        </div>
      ) : board.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No leaderboard data yet"
          description="Complete practice sessions to appear on the leaderboard. Join a team to compete with peers."
          action={{ label: 'Start Training', onClick: () => navigate('/training') }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Podium */}
            {podiumOrder.length >= 2 && (
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-8">
                <div className="flex items-end justify-center gap-6 mb-2">
                  {podiumOrder.map((entry, i) => {
                    const position = i === 0 ? 1 : i === 1 ? 0 : 2;
                    const heights = [140, 100, 80];
                    const h = heights[position] ?? 60;
                    const medalColor = MEDAL_COLORS[position];
                    return (
                      <div key={entry.userId} className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-16 h-16 border-2 flex items-center justify-center" style={{ borderColor: medalColor, background: `${medalColor}18` }}>
                            <span className="text-xl font-black uppercase" style={{ color: medalColor }}>
                              {(entry.name || entry.email || '?').slice(0, 2)}
                            </span>
                          </div>
                          <span className="absolute -top-3 -right-3 text-xl">{MEDAL_LABELS[position]}</span>
                          {entry.isCurrentUser && (
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-[rgb(var(--accent-primary))] text-white px-1">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-[rgb(var(--text-primary))] leading-tight">{entry.name.split(' ')[0]}</p>
                          <p className="text-lg font-black" style={{ color: medalColor }}>
                            <AnimatedNumber target={entry.score} delay={position * 150} />
                          </p>
                          <RankChange change={entry.rankChange} />
                        </div>
                        <div
                          className="w-24 flex items-center justify-center border-t-2 text-xs font-black text-[rgb(var(--text-muted))] uppercase tracking-widest"
                          style={{ height: h, borderColor: medalColor, background: `${medalColor}18` }}
                        >
                          #{entry.rank}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table */}
            {tableRows.length > 0 && (
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border-default))]">
                      {['Rank', 'Rep', 'Score', 'Sessions', 'Pass Rate', 'XP', 'Change'].map(col => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">
                          {col}
                        </th>
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
                        className={`border-b border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-raised))] transition-colors
                          ${entry.isCurrentUser ? 'border-l-4 border-l-[rgb(var(--accent-primary))]' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm font-black text-[rgb(var(--text-muted))]">#{entry.rank}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AvatarChip name={entry.name} seed={entry.email} showName />
                            {entry.isCurrentUser && (
                              <span className="text-xs px-1.5 py-0.5 bg-[rgb(var(--accent-primary)/0.15)] text-[rgb(var(--accent-primary))] border border-[rgb(var(--accent-primary)/0.4)]">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-[rgb(var(--text-primary))]">
                          <AnimatedNumber target={entry.score} delay={i * 80} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">{entry.calls}</td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">{entry.winRate}%</td>
                        <td className="px-4 py-3 text-sm text-[rgb(var(--text-secondary))]">{entry.xp.toLocaleString()} XP</td>
                        <td className="px-4 py-3"><RankChange change={entry.rankChange} /></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Your Stats</p>
            {(() => {
              const me = board.find(e => e.isCurrentUser);
              if (!me) return null;
              return (
                <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--accent-primary)/0.4)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Rank</span>
                    <span className="text-sm font-black text-[rgb(var(--text-primary))]">#{me.rank}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Avg Score</span>
                    <span className="text-sm font-black" style={{ color: me.score >= 80 ? '#22c55e' : me.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {me.score > 0 ? me.score : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Sessions</span>
                    <span className="text-sm font-black text-[rgb(var(--text-primary))]">{me.calls}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Best Score</span>
                    <span className="text-sm font-black text-[rgb(var(--text-primary))]">{me.bestScore > 0 ? me.bestScore : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Pass Rate</span>
                    <span className="text-sm font-black text-[rgb(var(--text-primary))]">{me.winRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Rank Change</span>
                    <RankChange change={me.rankChange} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--text-muted))]">Total XP</span>
                    <span className="text-sm font-black text-[rgb(var(--accent-primary))]">{me.xp.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const me = board.find(e => e.isCurrentUser);
              if (!me) return null;
              const achievements = [
                { emoji: '🏆', label: 'Ranked #1', earned: me.rank === 1 },
                { emoji: '🎯', label: 'Pass rate ≥ 80%', earned: me.winRate >= 80 },
                { emoji: '🔥', label: '10+ sessions', earned: me.calls >= 10 },
              ];
              return (
                <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">Achievements</p>
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
