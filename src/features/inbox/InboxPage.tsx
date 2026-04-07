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

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Inbox</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-black bg-[rgb(var(--accent-primary))] text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-[500px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] animate-pulse" />
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 border border-[rgb(var(--border-default))] text-center">
          <p className="text-text-secondary text-sm">{fetchError}</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-[rgb(var(--border-default))] text-center">
          <span className="text-4xl mb-4">📬</span>
          <p className="text-[rgb(var(--text-primary))] font-black mb-1">No messages yet</p>
          <p className="text-[rgb(var(--text-muted))] text-sm">Feedback and coaching notes will appear here</p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-200px)] min-h-[500px] border border-[rgb(var(--border-default))]">
          {/* Left: Thread List */}
          <div className="w-72 flex-shrink-0 border-r border-[rgb(var(--border-default))] flex flex-col">
            {/* Filter tabs */}
            <div className="border-b border-[rgb(var(--border-default))] overflow-x-auto scrollbar-hide">
              <div className="flex">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveFilter(tab.value)}
                    className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0
                      ${activeFilter === tab.value
                        ? 'border-b-2 border-[rgb(var(--accent-primary))] text-[rgb(var(--accent-primary))]'
                        : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threads */}
            <div className="flex-1 overflow-y-auto">
              {filtered.map(thread => {
                const isActive = selectedThread?.id === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelect(thread)}
                    className={`px-4 py-3 cursor-pointer border-b border-[rgb(var(--border-default)/0.5)] transition-colors flex items-start gap-3
                      ${isActive ? 'bg-[rgb(var(--accent-primary)/0.08)] border-l-2 border-l-[rgb(var(--accent-primary))]' : 'hover:bg-[rgb(var(--bg-raised))]'}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-raised))] flex items-center justify-center">
                      <span className="text-xs font-black text-[rgb(var(--text-muted))] uppercase leading-none">
                        {thread.sender.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-xs font-black truncate ${thread.unread ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))]'}`}>
                          {thread.sender}
                        </p>
                        <span className="text-[10px] text-[rgb(var(--text-muted))] flex-shrink-0 ml-1">{thread.timestamp}</span>
                      </div>
                      <p className="text-xs text-[rgb(var(--text-muted))] truncate">{thread.preview}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1 py-0.5 font-bold" style={{ color: TYPE_COLORS[thread.type], background: `${TYPE_COLORS[thread.type]}18` }}>
                          {thread.type}
                        </span>
                        {thread.unread && <span className="w-2 h-2 flex-shrink-0" style={{ background: '#ff6b6b' }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Message view */}
          {selectedThread && (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Thread header */}
              <div className="px-6 py-4 border-b border-[rgb(var(--border-default))] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-raised))] flex items-center justify-center">
                    <span className="text-xs font-black text-[rgb(var(--text-muted))] uppercase leading-none">
                      {selectedThread.sender.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-[rgb(var(--text-primary))]">{selectedThread.sender}</p>
                    <span className="text-xs" style={{ color: TYPE_COLORS[selectedThread.type] }}>
                      {selectedThread.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--accent-primary))] border border-[rgb(var(--accent-primary)/0.3)] px-2 py-1">
                  <Link className="w-3 h-3" />
                  {selectedThread.messages.length} messages
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedThread.messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <p className="text-xs text-[rgb(var(--text-muted))]">{msg.isMe ? 'You' : msg.from} · {msg.time}</p>
                      <div
                        className={`px-4 py-3 text-sm leading-relaxed ${msg.isMe
                          ? 'bg-[rgb(var(--accent-primary)/0.15)] border border-[rgb(var(--accent-primary)/0.3)] text-[rgb(var(--text-primary))]'
                          : 'bg-[rgb(var(--bg-raised))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))]'
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
                                className={`text-sm w-7 h-7 flex items-center justify-center border transition-colors
                                  ${active
                                    ? 'border-[rgb(var(--accent-primary)/0.6)] bg-[rgb(var(--accent-primary)/0.12)]'
                                    : 'border-[rgb(var(--border-default))] hover:border-[rgb(var(--accent-primary)/0.4)]'
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
              <div className="p-4 border-t border-[rgb(var(--border-default))] flex items-end gap-3 flex-shrink-0">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Reply..."
                  rows={3}
                  className="input-os flex-1 resize-none text-sm"
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
                />
                <button
                  className="btn-primary flex items-center gap-2 px-4 py-3 self-end disabled:opacity-50"
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
