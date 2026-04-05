/**
 * X1–X4 Cross-Layer Features — Smoke Tests
 *
 * X1 Transfer Index (6 tests):
 *   1. computeRepDelta returns positive improvement for gap direction
 *   2. computeRepDelta returns null when no pre-window snapshots
 *   3. computeRepDelta returns null when no post-window snapshots
 *   4. computeTransferIndex returns null when fewer than 3 reps have data
 *   5. getTransferIndexBand assigns all 4 bands correctly
 *   6. scenarioToSkillKey maps scenario names to correct SkillKeys
 *
 * X2 Playbooks (4 tests):
 *   7. ANONYMISE_TOP_PERFORMERS defaults to false
 *   8. SKILL_TO_SNAPSHOT_DIMENSION has entries for all 7 SkillKeys
 *   9. SKILL_TO_SNAPSHOT_DIMENSION maps champion_building to discovery_gap with gap direction
 *  10. SKILL_TO_SNAPSHOT_DIMENSION maps meddic_qualification to live_avg_overall with score direction
 *
 * X3 Onboarding Acceleration (4 tests):
 *  11. linearRegression computes correct slope and intercept
 *  12. projectThresholdDate returns null when current score already above threshold
 *  13. projectThresholdDate returns a future date when below threshold with positive slope
 *  14. computeOnboardingStatus returns insufficient_data when score count < 4
 *
 * X4 Coaching Triggers (6 tests):
 *  15. filterByType('all') returns all triggers
 *  16. filterByType('deal_risk') returns only deal_risk triggers
 *  17. filterByType('cross_layer') returns only cross_layer triggers (live_score_drop + cross_layer: true)
 *  18. filterByType('training') returns skill_decay and gap_widening triggers
 *  19. isCrossLayerTrigger returns false for regular live_score_drop
 *  20. isCrossLayerTrigger returns true for live_score_drop with cross_layer: true
 */

import { describe, it, expect } from 'vitest'
import {
  computeRepDelta,
  computeTransferIndex,
  scenarioToSkillKey,
} from '../hooks/useTransferIndex'
import {
  getTransferIndexBand,
  SKILL_TO_SNAPSHOT_DIMENSION,
  ANONYMISE_TOP_PERFORMERS,
  SKILL_BENCHMARKS,
} from '../config/benchmarks'
import {
  linearRegression,
  projectThresholdDate,
  computeOnboardingStatus,
} from '../hooks/useOnboardingAcceleration'
import {
  filterByType,
  isCrossLayerTrigger,
  type CoachingTrigger,
} from '../hooks/useCoachingTriggers'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSnap(repId: string, date: string, discovery_gap = 30, live_avg_overall = 60) {
  return { rep_id: repId, snapshot_date: date, discovery_gap, live_avg_overall, engagement_gap: 25, objection_handling_gap: 20, transfer_gap_overall: 35 }
}

function makeTrigger(overrides: Partial<CoachingTrigger> = {}): CoachingTrigger {
  return {
    id:                  't1',
    orgId:               'org1',
    repId:               'rep1',
    repName:             'Alice',
    managerId:           null,
    triggerType:         'skill_decay',
    skillName:           'discovery_questioning',
    severity:            'warning',
    triggerData:         {},
    recommendedModuleId: null,
    createdAt:           '2026-01-01T00:00:00Z',
    resolvedAt:          null,
    snoozedUntil:        null,
    isSnoozed:           false,
    ...overrides,
  }
}

// ── X1: Transfer Index ────────────────────────────────────────────────────────

describe('X1 Transfer Index', () => {
  const completionDate = '2026-03-10T00:00:00Z'
  const repId = 'rep1'

  it('computeRepDelta returns positive improvement for gap direction', () => {
    const snaps = [
      makeSnap(repId, '2026-02-28', 40),  // pre: 7 days before
      makeSnap(repId, '2026-03-21', 20),  // post: 11 days after
    ]
    const delta = computeRepDelta(snaps, completionDate, 'discovery_gap', 'gap')
    // improvement = pre_avg(40) - post_avg(20) = +20
    expect(delta).toBeCloseTo(20)
  })

  it('computeRepDelta returns null when no pre-window snapshots', () => {
    const snaps = [
      makeSnap(repId, '2026-03-21', 20),  // only post
    ]
    const delta = computeRepDelta(snaps, completionDate, 'discovery_gap', 'gap')
    expect(delta).toBeNull()
  })

  it('computeRepDelta returns null when no post-window snapshots', () => {
    const snaps = [
      makeSnap(repId, '2026-02-28', 40),  // only pre
    ]
    const delta = computeRepDelta(snaps, completionDate, 'discovery_gap', 'gap')
    expect(delta).toBeNull()
  })

  it('computeTransferIndex returns null when fewer than 3 reps have data', () => {
    // Only 2 valid deltas
    expect(computeTransferIndex([5, 8, null])).toBeNull()
    expect(computeTransferIndex([null, null])).toBeNull()
  })

  it('getTransferIndexBand assigns all 4 bands correctly', () => {
    expect(getTransferIndexBand(12)).toBe('high')
    expect(getTransferIndexBand(5)).toBe('medium')
    expect(getTransferIndexBand(1)).toBe('low')
    expect(getTransferIndexBand(-3)).toBe('negative')
  })

  it('scenarioToSkillKey maps scenario names to correct SkillKeys', () => {
    expect(scenarioToSkillKey('objection_handling_cold_call')).toBe('objection_handling')
    expect(scenarioToSkillKey('discovery_deep_dive')).toBe('discovery_questioning')
    expect(scenarioToSkillKey('champion_stakeholder_alignment')).toBe('champion_building')
    expect(scenarioToSkillKey('closing_commitment')).toBe('closing_commitment')
    expect(scenarioToSkillKey('unknown_scenario')).toBe('discovery_questioning')  // fallback
  })
})

// ── X2: Playbook Config ───────────────────────────────────────────────────────

describe('X2 Playbook Config', () => {
  it('ANONYMISE_TOP_PERFORMERS defaults to false', () => {
    expect(ANONYMISE_TOP_PERFORMERS).toBe(false)
  })

  it('SKILL_TO_SNAPSHOT_DIMENSION has entries for all 7 SkillKeys', () => {
    const skillKeys = SKILL_BENCHMARKS.map(s => s.key)
    expect(skillKeys).toHaveLength(7)
    for (const key of skillKeys) {
      expect(SKILL_TO_SNAPSHOT_DIMENSION[key]).toBeDefined()
      expect(SKILL_TO_SNAPSHOT_DIMENSION[key].column).toBeTruthy()
      expect(['gap', 'score']).toContain(SKILL_TO_SNAPSHOT_DIMENSION[key].direction)
    }
  })

  it('champion_building maps to discovery_gap with gap direction', () => {
    const mapping = SKILL_TO_SNAPSHOT_DIMENSION['champion_building']
    expect(mapping.column).toBe('discovery_gap')
    expect(mapping.direction).toBe('gap')
  })

  it('meddic_qualification maps to live_avg_overall with score direction', () => {
    const mapping = SKILL_TO_SNAPSHOT_DIMENSION['meddic_qualification']
    expect(mapping.column).toBe('live_avg_overall')
    expect(mapping.direction).toBe('score')
  })
})

// ── X3: Onboarding Acceleration ───────────────────────────────────────────────

describe('X3 Onboarding Acceleration', () => {
  it('linearRegression computes correct slope and intercept', () => {
    // y = 2x + 10 → slope=2, intercept=10
    const ys = [10, 12, 14, 16, 18]
    const { slope, intercept } = linearRegression(ys)
    expect(slope).toBeCloseTo(2)
    expect(intercept).toBeCloseTo(10)
  })

  it('projectThresholdDate returns null when current score already above threshold', () => {
    const scores = [
      { date: '2026-01-01', score: 70 },
      { date: '2026-01-08', score: 75 },
      { date: '2026-01-15', score: 80 },
    ]
    const result = projectThresholdDate(scores, 60)
    expect(result).toBeNull()  // already above threshold
  })

  it('projectThresholdDate returns a future date when below threshold with positive slope', () => {
    const scores = [
      { date: '2026-01-01', score: 30 },
      { date: '2026-01-08', score: 35 },
      { date: '2026-01-15', score: 40 },
      { date: '2026-01-22', score: 45 },
    ]
    const result = projectThresholdDate(scores, 70)
    expect(result).not.toBeNull()
    expect(new Date(result!).getTime()).toBeGreaterThan(new Date('2026-01-22').getTime())
  })

  it('computeOnboardingStatus returns insufficient_data when score count < 4', () => {
    expect(computeOnboardingStatus(55, 70, 3)).toBe('insufficient_data')
    expect(computeOnboardingStatus(55, 70, 0)).toBe('insufficient_data')
  })
})

// ── X4: Coaching Trigger Filtering ───────────────────────────────────────────

describe('X4 Coaching Trigger Filtering', () => {
  const triggers: CoachingTrigger[] = [
    makeTrigger({ id: 't1', triggerType: 'skill_decay',         severity: 'critical' }),
    makeTrigger({ id: 't2', triggerType: 'gap_widening',         severity: 'warning'  }),
    makeTrigger({ id: 't3', triggerType: 'low_commitment_rate',  severity: 'warning'  }),
    makeTrigger({ id: 't4', triggerType: 'deal_risk',            severity: 'critical' }),
    makeTrigger({ id: 't5', triggerType: 'live_score_drop',      triggerData: {}                                        }), // regular
    makeTrigger({ id: 't6', triggerType: 'live_score_drop',      triggerData: { cross_layer: true, skill_name: 'discovery_questioning' } }), // cross-layer
  ]

  it("filterByType('all') returns all triggers", () => {
    expect(filterByType(triggers, 'all')).toHaveLength(6)
  })

  it("filterByType('deal_risk') returns only deal_risk triggers", () => {
    const result = filterByType(triggers, 'deal_risk')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t4')
  })

  it("filterByType('cross_layer') returns only cross-layer triggers", () => {
    const result = filterByType(triggers, 'cross_layer')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t6')
  })

  it("filterByType('training') returns skill_decay and gap_widening triggers", () => {
    const result = filterByType(triggers, 'training')
    const ids = result.map(t => t.id)
    expect(ids).toContain('t1')
    expect(ids).toContain('t2')
    expect(result).toHaveLength(2)
  })

  it('isCrossLayerTrigger returns false for regular live_score_drop', () => {
    const t = makeTrigger({ triggerType: 'live_score_drop', triggerData: {} })
    expect(isCrossLayerTrigger(t)).toBe(false)
  })

  it('isCrossLayerTrigger returns true for live_score_drop with cross_layer: true', () => {
    const t = makeTrigger({ triggerType: 'live_score_drop', triggerData: { cross_layer: true } })
    expect(isCrossLayerTrigger(t)).toBe(true)
  })
})
