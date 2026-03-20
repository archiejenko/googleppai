import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import type { DBNotification } from '../features/notifications/NotificationsDropdown';

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    staleTime: 0, // notifications must always be fresh
    queryFn: async (): Promise<DBNotification[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, unread, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data as DBNotification[]) ?? [];
    },
  });

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ unread: false }).eq('id', id);
    queryClient.setQueryData<DBNotification[]>(['notifications', userId], prev =>
      prev ? prev.map(n => n.id === id ? { ...n, unread: false } : n) : prev
    );
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ unread: false })
      .eq('user_id', userId)
      .eq('unread', true);
    queryClient.setQueryData<DBNotification[]>(['notifications', userId], prev =>
      prev ? prev.map(n => ({ ...n, unread: false })) : prev
    );
  };

  return { ...query, markRead, markAllRead };
}
