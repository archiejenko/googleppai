import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

interface PerformanceSummary {
  weekly_pitches: number;
  avg_score: number;
  high_score_rate: number;
}

export interface MomentumData {
  sessions_this_week: number;
  momentum_score: number;
  trend: 'up' | 'down';
  score_diff: number;
  streak_count: number;
  skill_level_up?: boolean;
}

export function useUserPerformance(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-performance', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ performance: PerformanceSummary | null; momentum: MomentumData | null }> => {
      if (!userId) return { performance: null, momentum: null };

      const [summaryResult, momentumResult, profileResult] = await Promise.all([
        supabase
          .from('user_performance_summary')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase.rpc('calculate_performance_momentum', { p_user_id: userId }),
        supabase.from('profiles').select('streak_count').eq('id', userId).single(),
      ]);

      const performance = summaryResult.data as PerformanceSummary | null;
      const momentum = momentumResult.error
        ? null
        : { ...momentumResult.data, streak_count: profileResult.data?.streak_count || 0 };

      return { performance, momentum };
    },
  });
}
