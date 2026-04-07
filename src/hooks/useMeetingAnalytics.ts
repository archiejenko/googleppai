import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

interface MeetingScores {
  eye_contact_pct?: number;
  posture?: number;
}

export interface RadarPoint {
  subject: string;
  calls: number;
  meetings: number;
}

export interface KpiTrend {
  label: string;
  value: string | number;
  /** Positive = improved vs prior period, negative = declined, null = no prior data */
  delta: number | null;
  up: boolean;
  trendLabel: string;
}

export interface MeetingAnalytics {
  radarData: RadarPoint[];
  /** Average live call score (current user, last 30 days) */
  callAvg: number;
  /** Average meeting score (org scope, last 30 days) */
  meetingAvg: number;
  /** callAvg - meetingAvg. Positive = rep performs better on calls. */
  delta: number;
  kpiTrends: KpiTrend[];
  hasMeetingData: boolean;
  hasCallData: boolean;
}

function avgOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function formatDelta(delta: number | null): { label: string; up: boolean } {
  if (delta === null) return { label: '—', up: true };
  const rounded = Math.round(delta);
  const sign = rounded >= 0 ? '+' : '';
  return { label: `${sign}${rounded} vs prior 30d`, up: rounded >= 0 };
}

export function useMeetingAnalytics(userId: string | undefined) {
  return useQuery<MeetingAnalytics | null>({
    queryKey: ['meeting-analytics', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000).toISOString();

      const [liveCurrent, meetCurrent, meetPrior] = await Promise.all([
        // Current user's live call scores — last 30 days
        supabase
          .from('live_scores')
          .select('final_score, talk_ratio_score, discovery_score, engagement_score, objection_handling_score')
          .eq('rep_id', userId)
          .gte('call_started_at', thirtyDaysAgo)
          .not('final_score', 'is', null),

        // Meeting sessions — last 30 days (RLS scopes to org)
        supabase
          .from('meeting_sessions')
          .select('overall_score, meddic_score, talk_ratio, presence_score, scores')
          .gte('started_at', thirtyDaysAgo)
          .not('overall_score', 'is', null),

        // Meeting sessions — prior 30 days (for delta)
        supabase
          .from('meeting_sessions')
          .select('overall_score, meddic_score, talk_ratio, presence_score, scores')
          .gte('started_at', sixtyDaysAgo)
          .lt('started_at', thirtyDaysAgo)
          .not('overall_score', 'is', null),
      ]);

      const lc = liveCurrent.data ?? [];
      const mc = meetCurrent.data ?? [];
      const mp = meetPrior.data ?? [];

      const hasMeetingData = mc.length > 0;
      const hasCallData = lc.length > 0;

      // ── Radar data ───────────────────────────────────────────────────────────
      // Only include dimensions where at least one channel has real data.
      // 0 is shown for channels that don't capture a given dimension.
      const radarData: RadarPoint[] = [
        {
          subject: 'Overall',
          calls: avgOf(lc.map(s => s.final_score ?? 0)),
          meetings: avgOf(mc.map(s => s.overall_score ?? 0)),
        },
        {
          subject: 'Talk Ratio',
          calls: avgOf(lc.map(s => s.talk_ratio_score ?? 0)),
          meetings: avgOf(mc.map(s => s.talk_ratio ?? 0)),
        },
        {
          subject: 'Engagement',
          calls: avgOf(lc.map(s => s.engagement_score ?? 0)),
          meetings: avgOf(mc.map(s => s.presence_score ?? 0)),
        },
        {
          subject: 'Discovery',
          calls: avgOf(lc.map(s => s.discovery_score ?? 0)),
          meetings: avgOf(mc.map(s => s.meddic_score ?? 0)),
        },
        {
          subject: 'Objections',
          calls: avgOf(lc.map(s => s.objection_handling_score ?? 0)),
          meetings: 0,
        },
      ];

      // ── Call vs Meeting averages ─────────────────────────────────────────────
      const callAvg = avgOf(lc.map(s => s.final_score ?? 0));
      const meetingAvg = avgOf(mc.map(s => s.overall_score ?? 0));
      // delta positive → doing better on calls than meetings
      const delta = callAvg > 0 && meetingAvg > 0 ? callAvg - meetingAvg : 0;

      // ── Presence KPIs with period-over-period delta ──────────────────────────
      const hasPriorMeetData = mp.length > 0;

      const currEyeContact = avgOf(mc.map(s => ((s.scores as MeetingScores)?.eye_contact_pct) ?? 0));
      const prevEyeContact = hasPriorMeetData
        ? avgOf(mp.map(s => ((s.scores as MeetingScores)?.eye_contact_pct) ?? 0))
        : null;
      const eyeDelta = prevEyeContact !== null ? currEyeContact - prevEyeContact : null;
      const { label: eyeLabel, up: eyeUp } = formatDelta(eyeDelta);

      const currPosture = avgOf(mc.map(s => ((s.scores as MeetingScores)?.posture) ?? 0));
      const prevPosture = hasPriorMeetData
        ? avgOf(mp.map(s => ((s.scores as MeetingScores)?.posture) ?? 0))
        : null;
      const postureDelta = prevPosture !== null ? currPosture - prevPosture : null;
      const { label: postureLabel, up: postureUp } = formatDelta(postureDelta);

      const currPresence = avgOf(mc.map(s => s.presence_score ?? 0));
      const prevPresence = hasPriorMeetData
        ? avgOf(mp.map(s => s.presence_score ?? 0))
        : null;
      const presenceDelta = prevPresence !== null ? currPresence - prevPresence : null;
      const { label: presenceLabel, up: presenceUp } = formatDelta(presenceDelta);

      const kpiTrends: KpiTrend[] = [
        { label: 'Eye Contact Avg', value: `${currEyeContact}%`, delta: eyeDelta, up: eyeUp, trendLabel: eyeLabel },
        { label: 'Posture Score',   value: currPosture,          delta: postureDelta, up: postureUp, trendLabel: postureLabel },
        { label: 'Presence Score',  value: currPresence,         delta: presenceDelta, up: presenceUp, trendLabel: presenceLabel },
      ];

      return { radarData, callAvg, meetingAvg, delta, kpiTrends, hasMeetingData, hasCallData };
    },
  });
}
