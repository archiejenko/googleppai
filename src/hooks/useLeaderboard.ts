import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export interface BoardEntry {
  userId: string;
  name: string;
  email: string;
  rank: number;
  rankChange: number;   // positive = improved, negative = dropped, 0 = same/new
  score: number;        // real avg pitch score for period
  bestScore: number;
  calls: number;        // real session count for period
  winRate: number;      // real % sessions ≥ 70
  xp: number;
  isCurrentUser: boolean;
}

/** Returns period label used for leaderboard_snapshots.period column */
function periodLabel(days: number): string {
  const d = new Date();
  if (days <= 7) {
    // ISO week: YYYY-Www
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  if (days <= 30) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${d.getFullYear()}`;
}

export function useLeaderboard(userId: string | undefined, days: number) {
  return useQuery({
    queryKey: ['leaderboard', userId, days],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<BoardEntry[]> => {
      if (!userId) return [];

      // Query 1: current user's profile (for org_id + own XP)
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('org_id, total_xp, name, email')
        .eq('id', userId)
        .single();

      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      const period = periodLabel(days);

      if (!myProfile?.org_id) {
        // No org: solo user — one additional query only in this edge-case path
        const { data: myPitches } = await supabase
          .from('pitches')
          .select('score')
          .eq('user_id', userId)
          .gte('created_at', cutoff);

        const pitches = myPitches ?? [];
        const avgScore = pitches.length > 0
          ? Math.round(pitches.reduce((s, p) => s + (p.score || 0), 0) / pitches.length)
          : 0;
        const bestScore = pitches.length > 0 ? Math.max(...pitches.map(p => p.score || 0)) : 0;
        const winRate = pitches.length > 0
          ? Math.round((pitches.filter(p => p.score >= 70).length / pitches.length) * 100)
          : 0;

        return [{
          userId,
          name: myProfile?.name || myProfile?.email?.split('@')[0] || 'You',
          email: myProfile?.email || '',
          rank: 1, rankChange: 0,
          score: avgScore, bestScore, calls: pitches.length,
          winRate, xp: myProfile?.total_xp || 0,
          isCurrentUser: true,
        }];
      }

      // Query 2 (single round-trip): all org members + their pitches + their previous
      // leaderboard snapshots — embedded via FK relationships (profiles.id FK in both tables).
      // Pitches and snapshots are filtered client-side to avoid PostgREST embedded-filter
      // complexity; data volume is small for typical org sizes.
      const { data: members } = await supabase
        .from('profiles')
        .select('id, name, email, total_xp, pitches(score, created_at), leaderboard_snapshots(rank, period)')
        .eq('org_id', myProfile.org_id)
        .limit(50);

      if (!members || members.length === 0) return [];

      // Build entries — aggregate pitches in-period per member, read prev rank from snapshot
      const entries: BoardEntry[] = members.map(member => {
        const inPeriod = (member.pitches ?? []).filter((p: { score: number | null; created_at: string }) => p.created_at >= cutoff);
        const scores = inPeriod.map((p: { score: number | null }) => p.score || 0);
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length)
          : 0;
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const winRate = scores.length > 0
          ? Math.round((scores.filter((s: number) => s >= 70).length / scores.length) * 100)
          : 0;

        // Previous rank: most recent snapshot for this period
        const prevSnap = (member.leaderboard_snapshots ?? [])
          .find((s: { rank: number | null; period: string | null }) => s.period === period);
        const prevRank = prevSnap?.rank ?? undefined;

        return {
          userId: member.id,
          name: member.name || member.email?.split('@')[0] || 'User',
          email: member.email || '',
          rank: 0,
          rankChange: 0,
          score: avgScore,
          bestScore,
          calls: scores.length,
          winRate,
          xp: member.total_xp || 0,
          isCurrentUser: member.id === userId,
          _prevRank: prevRank,
        };
      }) as (BoardEntry & { _prevRank?: number })[];

      // Sort by avg score descending, then calls as tiebreaker
      entries.sort((a, b) => b.score - a.score || b.calls - a.calls);
      entries.forEach((e: BoardEntry & { _prevRank?: number }, i) => {
        e.rank = i + 1;
        const prev = e._prevRank;
        e.rankChange = prev !== undefined ? prev - e.rank : 0;
        delete e._prevRank;
      });

      // Persist current snapshot for future rank-change calc (fire-and-forget)
      const snapshotRows = entries.map(e => ({
        user_id: e.userId,
        org_id: myProfile.org_id,
        rank: e.rank,
        avg_score: e.score,
        call_count: e.calls,
        period,
      }));
      supabase
        .from('leaderboard_snapshots')
        .upsert(snapshotRows, { onConflict: 'org_id,period,user_id' })
        .then(() => {});

      return entries;
    },
  });
}
