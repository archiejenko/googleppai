import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import type { DBNotification } from './NotificationsDropdown';

const TYPE_ICONS: Record<DBNotification['type'], string> = {
  achievement:     '🏆',
  feedback:        '💬',
  reminder:        '📅',
  leaderboard:     '📈',
  goal:            '🎯',
  library:         '📁',
  coaching_digest: '🧠',
};

const TYPE_COLORS: Record<DBNotification['type'], string> = {
  achievement:     '#FFD700',
  feedback:        '#ff6b6b',
  reminder:        '#60a5fa',
  leaderboard:     '#a78bfa',
  goal:            '#34d399',
  library:         '#f59e0b',
  coaching_digest: '#ff6b6b',
};

const FILTER_TABS = [
  { value: 'all',             label: 'All'          },
  { value: 'coaching_digest', label: 'Coaching'     },
  { value: 'achievement',     label: 'Achievements' },
  { value: 'feedback',        label: 'Feedback'     },
  { value: 'reminder',        label: 'Reminders'    },
  { value: 'leaderboard',     label: 'Leaderboard'  },
  { value: 'goal',            label: 'Goals'        },
  { value: 'library',         label: 'Library'      },
];

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase
      .from('notifications')
      .select('id, type, title, body, unread, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data as DBNotification[]);
        setLoading(false);
      });
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ unread: false })
      .eq('user_id', user.id)
      .eq('unread', true);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ unread: false }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const unreadCount = notifications.filter(n => n.unread).length;
  const filtered = notifications.filter(n => filter === 'all' || n.type === filter);
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-black bg-[rgb(var(--accent-primary))] text-white">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent-primary))] transition-colors border border-[rgb(var(--border-default))] px-4 py-2"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center border-b border-[rgb(var(--border-default))] overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors flex-shrink-0
              ${filter === tab.value
                ? 'border-b-2 border-[rgb(var(--accent-primary))] text-[rgb(var(--accent-primary))]'
                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] animate-pulse" />
          ))}
        </div>
      )}

      {/* Notifications list */}
      {!loading && (
        <div className="space-y-2">
          {visible.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-4 p-4 border cursor-pointer transition-colors
                ${n.unread
                  ? 'bg-[rgb(var(--bg-surface))] border-[rgb(var(--border-default))] border-l-2'
                  : 'bg-[rgb(var(--bg-canvas))] border-[rgb(var(--border-default)/0.5)] hover:bg-[rgb(var(--bg-surface))]'
                }`}
              style={n.unread ? { borderLeftColor: TYPE_COLORS[n.type] } : undefined}
            >
              <div
                className="w-10 h-10 flex items-center justify-center text-xl flex-shrink-0 border"
                style={{ borderColor: `${TYPE_COLORS[n.type]}40`, background: `${TYPE_COLORS[n.type]}12` }}
              >
                {TYPE_ICONS[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className={`text-sm font-black ${n.unread ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                    {n.title}
                  </p>
                  <span className="text-xs text-[rgb(var(--text-muted))] flex-shrink-0">{relativeTime(n.created_at)}</span>
                </div>
                <p className="text-sm text-[rgb(var(--text-muted))] mt-1 leading-relaxed">{n.body}</p>
                <span
                  className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest"
                  style={{ color: TYPE_COLORS[n.type], background: `${TYPE_COLORS[n.type]}18` }}
                >
                  {n.type}
                </span>
              </div>
              {n.unread && (
                <span className="w-2.5 h-2.5 flex-shrink-0 mt-1.5" style={{ background: '#ff6b6b' }} />
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && visibleCount < filtered.length && (
        <div className="flex justify-center">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="btn-ghost border border-[rgb(var(--border-default))] px-8 py-3 text-sm"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-4">🔔</span>
          <p className="text-[rgb(var(--text-muted))]">
            {filter === 'all' ? 'No notifications yet' : 'No notifications in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
