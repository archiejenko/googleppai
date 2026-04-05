import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import {
  TALK_RATIO_BENCHMARKS,
  isWithinTalkBenchmark,
  type CallStage,
} from '../config/benchmarks';

// ── Per-call hook (Donut) ─────────────────────────────────────────────────────

export interface TalkListenData {
  call_id:           string;
  rep_talk_pct:      number | null;
  prospect_talk_pct: number | null;
  /** DB-inferred or rep-confirmed stage */
  call_stage:        CallStage | null;
  /** Effective stage used for benchmark (falls back to 'discovery' if null) */
  effective_stage:   CallStage;
  /** Rep max for effective stage */
  benchmark_rep_max: number;
  /** Whether rep talk % is within benchmark */
  within_benchmark:  boolean | null;
}

function resolveStage(raw: string | null): CallStage {
  const valid: CallStage[] = ['discovery', 'demo', 'proposal', 'negotiation', 'close'];
  return valid.includes(raw as CallStage) ? (raw as CallStage) : 'discovery';
}

export function useTalkListenRatio(callId: string) {
  return useQuery<TalkListenData>({
    queryKey: ['talk-listen-ratio', callId],
    enabled:  !!callId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, rep_talk_pct, prospect_talk_pct, call_stage')
        .eq('call_id', callId)
        .single();

      if (error) throw error;

      const effectiveStage  = resolveStage(data.call_stage);
      const benchmarkRepMax = TALK_RATIO_BENCHMARKS[effectiveStage].rep_max;
      const withinBenchmark = data.rep_talk_pct !== null
        ? isWithinTalkBenchmark(data.rep_talk_pct, effectiveStage)
        : null;

      return {
        call_id:           data.call_id,
        rep_talk_pct:      data.rep_talk_pct,
        prospect_talk_pct: data.prospect_talk_pct,
        call_stage:        data.call_stage as CallStage | null,
        effective_stage:   effectiveStage,
        benchmark_rep_max: benchmarkRepMax,
        within_benchmark:  withinBenchmark,
      };
    },
  });
}

// ── Stage override mutation ───────────────────────────────────────────────────

export function useUpdateCallStage(callId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (stage: CallStage) => {
      const { error } = await supabase
        .from('live_scores')
        .update({ call_stage: stage })
        .eq('call_id', callId);

      if (error) throw error;
      return stage;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['talk-listen-ratio', callId] });
    },
  });
}

// ── Per-rep trend hook (Trend chart) ─────────────────────────────────────────

export interface TalkListenTrendPoint {
  call_id:      string;
  call_date:    string;
  rep_talk_pct: number | null;
  call_stage:   CallStage | null;
}

export interface TalkListenTrendData {
  points:           TalkListenTrendPoint[];
  /** Most common stage across the window — used as benchmark reference */
  dominant_stage:   CallStage;
  benchmark_rep_max: number;
}

export function useTalkListenTrend(repId: string, limit = 20) {
  return useQuery<TalkListenTrendData>({
    queryKey: ['talk-listen-trend', repId, limit],
    enabled:  !!repId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, call_started_at, rep_talk_pct, call_stage')
        .eq('rep_id', repId)
        .not('rep_talk_pct', 'is', null)
        .order('call_started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data ?? []) as {
        call_id: string;
        call_started_at: string;
        rep_talk_pct: number | null;
        call_stage: string | null;
      }[];

      // Reverse so chart reads left→right chronologically
      const reversed = [...rows].reverse();

      const points: TalkListenTrendPoint[] = reversed.map(r => ({
        call_id:      r.call_id,
        call_date:    r.call_started_at,
        rep_talk_pct: r.rep_talk_pct,
        call_stage:   resolveStage(r.call_stage),
      }));

      // Find dominant (most common) stage for benchmark reference line
      const stageCounts: Partial<Record<CallStage, number>> = {};
      for (const r of rows) {
        const s = resolveStage(r.call_stage);
        stageCounts[s] = (stageCounts[s] ?? 0) + 1;
      }

      const dominantStage = (
        Object.entries(stageCounts) as [CallStage, number][]
      ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'discovery';

      return {
        points,
        dominant_stage:    dominantStage,
        benchmark_rep_max: TALK_RATIO_BENCHMARKS[dominantStage].rep_max,
      };
    },
  });
}
