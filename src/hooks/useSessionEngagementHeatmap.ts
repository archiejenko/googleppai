import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

export interface HeatmapCell {
  date:         string;   // YYYY-MM-DD
  weekIndex:    number;
  dayOfWeek:    number;   // 0=Mon … 6=Sun
  score:        number | null;
  avgScore:     number | null;
  sessionCount: number;
  isFuture:     boolean;
  repId?:       string;
}

export interface WeeklyPoint {
  weekLabel:     string;
  avgScore:      number | null;
  sessionCount:  number;
  totalSessions: number;
}

export interface DropOffAlert {
  repId:      string;
  repName:    string;
  streakDays: number;
}

interface RepEntry {
  id:   string;
  name: string;
}

interface HeatmapData {
  teamCells:        HeatmapCell[];
  repCells:         Record<string, HeatmapCell[]>;
  teamWeeklyPoints: WeeklyPoint[];
  repWeeklyPoints:  Record<string, WeeklyPoint[]>;
  dropOffAlerts:    DropOffAlert[];
  reps:             RepEntry[];
}

const GRID_WEEKS = 8;

function getGridStart(anchor: Date): string {
  const d = new Date(anchor);
  d.setDate(d.getDate() - GRID_WEEKS * 7 + 1);
  return d.toISOString().split('T')[0];
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function useSessionEngagementHeatmap(anchor?: Date) {
  return useQuery<HeatmapData>({
    queryKey: ['session-engagement-heatmap', anchor ? toDateStr(anchor) : 'today'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const effectiveAnchor = anchor ?? new Date();
      const today = toDateStr(new Date());
      const since  = getGridStart(effectiveAnchor);

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, rep_id, overall_score, completed_at, profiles!training_sessions_rep_id_fkey(name)')
        .gte('completed_at', since + 'T00:00:00Z')
        .not('completed_at', 'is', null);

      if (error) throw error;

      type RawRow = {
        id: string; rep_id: string; overall_score: number | null;
        completed_at: string; profiles: { name: string | null }[];
      };
      const rows = (data ?? []) as unknown as RawRow[];

      // Build team cells
      const byDate = new Map<string, { scores: number[]; count: number }>();
      for (const r of rows) {
        const date = r.completed_at.split('T')[0];
        const entry = byDate.get(date) ?? { scores: [], count: 0 };
        if (r.overall_score !== null) entry.scores.push(r.overall_score);
        entry.count++;
        byDate.set(date, entry);
      }

      const start = new Date(since + 'T00:00:00Z');
      const teamCells: HeatmapCell[] = [];
      for (let i = 0; i < GRID_WEEKS * 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const date = toDateStr(d);
        const entry = byDate.get(date);
        const scores = entry?.scores ?? [];
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        teamCells.push({
          date,
          weekIndex:    Math.floor(i / 7),
          dayOfWeek:    i % 7,
          score:        avg,
          avgScore:     avg,
          sessionCount: entry?.count ?? 0,
          isFuture:     date > today,
        });
      }

      // Weekly points
      const weeklyMap = new Map<number, { scores: number[]; count: number }>();
      for (const cell of teamCells) {
        const w = weeklyMap.get(cell.weekIndex) ?? { scores: [], count: 0 };
        if (cell.avgScore !== null) w.scores.push(cell.avgScore);
        w.count += cell.sessionCount;
        weeklyMap.set(cell.weekIndex, w);
      }
      const teamWeeklyPoints: WeeklyPoint[] = Array.from({ length: GRID_WEEKS }, (_, wi) => {
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() + wi * 7);
        const w = weeklyMap.get(wi);
        const avg = w && w.scores.length ? w.scores.reduce((a, b) => a + b, 0) / w.scores.length : null;
        return {
          weekLabel:     weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          avgScore:      avg,
          sessionCount:  w?.count ?? 0,
          totalSessions: w?.count ?? 0,
        };
      });

      // Rep index
      const repMap = new Map<string, string>();
      for (const r of rows) {
        const name = (r.profiles as unknown as { name: string | null }[])[0]?.name ?? r.rep_id;
        if (!repMap.has(r.rep_id)) repMap.set(r.rep_id, name);
      }
      const reps: RepEntry[] = Array.from(repMap.entries()).map(([id, name]) => ({ id, name }));

      return {
        teamCells,
        repCells:         {},
        teamWeeklyPoints,
        repWeeklyPoints:  {},
        dropOffAlerts:    [],
        reps,
      };
    },
  });
}
