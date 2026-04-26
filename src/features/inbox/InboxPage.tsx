import { useState, useEffect, useCallback } from 'react';
import { Send, Link } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'coaching', label: 'Coaching Notes' },
  { value: 'team', label: 'Team' },
  { value: 'system', label: 'System' },
];

const TYPE_COLORS: Record<string, string> = {
  feedback: '#ff6b6b',
  coaching: '#60a5fa',
  team: '#34d399',
  system: '#a78bfa',
};

const REACTIONS = ['👍', '✅', '🔥'];

interface ThreadMessage {
  id: string;
  from: string;
  text: string;
  time: string;
  isMe: boolean;
}

interface Thread {
  id: string;
  sender: string;
  type: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  otherUserId: string | null;
  messages: ThreadMessage[];
}

interface DbMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  recipient_id: string;
  message: string;
  is_system: boolean;
  read: boolean;
  created_at: string;
  sender: { name: string }[] | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupIntoThreads(messages: DbMessage[], userId: string): Thread[] {
  const threadMap = new Map<string, DbMessage[]>();
  for (const msg of messages) {
    const arr = threadMap.get(msg.thread_id) || [];
    arr.push(msg);
    threadMap.set(msg.thread_id, arr);
  }

  return Array.from(threadMap.entries()).map(([threadId, msgs]) => {
    const sorted = [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const lastMsg = sorted[sorted.length - 1];
    const firstOther = sorted.find(m => m.sender_id !== userId && m.sender_id !== null);
    const otherName = firstOther?.sender?.[0]?.name || (lastMsg.is_system ? 'OAST System' : 'Coach');
    const otherUserId = firstOther?.sender_id || null;
    const type = lastMsg.is_system ? 'system' : 'feedback';
    const hasUnread = sorted.some(m => !m.read && m.recipient_id === userId);

    return {
      id: threadId,
      sender: otherName,
      type,
      preview: lastMsg.message.slice(0, 80),
      timestamp: formatTime(lastMsg.created_at),
      unread: hasUnread,
      otherUserId,
      messages: sorted.map(m => ({
        id: m.id,
        from: m.sender?.[0]?.name || (m.is_system ? 'OAST System' : 'Coach'),
        text: m.message,
        time: formatTime(m.created_at),
        isMe: m.sender_id === userId,
      })),
    };
  }).sort((a, b) => {
    const aLast = messages.filter(m => m.thread_id === a.id).slice(-1)[0]?.created_at || '';
    const bLast = messages.filter(m => m.thread_id === b.id).slice(-1)[0]?.created_at || '';
    return bLast.localeCompare(aLast);
  });
}

export default function InboxPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState<Map<string, string[]>>(new Map());

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('id, thread_id, sender_id, recipient_id, message, is_system, read, created_at, sender:profiles!inbox_messages_sender_id_fkey(name)')
      .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order('created_at', { ascending: true });
    if (error) {
      setFetchError('Could not load messages. Please refresh.');
    } else if (data) {
      setFetchError(null);
      const built = groupIntoThreads(data as DbMessage[], user.id);
      setThreads(built);
      setSelectedThread(prev => prev ?? (built.length > 0 ? built[0] : null));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime: listen for new messages addressed to this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'inbox_messages',
        filter: `recipient_id=eq.${user.id}`,
      }, () => { fetchMessages(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchMessages]);

  // Load reactions for the selected thread's messages
  useEffect(() => {
    if (!user?.id || !selectedThread) return;
    const msgIds = selectedThread.messages.map(m => m.id);
    if (msgIds.length === 0) return;
    supabase
      .from('message_reactions')
      .select('message_id, emoji')
      .in('message_id', msgIds)
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map = new Map<string, string[]>();
        if (data) {
          for (const r of data) {
            const arr = map.get(r.message_id) || [];
            arr.push(r.emoji);
            map.set(r.message_id, arr);
          }
        }
        setReactions(map);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id, user?.id]);

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user?.id) return;
    const current = reactions.get(msgId) || [];
    const hasIt = current.includes(emoji);
    if (hasIt) {
      await supabase.from('message_reactions').delete()
        .eq('message_id', msgId).eq('user_id', user.id).eq('emoji', emoji);
      setReactions(prev => {
        const next = new Map(prev);
        next.set(msgId, current.filter(e => e !== emoji));
        return next;
      });
    } else {
      await supabase.from('message_reactions').upsert({ message_id: msgId, user_id: user.id, emoji });
      setReactions(prev => {
        const next = new Map(prev);
        next.set(msgId, [...current, emoji]);
        return next;
      });
    }
  };

  const handleSelect = async (thread: Thread) => {
    setSelectedThread(thread);
    if (thread.unread && user?.id) {
      await supabase
        .from('inbox_messages')
        .update({ read: true })
        .eq('thread_id', thread.id)
        .eq('recipient_id', user.id)
        .eq('read', false);
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: false } : t));
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || !selectedThread || !user?.id) return;
    setSending(true);
    await supabase.from('inbox_messages').insert({
      thread_id: selectedThread.id,
      sender_id: user.id,
      recipient_id: selectedThread.otherUserId || user.id,
      message: reply.trim(),
    });
    setReply('');
    await fetchMessages();
    setSending(false);
  };

  const filtered = threads.filter(t => activeFilter === 'all' || t.type === activeFilter);
  const unreadCount = threads.filter(t => t.unread).length;

  /* Avatar colour palette for deterministic assignment */
  const AVATAR_COLORS = [
    { bg: 'var(--color-green-dim)',  text: 'var(--color-green)'  },
    { bg: 'var(--color-blue-dim)',   text: 'var(--color-blue)'   },
    { bg: 'var(--color-purple-dim)', text: 'var(--color-purple)' },
    { bg: 'var(--color-amber-dim)',  text: 'var(--color-amber)'  },
    { bg: 'var(--color-coral-dim)',  text: 'var(--color-coral)'  },
    { bg: 'rgba(74,85,103,0.15)',    text: 'rgb(var(--text-muted))' },
  ];

  function avatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function initials(name: string) {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('inbox_messages')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false);
    setThreads(prev => prev.map(t => ({ ...t, unread: false })));
  };

  return (
    <div className="pb-12">
      {/* Page header */}
      <div className="mb-5">
        <div className="page-kicker">Coaching</div>
        <div className="page-title">Inbox</div>
        <div className="page-desc">Messages, coaching notes, and team communications.</div>
      </div>

      {/* Top row: unread count + mark all read */}
      <div className="flex justify-between items-center mb-4">
        {unreadCount > 0 && <span className="pill pill-coral">{unreadCount} unread</span>}
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-[rgb(var(--text-muted))] underline cursor-pointer hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`text-[11px] font-semibold py-1.5 px-3.5 rounded-md border transition-colors cursor-pointer
              ${activeFilter === tab.value
                ? 'bg-[var(--color-coral)] text-white border-[var(--color-coral)]'
                : 'bg-transparent text-[rgb(var(--text-secondary))] border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))]'
              }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[72px] border-b border-[rgb(var(--border-default))] animate-pulse last:border-b-0" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[rgb(var(--text-secondary))] text-xs">{fetchError}</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>No messages yet</p>
          <p className="text-[rgb(var(--text-muted))] text-xs">Feedback and coaching notes will appear here</p>
        </div>
      ) : (
        <>
          {/* Message list card */}
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg overflow-hidden">
            {filtered.map((thread) => {
              const ac = avatarColor(thread.sender);
              const lastMsg = thread.messages[thread.messages.length - 1];
              return (
                <div
                  key={thread.id}
                  onClick={() => handleSelect(thread)}
                  className={`flex flex-row items-start gap-3 px-4 py-3.5 border-b border-[rgb(var(--border-default))] cursor-pointer transition-colors last:border-b-0
                    ${thread.unread ? 'bg-[rgb(var(--bg-deep))]' : 'bg-[rgb(var(--bg-surface-raised))] hover:bg-[rgba(255,255,255,0.02)]'}`}
                >
                  {/* Unread dot or placeholder */}
                  {thread.unread ? (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[9px]" style={{ background: 'var(--color-coral)' }} />
                  ) : (
                    <div className="w-1.5 h-1.5 flex-shrink-0 mt-[9px]" />
                  )}

                  {/* Avatar */}
                  <span
                    className="w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{ background: ac.bg, color: ac.text, fontFamily: "'Oswald', sans-serif" }}
                  >
                    {initials(thread.sender)}
                  </span>

                  {/* Message body */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[9px] font-semibold uppercase tracking-wider mb-px"
                      style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '0.1em', color: TYPE_COLORS[thread.type] || 'rgb(var(--text-muted))' }}
                    >
                      {thread.type === 'system' ? 'System Alerts'
                        : thread.type === 'coaching' ? 'Coaching Notes'
                        : thread.type === 'team' ? 'Team Announcements'
                        : 'Rep Updates'}
                    </div>
                    <div className={`text-xs mb-px ${thread.unread ? 'font-semibold text-[rgb(var(--text-primary))]' : 'font-normal text-[rgb(var(--text-secondary))]'}`}>
                      {thread.sender}
                    </div>
                    <div className={`text-xs mb-px ${thread.unread ? 'font-semibold text-[rgb(var(--text-primary))]' : 'font-normal text-[rgb(var(--text-secondary))]'}`}>
                      {lastMsg?.text.slice(0, 40) || thread.preview.slice(0, 40)}
                    </div>
                    <div className="text-[11px] text-[rgb(var(--text-muted))] truncate">
                      {thread.preview}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span
                    className="text-[10px] text-[rgb(var(--text-muted))] flex-shrink-0 whitespace-nowrap mt-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {thread.timestamp}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected thread detail (reply composer) - shown below list when a thread is selected */}
          {selectedThread && (
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg mt-4 overflow-hidden">
              {/* Thread header */}
              <div className="px-5 py-3 border-b border-[rgb(var(--border-default))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                    style={{
                      background: avatarColor(selectedThread.sender).bg,
                      color: avatarColor(selectedThread.sender).text,
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {initials(selectedThread.sender)}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{selectedThread.sender}</p>
                    <span className="text-[10px] text-[rgb(var(--text-muted))]">{selectedThread.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--text-muted))]">
                  <Link className="w-3 h-3" />
                  {selectedThread.messages.length} messages
                </div>
              </div>

              {/* Messages */}
              <div className="max-h-[300px] overflow-y-auto p-5 space-y-3">
                {selectedThread.messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <p className="text-[10px] text-[rgb(var(--text-muted))]">{msg.isMe ? 'You' : msg.from} · {msg.time}</p>
                      <div
                        className={`px-3 py-2 text-xs leading-relaxed rounded-lg ${msg.isMe
                          ? 'bg-[var(--color-coral-dim)] border border-[rgba(255,107,107,0.3)] text-[rgb(var(--text-primary))]'
                          : 'bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))]'
                          }`}
                      >
                        {msg.text}
                      </div>
                      {!msg.isMe && (
                        <div className="flex items-center gap-1">
                          {REACTIONS.map(r => {
                            const active = (reactions.get(msg.id) || []).includes(r);
                            return (
                              <button
                                key={r}
                                onClick={() => toggleReaction(msg.id, r)}
                                className={`text-xs w-6 h-6 flex items-center justify-center rounded-md border transition-colors
                                  ${active
                                    ? 'border-[rgba(255,107,107,0.6)] bg-[var(--color-coral-dim)]'
                                    : 'border-[rgb(var(--border-default))] hover:border-[rgba(255,107,107,0.4)]'
                                  }`}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Reply composer */}
              <div className="p-4 border-t border-[rgb(var(--border-default))] flex items-end gap-3">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply..."
                  rows={2}
                  className="input-os flex-1 resize-none text-xs"
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
                />
                <button
                  className="btn-primary flex items-center gap-2 px-3 py-2 self-end disabled:opacity-50"
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
