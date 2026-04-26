import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import type { DBNotification } from './NotificationsDropdown';
import { Trophy, AlertTriangle, Info, Star } from 'lucide-react';

/* ── colour / icon mapping by notification type ── */

const TYPE_ICON_CONFIG: Record<DBNotification['type'], { icon: typeof Trophy; color: string; dimBg: string }> = {
  achievement:     { icon: Trophy,         color: 'var(--color-green)',  dimBg: 'var(--color-green-dim)'  },
  feedback:        { icon: AlertTriangle,  color: 'var(--color-coral)',  dimBg: 'var(--color-coral-dim)'  },
  reminder:        { icon: Info,           color: 'var(--color-blue)',   dimBg: 'var(--color-blue-dim)'   },
  leaderboard:     { icon: Star,           color: 'var(--color-amber)',  dimBg: 'var(--color-amber-dim)'  },
  goal:            { icon: Trophy,         color: 'var(--color-green)',  dimBg: 'var(--color-green-dim)'  },
  library:         { icon: Info,           color: 'var(--color-blue)',   dimBg: 'var(--color-blue-dim)'   },
  coaching_digest: { icon: Info,           color: 'var(--color-blue)',   dimBg: 'var(--color-blue-dim)'   },
};

const FILTER_TABS = [
  { value: 'all',             label: 'All'          },
  { value: 'achievement',     label: 'Achievements' },
  { value: 'feedback',        label: 'Alerts'       },
  { value: 'library',         label: 'System'       },
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
    <div className="pb-12">
      {/* Page header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="page-kicker">Coaching</div>
          <div className="page-title">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2.5 inline-block align-middle text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-coral)] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="page-desc">Achievements, alerts, and system updates.</div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[11px] font-semibold py-1.5 px-3.5 rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-colors cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-5">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`text-[11px] font-semibold py-1.5 px-3.5 rounded-md border transition-colors cursor-pointer
              ${filter === tab.value
                ? 'bg-[var(--color-coral)] text-white border-[var(--color-coral)]'
                : 'bg-transparent text-[rgb(var(--text-secondary))] border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))]'
              }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[rgb(var(--bg-surface))] rounded-lg animate-pulse mb-3 last:mb-0" />
          ))}
        </div>
      )}

      {/* Notifications list */}
      {!loading && visible.length > 0 && (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
          {visible.map((n, i) => {
            const cfg = TYPE_ICON_CONFIG[n.type] || TYPE_ICON_CONFIG.achievement;
            const IconComponent = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-3 py-3 border-b border-[rgb(var(--border-default))] last:border-b-0 ${!n.unread ? 'opacity-80' : ''}`}
              >
                {/* Unread dot or spacer */}
                {n.unread ? (
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]" style={{ background: 'var(--color-coral)' }} />
                ) : (
                  <div className="w-1.5 flex-shrink-0" />
                )}

                {/* Type icon */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.dimBg }}
                >
                  <IconComponent size={12} style={{ color: cfg.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.unread ? 'font-semibold text-[rgb(var(--text-primary))]' : 'font-medium text-[rgb(var(--text-primary))]'}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-snug mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {relativeTime(n.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 items-end flex-shrink-0 pt-0.5">
                  <button onClick={() => markRead(n.id)} className="text-[10px] font-medium text-[var(--color-coral)] hover:underline cursor-pointer">
                    View
                  </button>
                  <button onClick={() => markRead(n.id)} className="text-[10px] font-medium text-[var(--color-coral)] hover:underline cursor-pointer">
                    Dismiss
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && visibleCount < filtered.length && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => setVisibleCount(c => c + 10)}
            className="text-[11px] font-semibold py-1.5 px-3.5 rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-colors cursor-pointer"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[rgb(var(--text-muted))] text-xs">
            {filter === 'all' ? 'No notifications yet' : 'No notifications in this category'}
          </p>
        </div>
      )}
    </div>
  );
}
