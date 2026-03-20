import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type NotifType = 'achievement' | 'feedback' | 'reminder' | 'leaderboard' | 'goal' | 'library' | 'coaching_digest';

export interface DBNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  unread: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<NotifType, string> = {
  achievement:     '🏆',
  feedback:        '💬',
  reminder:        '📅',
  leaderboard:     '📈',
  goal:            '🎯',
  library:         '📁',
  coaching_digest: '🧠',
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationsDropdownProps {
  open: boolean;
  onClose: () => void;
  notifications: DBNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationsDropdown({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkRead,
}: NotificationsDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute right-0 top-full mt-2 w-[400px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] z-50 shadow-xl"
          style={{ boxShadow: '6px 6px 0 0 rgb(30 41 59)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border-default))]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-tight text-[rgb(var(--text-primary))]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-black bg-[rgb(var(--accent-primary))] text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent-primary))] transition-colors"
                >
                  Mark all read
                </button>
              )}
              <Link
                to="/notifications"
                onClick={onClose}
                className="text-xs text-[rgb(var(--accent-primary))] hover:underline"
              >
                See all
              </Link>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[420px]">
            {notifications.slice(0, 8).length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[rgb(var(--text-muted))]">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[rgb(var(--border-default)/0.5)] cursor-pointer transition-colors
                    ${n.unread ? 'bg-[rgb(var(--accent-primary)/0.04)]' : 'hover:bg-[rgb(var(--bg-raised))]'}`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-black leading-tight ${n.unread ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[rgb(var(--text-muted))] flex-shrink-0">
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  {n.unread && <span className="w-2 h-2 flex-shrink-0 mt-1.5" style={{ background: '#ff6b6b' }} />}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
