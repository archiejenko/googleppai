import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export type QuestionType = 'closed' | 'surface_open' | 'implication';

export interface CallQuestion {
  id:                string;
  call_id:           string;
  rep_id:            string;
  question_text:     string;
  question_type:     QuestionType;
  timestamp_seconds: number;
  created_at:        string;
}

export interface QuestionSummary {
  closed:       number;
  surface_open: number;
  implication:  number;
  total:        number;
  quality_score: number | null;
  implication_rate: number | null;
}

const WEIGHTS: Record<QuestionType, number> = {
  closed:       0.2,
  surface_open: 0.6,
  implication:  1.0,
}

export function computeQuestionSummary(questions: CallQuestion[]): QuestionSummary {
  const closed      = questions.filter(q => q.question_type === 'closed').length;
  const surfaceOpen = questions.filter(q => q.question_type === 'surface_open').length;
  const implication = questions.filter(q => q.question_type === 'implication').length;
  const total       = questions.length;

  if (total === 0) {
    return { closed, surface_open: surfaceOpen, implication, total, quality_score: null, implication_rate: null };
  }

  const totalWeight = questions.reduce((sum, q) => sum + WEIGHTS[q.question_type], 0);
  const maxPossible = total * WEIGHTS.implication;
  const qualityScore = maxPossible > 0
    ? Math.round((totalWeight / maxPossible) * 100 * 100) / 100
    : null;
  const implicationRate = Math.round((implication / total) * 100 * 100) / 100;

  return {
    closed,
    surface_open: surfaceOpen,
    implication,
    total,
    quality_score:    qualityScore,
    implication_rate: implicationRate,
  };
}

export function useCallQuestions(callId: string) {
  return useQuery<CallQuestion[]>({
    queryKey: ['call-questions', callId],
    enabled:  !!callId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_questions')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      return (data ?? []) as CallQuestion[];
    },
  });
}

// ── Per-rep trend (implication rate over last N calls) ────────────────────────

export interface QuestionTrendPoint {
  call_id:          string;
  call_date:        string;
  implication_rate: number | null;
  quality_score:    number | null;
}

export function useQuestionQualityTrend(repId: string, limit = 20) {
  return useQuery<QuestionTrendPoint[]>({
    queryKey: ['question-quality-trend', repId, limit],
    enabled:  !!repId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, call_started_at, question_quality_score, implication_question_rate')
        .eq('rep_id', repId)
        .not('question_quality_score', 'is', null)
        .order('call_started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return ([...(data ?? [])].reverse() as {
        call_id: string;
        call_started_at: string;
        question_quality_score: number | null;
        implication_question_rate: number | null;
      }[]).map(r => ({
        call_id:          r.call_id,
        call_date:        r.call_started_at,
        implication_rate: r.implication_question_rate,
        quality_score:    r.question_quality_score,
      }));
    },
  });
}
