import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export interface CallSegment {
  id:                    string;
  call_id:               string;
  rep_id:                string;
  segment_start_seconds: number;
  segment_end_seconds:   number;
  segment_score:         number | null;
  flags:                 string[];
  transcript_excerpt:    string | null;
  created_at:            string;
}

export function useCallSegments(callId: string) {
  return useQuery<CallSegment[]>({
    queryKey: ['call-segments', callId],
    enabled:  !!callId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_segments')
        .select('*')
        .eq('call_id', callId)
        .order('segment_start_seconds', { ascending: true });

      if (error) throw error;
      return (data ?? []) as CallSegment[];
    },
  });
}

export function useCallScore(callId: string) {
  return useQuery({
    queryKey: ['call-score', callId],
    enabled:  !!callId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select(`
          call_id, overall_score, rep_talk_pct, prospect_talk_pct,
          call_stage, duration_secs, call_started_at, call_ended_at,
          prospect_name, company_name
        `)
        .eq('call_id', callId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
