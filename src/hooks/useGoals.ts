import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

interface Goal {
  id: string;
  name: string;
  category: string;
  current: number;
  target: number;
  unit: string;
  dueDate: string;
  weeklyProgress: number[];
}

interface DbGoal {
  id: string;
  title: string;
  category: string;
  current: number;
  target: number;
  unit: string | null;
  due_date: string | null;
  weekly_progress: number[] | null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapGoal(g: DbGoal): Goal {
  return {
    id: g.id,
    name: g.title,
    category: capitalize(g.category),
    current: Number(g.current),
    target: Number(g.target),
    unit: g.unit ?? 'pts',
    dueDate: g.due_date ?? new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    weeklyProgress: Array.isArray(g.weekly_progress) ? g.weekly_progress : [],
  };
}

export function useGoals(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['goals', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Goal[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_goals')
        .select('id, title, category, current, target, unit, due_date, weekly_progress')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as DbGoal[]).map(mapGoal);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['goals', userId] });

  const updateProgress = async (goalId: string, newVal: number) => {
    await supabase.from('user_goals').update({ current: newVal }).eq('id', goalId);
    invalidate();
  };

  const deleteGoal = async (goalId: string) => {
    await supabase.from('user_goals').delete().eq('id', goalId);
    invalidate();
  };

  const createGoal = async (params: {
    title: string;
    category: string;
    target: number;
    unit: string | null;
    dueDate: string | null;
  }) => {
    if (!userId) throw new Error('Not authenticated');
    const { error } = await supabase.from('user_goals').insert({
      user_id: userId,
      title: params.title,
      category: params.category,
      target: params.target,
      current: 0,
      unit: params.unit,
      due_date: params.dueDate,
      weekly_progress: [],
    });
    if (error) throw new Error(error.message);
    invalidate();
  };

  return { ...query, updateProgress, deleteGoal, createGoal, refetch: invalidate };
}
