import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ── Response types (match correlation-engine edge function output exactly) ────

export interface EfficacyRepSnapshot {
  rep_id: string;
  transfer_gap_overall: number;
  knowledge_decay_detected: boolean;
  pressure_regression: boolean;
  snapshot_date: string;
}

export interface EfficacySummary {
  total_reps_analysed: number;
  avg_transfer_gap: number;
  reps_with_decay: number;
  reps_with_pressure_regression: number;
  rep_snapshots: EfficacyRepSnapshot[];
}

export interface RepTrendPoint {
  snapshot_date: string;
  training_avg_overall: number;
  live_avg_overall: number;
  transfer_gap_overall: number;
}

export interface RepLatestSnapshot {
  org_id: string;
  rep_id: string;
  snapshot_date: string;
  training_avg_overall: number;
  live_avg_overall: number;
  transfer_gap_overall: number;
  talk_ratio_gap: number;
  discovery_gap: number;
  engagement_gap: number;
  objection_handling_gap: number;
  pressure_regression: boolean;
  knowledge_decay_detected: boolean;
  decaying_dimensions: string[];
  refresher_nudge_queued: boolean;
}

export interface RepDetail {
  latest: RepLatestSnapshot | null;
  trend: RepTrendPoint[];
}

/** Enriched rep row: efficacy snapshot merged with profile name */
export interface TeamRepRow {
  rep_id: string;
  rep_name: string;
  transfer_gap_overall: number;
  knowledge_decay_detected: boolean;
  pressure_regression: boolean;
  snapshot_date: string;
}

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : '';
}

/**
 * Org-wide training efficacy summary.
 * Source: GET /correlation-engine/training-efficacy
 */
export function useTransferGapEfficacy() {
  return useQuery<EfficacySummary | null>({
    queryKey: ['transfer-gap-efficacy'],
    staleTime: 300_000,
    queryFn: async () => {
      const auth = await getAuthHeader();
      if (!auth) return null;
      const res = await fetch(`${FUNCTIONS_URL}/correlation-engine/training-efficacy`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) return null;
      return res.json() as Promise<EfficacySummary>;
    },
  });
}

/**
 * All reps in the org with their latest correlation snapshot, enriched with
 * profile names. Built from training-efficacy rep_snapshots + profiles lookup.
 */
export function useTransferGapTeam() {
  const { data: efficacy } = useTransferGapEfficacy();

  return useQuery<TeamRepRow[]>({
    queryKey: ['transfer-gap-team', efficacy?.rep_snapshots?.map(r => r.rep_id).join(',')],
    enabled: !!efficacy && (efficacy.rep_snapshots?.length ?? 0) > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const snapshots = efficacy?.rep_snapshots ?? [];
      if (snapshots.length === 0) return [];

      const repIds = snapshots.map(s => s.rep_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', repIds);

      const nameMap = new Map<string, string>();
      for (const p of profiles ?? []) {
        nameMap.set(p.id, p.name || p.email?.split('@')[0] || 'Unknown');
      }

      return snapshots.map(s => ({
        rep_id: s.rep_id,
        rep_name: nameMap.get(s.rep_id) ?? 'Unknown',
        transfer_gap_overall: s.transfer_gap_overall ?? 0,
        knowledge_decay_detected: s.knowledge_decay_detected ?? false,
        pressure_regression: s.pressure_regression ?? false,
        snapshot_date: s.snapshot_date,
      }));
    },
  });
}

/**
 * Full per-rep snapshot including dimension-level gaps and 90-day trend.
 * Source: GET /correlation-engine/:repId
 */
export function useTransferGapRepDetail(repId: string | undefined) {
  return useQuery<RepDetail | null>({
    queryKey: ['transfer-gap-rep', repId],
    enabled: !!repId,
    staleTime: 300_000,
    queryFn: async () => {
      if (!repId) return null;
      const auth = await getAuthHeader();
      if (!auth) return null;
      const res = await fetch(`${FUNCTIONS_URL}/correlation-engine/${repId}`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        latest: (data.latest as RepLatestSnapshot) ?? null,
        trend: (data.trend as RepTrendPoint[]) ?? [],
      };
    },
  });
}
