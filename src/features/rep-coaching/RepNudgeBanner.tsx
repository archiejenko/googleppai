import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, TrendingDown, Activity, BarChart2 } from 'lucide-react';
import { useRepNudge, TRIGGER_TYPE_LABELS, SKILL_LABELS, type TriggerType } from '../../hooks/useCoachingTriggers';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<TriggerType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  skill_decay:         TrendingDown,
  live_score_drop:     Activity,
  gap_widening:        BarChart2,
  low_commitment_rate: AlertTriangle,
  deal_risk:           AlertTriangle,
}

function nudgeMessage(triggerType: TriggerType, skillName: string | null, triggerData: Record<string, unknown>): string {
  switch (triggerType) {
    case 'skill_decay': {
      const skill = skillName ? (SKILL_LABELS[skillName] ?? skillName) : 'a skill'
      return `Your ${skill} score has dropped ${triggerData.drop_pts ?? '?'}pts since your last training session. Time for a refresher.`
    }
    case 'live_score_drop':
      return `Your recent call scores are ${triggerData.drop_pts ?? '?'}pts below your 30-day average. A focused training session could help get you back on track.`
    case 'gap_widening':
      return `The gap between your training and live call performance has widened by ${triggerData.widening_pts ?? '?'}pts this week. Your manager has been notified.`
    default:
      return `Your coach has flagged something for your attention: ${TRIGGER_TYPE_LABELS[triggerType]}.`
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Non-intrusive coaching nudge banner for the rep's home dashboard.
 *
 * Shows the rep's highest-severity unresolved coaching trigger.
 * Dismissing is LOCAL STATE ONLY — no DB write. The trigger remains unresolved
 * and will reappear on next session load until resolved by a manager.
 */
export default function RepNudgeBanner() {
  const { data: trigger, isLoading } = useRepNudge()
  const [dismissed, setDismissed] = useState(false)

  // Don't render during loading, if no trigger, or if dismissed this session
  if (isLoading || !trigger || dismissed) return null

  const Icon         = TRIGGER_ICONS[trigger.triggerType] ?? AlertTriangle
  const isCritical   = trigger.severity === 'critical'
  const accentColor  = isCritical ? '#FF6B6B' : '#F59E0B'
  const message      = nudgeMessage(trigger.triggerType, trigger.skillName, trigger.triggerData)

  return (
    <AnimatePresence>
      <motion.div
        key="nudge-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.3 }}
        className="border px-4 py-3 flex items-start gap-3"
        style={{
          borderColor:     `${accentColor}44`,
          backgroundColor: `${accentColor}0A`,
          borderLeftWidth: 3,
          borderLeftColor: accentColor,
        }}
        role="alert"
        aria-live="polite"
      >
        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: accentColor, fontFamily: 'Oswald, sans-serif' }}
            >
              {TRIGGER_TYPE_LABELS[trigger.triggerType]}
            </span>
            {isCritical && (
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5"
                style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
              >
                Critical
              </span>
            )}
          </div>
          <p className="text-xs text-[rgb(var(--text-secondary,200_200_210))] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Dismiss — local state only, no DB write */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss coaching nudge for this session"
          className="shrink-0 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
