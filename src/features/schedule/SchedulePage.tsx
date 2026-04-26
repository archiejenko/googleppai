import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Users, RefreshCw, Zap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

type EventType = 'coaching' | 'practice' | 'review' | 'one-on-one';

interface ScheduleEvent {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: EventType;
  title: string;
  with?: string;
  recurring?: boolean;
  notes?: string;
}

interface DbScheduleEvent {
  id: string;
  title: string;
  type: string;
  start_at: string;
  duration_minutes: number;
  notes: string | null;
}

function mapEvent(row: DbScheduleEvent): ScheduleEvent {
  const start = new Date(row.start_at);
  const end = new Date(start.getTime() + row.duration_minutes * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id: row.id,
    date: start.toISOString().slice(0, 10),
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    type: (row.type as EventType) || 'coaching',
    title: row.title,
    notes: row.notes || undefined,
  };
}

const EVENT_COLORS: Record<EventType, string> = {
  coaching:    '#ff6b6b',
  practice:    '#60a5fa',
  review:      '#a78bfa',
  'one-on-one':'#34d399',
};

const EVENT_LABELS: Record<EventType, string> = {
  coaching:    'Coaching',
  practice:    'Practice',
  review:      'Review',
  'one-on-one':'1:1',
};

const SESSION_TYPE_VALUES: Record<string, EventType> = {
  'Coaching Session': 'coaching',
  'Practice Drill':   'practice',
  'Pipeline Review':  'review',
  '1:1 with Manager': 'one-on-one',
};

function getCountdown(dateStr: string, startTime: string) {
  const target = new Date(`${dateStr}T${startTime}:00`);
  const diff = target.getTime() - Date.now();
  if (diff < 0) return 'Past';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface BookSessionModalProps {
  onClose: () => void;
  onBooked: () => void;
  userId: string;
}

function BookSessionModal({ onClose, onBooked, userId }: BookSessionModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    type: 'Coaching Session',
    coach: '',
    date: today,
    time: '10:00',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleBook = async () => {
    setSaving(true);
    const eventType = SESSION_TYPE_VALUES[form.type] || 'coaching';
    const notesText = [form.coach ? `With: ${form.coach}` : null, form.notes || null].filter(Boolean).join('\n') || null;
    await supabase.from('schedule_events').insert({
      user_id: userId,
      title: form.type,
      type: eventType,
      start_at: `${form.date}T${form.time}:00`,
      duration_minutes: 60,
      notes: notesText,
    });
    setSaving(false);
    onBooked();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative w-full max-w-md bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-8 z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold uppercase tracking-tight mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>Book a Session</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Session Type</label>
            <select
              className="input-os"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              <option>Coaching Session</option>
              <option>Practice Drill</option>
              <option>Pipeline Review</option>
              <option>1:1 with Manager</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Coach / Manager</label>
            <input
              className="input-os"
              placeholder="Name of coach or manager"
              value={form.coach}
              onChange={e => setForm(f => ({ ...f, coach: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Date</label>
              <input
                className="input-os"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Time</label>
              <input
                className="input-os"
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Notes</label>
            <textarea
              className="input-os resize-none h-20"
              placeholder="Anything to prep for this session..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-primary flex-1 rounded-lg disabled:opacity-50" onClick={handleBook} disabled={saving}>
            {saving ? 'Booking...' : 'Book Session'}
          </button>
          <button className="btn-ghost flex-1 rounded-lg border border-[rgb(var(--border-default))]" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust so Monday is first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Map schedule event types to training scenario params
const EVENT_SCENARIO: Record<EventType, string> = {
  coaching:    'coaching',
  practice:    'cold_call',
  review:      'pipeline_review',
  'one-on-one':'executive',
};

export default function SchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr);
  const [showBookModal, setShowBookModal] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const fetchEvents = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('schedule_events')
      .select('id, title, type, start_at, duration_minutes, notes')
      .eq('user_id', user.id)
      .order('start_at', { ascending: true });
    setEvents(data ? (data as DbScheduleEvent[]).map(mapEvent) : []);
  };

  useEffect(() => { fetchEvents(); }, [user?.id]);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevWeek  = () => setCurrentDate(d => addDays(d, -7));
  const nextWeek  = () => setCurrentDate(d => addDays(d, 7));
  const prevDay   = () => setCurrentDate(d => addDays(d, -1));
  const nextDay   = () => setCurrentDate(d => addDays(d, 1));

  const getEventsForDay = (ds: string) => events.filter(e => e.date === ds);
  const dayStr = (day: number) => `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const upcomingEvents = events
    .filter(e => new Date(`${e.date}T${e.startTime}:00`) >= new Date())
    .slice(0, 5);

  // ── Week helpers ──
  const weekStart = getWeekStart(currentDate);
  const weekDates = WEEK_DAYS.map((_, i) => addDays(weekStart, i));
  const weekLabel = `${weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // ── Day helpers ──
  const currentDayStr = toDateStr(currentDate);
  const currentDayLabel = currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const currentDayEvents = getEventsForDay(currentDayStr);

  // Today's events for the agenda panel
  const todayEvents = getEventsForDay(todayStr);

  return (
    <div className="pb-12 space-y-5">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="page-kicker">Coaching</div>
          <div className="page-title">Schedule</div>
          <div className="page-desc">Weekly calendar, session planning, and availability.</div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-[rgb(var(--border-default))] overflow-hidden">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-[11px] font-semibold transition-colors
                  ${view === v ? 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]' : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))]'}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBookModal(true)}
            className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" /> New Session
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {(Object.entries(EVENT_COLORS) as [EventType, string][]).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            {EVENT_LABELS[type]}
          </span>
        ))}
      </div>

      {/* Calendar + Agenda: 2fr / 1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

        {/* Left: Calendar */}
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">

          {/* ── MONTH VIEW ── */}
          {view === 'month' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="card-title mb-0">{MONTH_NAMES[month]} {year}</div>
              <button onClick={nextMonth} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-[rgb(var(--border-default))]">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="h-20 border-r border-b border-[rgb(var(--border-default))] bg-[rgb(var(--bg-deep))]" style={{ borderColor: 'rgb(var(--border-default) / 0.4)' }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day  = i + 1;
                const ds   = dayStr(day);
                const evts = getEventsForDay(ds);
                const isSelected = selectedDay === ds;
                const isToday = ds === todayStr;

                return (
                  <div
                    key={ds}
                    onClick={() => setSelectedDay(ds)}
                    className={`h-20 border-r border-b p-1.5 cursor-pointer transition-colors
                      ${isToday ? 'bg-[rgba(255,107,107,0.03)]' : ''}
                      ${isSelected ? 'bg-[rgba(255,107,107,0.08)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
                    style={{ borderColor: isToday ? 'rgba(255,107,107,0.15)' : 'rgb(30 42 56 / 0.4)' }}
                  >
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center mb-1 rounded
                      ${isToday ? 'bg-[#FF6B6B] text-white' : isSelected ? 'text-[#FF6B6B]' : 'text-[rgb(var(--text-muted))]'}`}
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {evts.slice(0, 2).map(evt => (
                        <div
                          key={evt.id}
                          className="text-[10px] font-medium px-1.5 py-0.5 truncate leading-tight rounded"
                          style={{ background: `${EVENT_COLORS[evt.type]}22`, color: EVENT_COLORS[evt.type], borderLeft: `2px solid ${EVENT_COLORS[evt.type]}` }}
                        >
                          {evt.title}
                        </div>
                      ))}
                      {evts.length > 2 && (
                        <div className="text-[10px] text-[rgb(var(--text-muted))] px-1">+{evts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}

          {/* ── WEEK VIEW ── */}
          {view === 'week' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevWeek} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="card-title mb-0 text-sm">{weekLabel}</div>
              <button onClick={nextWeek} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-[rgb(var(--border-default))]">
              {weekDates.map((d, i) => {
                const ds = toDateStr(d);
                const isToday = ds === todayStr;
                return (
                  <div
                    key={ds}
                    onClick={() => { setSelectedDay(ds); }}
                    className="py-3 text-center cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <div className="text-[10px] font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>{WEEK_DAYS[i]}</div>
                    <div className={`text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center mx-auto rounded
                      ${isToday ? 'bg-[#FF6B6B] text-white' : 'text-[rgb(var(--text-primary))]'}`}
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 min-h-[320px]">
              {weekDates.map(d => {
                const ds = toDateStr(d);
                const evts = getEventsForDay(ds);
                const isSelected = selectedDay === ds;
                const isToday = ds === todayStr;
                return (
                  <div
                    key={ds}
                    onClick={() => setSelectedDay(ds)}
                    className={`border-r p-1.5 cursor-pointer transition-colors min-h-[320px]
                      ${isToday ? 'bg-[rgba(255,107,107,0.03)]' : ''}
                      ${isSelected ? 'bg-[rgba(255,107,107,0.06)]' : 'hover:bg-[rgba(255,255,255,0.02)]'}`}
                    style={{ borderColor: isToday ? 'rgba(255,107,107,0.15)' : 'rgb(30 42 56 / 0.4)' }}
                  >
                    {evts.length === 0 ? (
                      <p className="text-[9px] text-[rgb(var(--text-muted))] text-center mt-4 opacity-50">No sessions</p>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {evts.map(evt => (
                          <div
                            key={evt.id}
                            className="p-1.5 text-[10px] font-medium leading-tight rounded"
                            style={{ background: `${EVENT_COLORS[evt.type]}22`, color: EVENT_COLORS[evt.type], borderLeft: `2px solid ${EVENT_COLORS[evt.type]}` }}
                          >
                            <div className="opacity-70 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px' }}>{evt.startTime}</div>
                            <div className="truncate">{evt.title}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* ── DAY VIEW ── */}
          {view === 'day' && (<>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevDay} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="card-title mb-0 text-sm">{currentDayLabel}</div>
              <button onClick={nextDay} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-[360px]">
              {currentDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <Clock className="w-8 h-8 text-[rgb(var(--text-muted))] opacity-30" />
                  <p className="text-sm text-[rgb(var(--text-muted))]">No sessions scheduled</p>
                  <button
                    onClick={() => setShowBookModal(true)}
                    className="text-[11px] font-semibold px-3.5 py-[7px] rounded-lg bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:opacity-90 transition-opacity flex items-center gap-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <Plus className="w-3 h-3" /> Schedule a session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDayEvents.map(evt => (
                    <div key={evt.id} className="flex items-start gap-4 p-4 border border-[rgb(var(--border-default))] rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <div className="text-xs text-[rgb(var(--text-muted))] w-20 shrink-0 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {evt.startTime}<br/>
                        <span className="opacity-60">{evt.endTime}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{evt.title}</p>
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ background: `${EVENT_COLORS[evt.type]}22`, color: EVENT_COLORS[evt.type], fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {EVENT_LABELS[evt.type]}
                          </span>
                        </div>
                        {evt.notes && <p className="text-xs text-[rgb(var(--text-muted))] italic mb-2">{evt.notes}</p>}
                        <button
                          onClick={() => navigate(`/training?scenario=${EVENT_SCENARIO[evt.type]}&title=${encodeURIComponent(evt.title)}`)}
                          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF6B6B] hover:opacity-80 transition-opacity"
                          style={{ fontFamily: "'Oswald', sans-serif" }}
                        >
                          <Zap className="w-3 h-3" /> Start Training
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>)}
        </div>

        {/* Right: Today's Agenda + Selected Day */}
        <div className="space-y-4">
          {/* Today's Agenda */}
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
            <div className="card-title">Today's Agenda</div>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-muted))] py-4 text-center">No sessions today</p>
            ) : (
              <div>
                {todayEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-2.5 py-3 border-b border-[rgb(var(--border-default))] last:border-b-0">
                    <div className="text-[11px] font-semibold text-[rgb(var(--text-primary))] min-w-[42px]" style={{ fontFamily: "'Oswald', sans-serif" }}>{evt.startTime}</div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EVENT_COLORS[evt.type] }} />
                    <div className="text-xs text-[rgb(var(--text-secondary))]">{evt.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected day events */}
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
            <div className="card-title">{selectedDay || 'Select a day'}</div>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-muted))] py-4 text-center">No events</p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(evt => (
                  <div key={evt.id} className="border-l-2 pl-3 py-2 space-y-1.5" style={{ borderColor: EVENT_COLORS[evt.type] }}>
                    <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{evt.title}</p>
                    <div className="flex items-center gap-3 text-xs text-[rgb(var(--text-muted))]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{evt.startTime} – {evt.endTime}
                      </span>
                      {evt.with && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{evt.with}</span>}
                      {evt.recurring && <RefreshCw className="w-3 h-3 text-[#FF6B6B]" />}
                    </div>
                    {evt.notes && <p className="text-xs text-[rgb(var(--text-muted))] italic">{evt.notes}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => navigate(`/training?scenario=${EVENT_SCENARIO[evt.type]}&title=${encodeURIComponent(evt.title)}`)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF6B6B] hover:opacity-80 transition-opacity"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        <Zap className="w-3 h-3" /> Start Training
                      </button>
                      <button
                        onClick={() => navigate(`/call-prep/${evt.id}?title=${encodeURIComponent(evt.title)}&type=${evt.type}`)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        <BookOpen className="w-3 h-3" /> Prep
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming sessions */}
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
            <div className="card-title">Upcoming</div>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-muted))] text-center py-2">No upcoming sessions</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(evt => (
                  <div key={evt.id} className="flex items-start gap-3">
                    <div className="w-1.5 self-stretch flex-shrink-0 mt-1 rounded-sm" style={{ background: EVENT_COLORS[evt.type] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[rgb(var(--text-primary))] truncate">{evt.title}</p>
                      <p className="text-xs text-[rgb(var(--text-muted))]">{evt.date} · {evt.startTime}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 flex-shrink-0 rounded"
                      style={{ background: `${EVENT_COLORS[evt.type]}22`, color: EVENT_COLORS[evt.type] }}
                    >
                      {getCountdown(evt.date, evt.startTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
          <div className="stat-label">Sessions Scheduled</div>
          <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>{events.length}</div>
        </div>
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
          <div className="stat-label">Coaching Hours</div>
          <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>
            {events.length > 0 ? (events.length * 1.0).toFixed(1) : '0'}
          </div>
        </div>
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
          <div className="stat-label">Available Slots</div>
          <div className="stat-value" style={{ color: '#4ADE80' }}>
            {Math.max(0, 20 - events.length)}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showBookModal && user?.id && (
          <BookSessionModal
            onClose={() => setShowBookModal(false)}
            onBooked={fetchEvents}
            userId={user.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
