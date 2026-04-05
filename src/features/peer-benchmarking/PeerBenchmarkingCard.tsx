import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  usePeerBenchmarking,
  percentileTier,
  percentileLabel,
  type SkillPercentile,
} from '../../hooks/usePeerBenchmarking';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B'
const AMBER  = '#F59E0B'
const GREEN  = '#10B981'

const TIER_COLOR: Record<'top' | 'mid' | 'bottom', string> = {
  top:    GREEN,
  mid:    AMBER,
  bottom: CORAL,
}

const BUCKET_LABELS = ['0–20', '21–40', '41–60', '61–80', '81–100']

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Percentile pill ───────────────────────────────────────────────────────────

export function PercentilePill({ skill }: { skill: SkillPercentile }) {
  if (skill.percentileRank === null) {
    return (
      <span
        className="px-2 py-0.5 text-[9px] font-semibold"
        style={{
          color: 'rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        data-testid="insufficient-pill"
      >
        Insufficient cohort
      </span>
    )
  }

  const tier  = percentileTier(skill.percentileRank)
  const color = TIER_COLOR[tier]
  const label = percentileLabel(skill.percentileRank)

  return (
    <span
      className="px-2 py-0.5 text-[9px] font-bold"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}44` }}
      data-testid="percentile-pill"
      data-tier={tier}
    >
      {label}
    </span>
  )
}

// ── Mini distribution chart ───────────────────────────────────────────────────

function MiniDistribution({
  skill,
  onClose,
}: { skill: SkillPercentile; onClose: () => void }) {
  const maxCount = Math.max(...skill.buckets, 1)

  // Which bucket does the rep's score fall in?
  const repBucketIdx = skill.repScore === null ? -1
    : skill.repScore <= 20 ? 0
    : skill.repScore <= 40 ? 1
    : skill.repScore <= 60 ? 2
    : skill.repScore <= 80 ? 3
    : 4

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="absolute z-20 left-0 right-0 top-full mt-1 border border-[rgb(var(--border-default))] shadow-xl p-3"
      style={{ backgroundColor: '#161618' }}
    >
      <div className="flex items-end justify-between mb-1">
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
          Cohort distribution
        </p>
        <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-end gap-1 h-12" data-testid="distribution-chart">
        {skill.buckets.map((count, idx) => {
          const heightPct = (count / maxCount) * 100
          const isRepHere = idx === repBucketIdx
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="relative w-full flex items-end justify-center" style={{ height: 40 }}>
                <div
                  className="w-full"
                  style={{
                    height:          `${Math.max(2, heightPct)}%`,
                    backgroundColor: isRepHere ? `${CORAL}99` : 'rgba(255,255,255,0.12)',
                  }}
                  data-testid={`bucket-bar-${idx}`}
                />
                {isRepHere && (
                  <div
                    className="absolute bottom-full mb-0.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: CORAL }}
                    data-testid="rep-position-dot"
                  />
                )}
              </div>
              <span className="text-[8px] text-[rgb(var(--text-muted))] tabular-nums leading-none">
                {BUCKET_LABELS[idx]}
              </span>
            </div>
          )
        })}
      </div>

      {skill.percentileRank !== null && (
        <p className="text-[9px] text-[rgb(var(--text-muted))] mt-2">
          Cohort: {skill.cohortSize} reps
          {skill.jobRole && ` · ${skill.jobRole}`}
          {skill.tenureBand && ` · ${skill.tenureBand} tenure`}
        </p>
      )}
    </motion.div>
  )
}

// ── Single skill card ─────────────────────────────────────────────────────────

function SkillCard({
  skill,
  expanded,
  onClick,
}: { skill: SkillPercentile; expanded: boolean; onClick: () => void }) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="w-full text-left border border-[rgb(var(--border-default))] p-3 hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
        aria-expanded={expanded}
        aria-label={`${skill.skillLabel} percentile card`}
      >
        <p className="text-[10px] font-semibold text-[rgb(var(--text-secondary))] leading-tight mb-2">
          {skill.skillLabel}
        </p>

        <div className="flex items-end justify-between gap-1">
          <p
            className="text-2xl font-black tabular-nums leading-none"
            style={{ fontFamily: 'Oswald, sans-serif', color: 'rgb(var(--text-primary))' }}
          >
            {skill.repScore !== null ? Math.round(skill.repScore) : '—'}
          </p>
          <PercentilePill skill={skill} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <MiniDistribution skill={skill} onClose={onClick} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface PeerBenchmarkingCardProps {
  userId: string | undefined
  days?:  number
}

export default function PeerBenchmarkingCard({ userId, days = 30 }: PeerBenchmarkingCardProps) {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const { data: skills, isLoading } = usePeerBenchmarking(userId ?? null, days)

  function toggleSkill(key: string) {
    setExpandedSkill(prev => prev === key ? null : key)
  }

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-5">
      <div className="mb-4">
        <h2
          className="text-base font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Peer Benchmarking
        </h2>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Your score vs reps in the same role and tenure band
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {(skills ?? []).map(skill => (
            <SkillCard
              key={skill.skillName}
              skill={skill}
              expanded={expandedSkill === skill.skillName}
              onClick={() => toggleSkill(skill.skillName)}
            />
          ))}
        </div>
      )}

      {/* Tier legend */}
      {!isLoading && (skills?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-[rgb(var(--text-muted))]">
          {(['top', 'mid', 'bottom'] as const).map(tier => (
            <div key={tier} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
              <span>
                {tier === 'top' ? 'Top third (≥67th)' : tier === 'mid' ? 'Middle third' : 'Bottom third (≤33rd)'}
              </span>
            </div>
          ))}
          <span className="opacity-60">Click card for distribution</span>
        </div>
      )}
    </div>
  )
}
