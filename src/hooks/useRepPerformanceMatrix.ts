import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export type RepStatus = 'Critical' | 'At Risk' | 'Watch' | 'Strong' | 'No Data';

export interface RepMatrixRow {
  repId:              string;
  repName:            string;
  email:              string;
  trainingAvg:        number | null;
  callAvg:            number | null;
  transferGap:        number | null;
  status:             RepStatus;
  knowledgeDecay:     boolean;
  pressureRegression: boolean;
  snapshotDate:       string;
  liveCalls:          number;
  trainingSessions:   number;
}

/**
 * Compute rep status from transfer gap and live call average.
 * @param gap       transferGap (trainingAvg - liveAvg). null = no data.
 * @param callAvg   live call average. null = no live calls yet.
 */
export function computeStatus(gap: number | null, callAvg: number | null): RepStatus {
  if (gap === null) return 'No Data';
  if (callAvg !== null && callAvg < 40) return 'Critical';
  if (gap > 25) return 'Critical';
  if (gap >= 18) return 'At Risk';
  if (gap >= 10) return 'Watch';
  return 'Strong';
}

type SnapshotRow = {
  rep_id: string;
  snapshot_date: string;
  training_avg_overall: number | null;
  live_avg_overall: number | null;
  transfer_gap_overall: number | null;
  knowledge_decay_detected: boolean | null;
  profiles: { name: string | null; email: string };
};

export function useRepPerformanceMatrix(days: number) {
  return useQuery<RepMatrixRow[]>({
    queryKey: ['rep-performance-matrix', days],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('rep_correlation_snapshots')
        .select(`
          rep_id, snapshot_date, training_avg_overall, live_avg_overall,
          transfer_gap_overall, knowledge_decay_detected,
          profiles!rep_correlation_snapshots_rep_id_fkey(name, email)
        `)
        .gte('snapshot_date', since)
        .order('snapshot_date', { ascending: false });

      if (error) throw error;

      const snapshots = (data ?? []) as unknown as SnapshotRow[];

      const latestByRep = new Map<string, SnapshotRow>();
      for (const s of snapshots) {
        if (!latestByRep.has(s.rep_id)) latestByRep.set(s.rep_id, s);
      }

      return Array.from(latestByRep.values()).map(s => {
        const gap = s.transfer_gap_overall;
        const callAvg = s.live_avg_overall;
        return {
          repId:              s.rep_id,
          repName:            s.profiles?.name ?? s.profiles?.email?.split('@')[0] ?? 'Unknown',
          email:              s.profiles?.email ?? '',
          trainingAvg:        s.training_avg_overall,
          callAvg,
          transferGap:        gap,
          status:             computeStatus(gap, callAvg),
          knowledgeDecay:     s.knowledge_decay_detected ?? false,
          pressureRegression: false,
          snapshotDate:       s.snapshot_date,
          liveCalls:          0,
          trainingSessions:   0,
        };
      });
    },
  });
}
