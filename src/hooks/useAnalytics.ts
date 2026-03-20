import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { SKILL_LABELS } from '../constants/skills';

interface Pitch {
  id: string;
  score: number;
  created_at: string;
}

interface SkillRow {
  skill_id: string;
  current_score: number;
}

export function useAnalytics(userId: string | undefined, days: number) {
  return useQuery({
    queryKey: ['analytics', userId, days],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return null;
      const now = new Date();
      const sinceIso = new Date(now.getTime() - days * 86_400_000).toISOString();
      const prevSinceIso = new Date(now.getTime() - days * 2 * 86_400_000).toISOString();

      const [pitchesResult, prevPitchesResult, skillsResult] = await Promise.all([
        supabase
          .from('pitches')
          .select('id, score, created_at')
          .eq('user_id', userId)
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: true }),
        supabase
          .from('pitches')
          .select('id, score, created_at')
          .eq('user_id', userId)
          .gte('created_at', prevSinceIso)
          .lt('created_at', sinceIso),
        supabase
          .from('user_skills')
          .select('skill_id, current_score')
          .eq('user_id', userId),
      ]);

      const pitches: Pitch[] = pitchesResult.data ?? [];
      const prevPitches: Pitch[] = prevPitchesResult.data ?? [];
      const skills: SkillRow[] = skillsResult.data ?? [];

      // Daily aggregation with last pitch ID for chart click-through
      const byDay = new Map<string, { calls: number; won: number; scoreSum: number; lastPitchId: string }>();
      pitches.forEach(p => {
        const day = p.created_at.slice(0, 10);
        const existing = byDay.get(day) || { calls: 0, won: 0, scoreSum: 0, lastPitchId: p.id };
        byDay.set(day, {
          calls: existing.calls + 1,
          won: existing.won + (p.score >= 70 ? 1 : 0),
          scoreSum: existing.scoreSum + (p.score || 0),
          lastPitchId: p.id,
        });
      });

      const chartData = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86_400_000);
        const key = d.toISOString().slice(0, 10);
        const agg = byDay.get(key);
        chartData.push({
          date: key,
          calls: agg?.calls || 0,
          won: agg?.won || 0,
          avgScore: agg ? Math.round(agg.scoreSum / agg.calls) : 0,
          lastPitchId: agg?.lastPitchId ?? null,
        });
      }

      const total = pitches.length;
      const won = pitches.filter(p => p.score >= 70).length;
      const avgScore = total > 0 ? Math.round(pitches.reduce((s, p) => s + (p.score || 0), 0) / total) : 0;
      const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

      const prevTotal = prevPitches.length;
      const prevWon = prevPitches.filter(p => p.score >= 70).length;
      const prevAvgScore = prevTotal > 0 ? Math.round(prevPitches.reduce((s, p) => s + (p.score || 0), 0) / prevTotal) : 0;
      const prevWinRate = prevTotal > 0 ? Math.round((prevWon / prevTotal) * 100) : 0;

      const kpis = {
        totalCalls: total,
        avgScore,
        winRate,
        sessions: total,
        prevTotalCalls: prevTotal,
        prevAvgScore,
        prevWinRate,
      };

      const s90 = pitches.filter(p => p.score >= 90).length;
      const s75 = pitches.filter(p => p.score >= 75).length;
      const s60 = pitches.filter(p => p.score >= 60).length;
      const funnel = [
        { stage: 'Sessions', value: total },
        { stage: 'Scored ≥ 60', value: s60 },
        { stage: 'Scored ≥ 75', value: s75 },
        { stage: 'Mastered (≥ 90)', value: s90 },
      ];

      const skillRadar = skills.map(s => ({
        skill: SKILL_LABELS[s.skill_id] || s.skill_id,
        score: Math.round(s.current_score || 0),
      }));

      return { chartData, kpis, funnel, skillRadar };
    },
  });
}
