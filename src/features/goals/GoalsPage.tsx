import { useState, useEffect, useRef, useCallback } from 'react';

// --- Lightweight confetti burst (no external dependency) ---
const CONFETTI_COLORS = ['#ff6b6b', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#f8fafc'];

// Pre-computed at module load so Math.random() is never called during render
const CONFETTI_PARTICLES = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  x: 40 + Math.random() * 20,
  angle: (i / 48) * 360,
  speed: 80 + Math.random() * 120,
  size: 6 + Math.random() * 6,
  rotation: Math.random() * 360,
  isCircle: Math.random() > 0.5,
}));

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {CONFETTI_PARTICLES.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '50%',
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '0',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fly-${p.id % 6} 1.2s ease-out forwards`,
            '--dx': `${Math.cos((p.angle * Math.PI) / 180) * p.speed}px`,
            '--dy': `${Math.sin((p.angle * Math.PI) / 180) * p.speed - 80}px`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fly-0 { to { transform: translate(var(--dx), var(--dy)) rotate(720deg); opacity: 0; } }
        @keyframes confetti-fly-1 { to { transform: translate(calc(var(--dx) * 1.2), var(--dy)) rotate(-540deg); opacity: 0; } }
        @keyframes confetti-fly-2 { to { transform: translate(var(--dx), calc(var(--dy) * 1.1)) rotate(600deg); opacity: 0; } }
        @keyframes confetti-fly-3 { to { transform: translate(calc(var(--dx) * 0.8), var(--dy)) rotate(-720deg); opacity: 0; } }
        @keyframes confetti-fly-4 { to { transform: translate(var(--dx), calc(var(--dy) * 0.9)) rotate(480deg); opacity: 0; } }
        @keyframes confetti-fly-5 { to { transform: translate(calc(var(--dx) * 1.1), calc(var(--dy) * 1.2)) rotate(-600deg); opacity: 0; } }
      `}</style>
    </div>
  );
}
import { Plus, X, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import ProgressRing from '../../components/shared/ProgressRing';
import { useAuth } from '../../context/AuthContext';
import { useGoals } from '../../hooks/useGoals';
import { posthog, isPostHogEnabled } from '../../lib/posthog';

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


function getDaysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatus(goal: Goal) {
  const pct = goal.current / goal.target;
  const daysLeft = getDaysUntil(goal.dueDate);
  if (pct >= 1) return 'Complete';
  if (daysLeft < 5 && pct < 0.7) return 'Behind';
  if (pct >= 0.75 || daysLeft > 10) return 'On Track';
  return 'At Risk';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'On Track': return '#22c55e';
    case 'At Risk': return '#f59e0b';
    case 'Behind': return '#ef4444';
    case 'Complete': return '#60a5fa';
    default: return '#94a3b8';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Quota: '#ff6b6b',
  Activity: '#60a5fa',
  Skill: '#a78bfa',
  Streak: '#34d399',
};

function GoalModal({ goal, onClose, onDelete, onUpdate }: {
  goal: Goal;
  onClose: () => void;
  onDelete?: () => Promise<void> | void;
  onUpdate?: (newCurrent: number) => Promise<void> | void;
}) {
  const pct = Math.round((goal.current / goal.target) * 100);
  const sparkData = goal.weeklyProgress.map((v, i) => ({ i, v }));
  const [progressInput, setProgressInput] = useState(String(goal.current));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdateProgress = async () => {
    const newVal = parseFloat(progressInput);
    if (isNaN(newVal) || newVal < 0) return;
    setSaving(true);
    onUpdate?.(newVal);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    onDelete?.();
    setDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative w-full max-w-lg bg-[rgb(var(--bg-surface))] border-2 border-[rgb(var(--border-default))] p-8 z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-2 h-full self-stretch" style={{ background: CATEGORY_COLORS[goal.category] || '#ff6b6b' }} />
          <div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: CATEGORY_COLORS[goal.category] || '#ff6b6b' }}>
              {goal.category}
            </span>
            <h2 className="text-xl font-black text-[rgb(var(--text-primary))] mt-0.5">{goal.name}</h2>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative flex items-center justify-center">
            <ProgressRing
              percent={Math.min(pct, 100)}
              size={100}
              strokeWidth={8}
              color={getStatusColor(getStatus(goal))}
            />
            <div className="absolute text-center">
              <span className="text-xl font-black text-[rgb(var(--text-primary))]">{Math.min(pct, 100)}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest">Current</p>
              <p className="text-2xl font-black text-[rgb(var(--text-primary))]">
                {goal.unit === '$' ? `$${goal.current.toLocaleString()}` : `${goal.current} ${goal.unit}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest">Target</p>
              <p className="text-lg font-bold text-[rgb(var(--text-secondary))]">
                {goal.unit === '$' ? `$${goal.target.toLocaleString()}` : `${goal.target} ${goal.unit}`}
              </p>
            </div>
          </div>
        </div>

        {sparkData.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">Progress History</p>
            <div className="h-[120px] border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-canvas))] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line dataKey="v" stroke="#ff6b6b" strokeWidth={2} dot={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgb(15 23 42)', border: '1px solid rgb(30 41 59)', color: '#f8fafc', fontSize: 11 }}
                    formatter={(v: number | undefined) => [v !== undefined ? (goal.unit === '$' ? `$${v.toLocaleString()}` : `${v} ${goal.unit}`) : '0', goal.name]}
                    labelFormatter={(l: number) => `Week ${l + 1}`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[rgb(var(--border-default))]">
          <div className="text-xs text-[rgb(var(--text-muted))]">
            Due: <span className="text-[rgb(var(--text-secondary))]">{goal.dueDate}</span> ·{' '}
            {getDaysUntil(goal.dueDate)} days left
          </div>
          <span
            className="px-3 py-1 text-xs font-black border"
            style={{ color: getStatusColor(getStatus(goal)), borderColor: getStatusColor(getStatus(goal)), background: `${getStatusColor(getStatus(goal))}18` }}
          >
            {getStatus(goal)}
          </span>
        </div>

        {/* Update progress (manual — for Skill/Streak goals) */}
        <div className="mt-4 pt-4 border-t border-[rgb(var(--border-default))] space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
              Update Progress
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={progressInput}
                onChange={e => setProgressInput(e.target.value)}
                className="input-os flex-1 text-sm"
              />
              <button
                onClick={handleUpdateProgress}
                disabled={saving}
                className="btn-primary text-xs px-4"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-[rgb(var(--status-danger,239_68_68))] hover:opacity-80 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete goal'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface AddGoalPanelProps {
  onClose: () => void;
  onGoalAdded: () => void;
  userId: string;
}

function AddGoalPanel({ onClose, onGoalAdded, userId }: AddGoalPanelProps) {
  const { createGoal } = useGoals(userId);
  const [form, setForm] = useState({ name: '', category: 'Quota', target: '', unit: '$', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.target) return;
    setSaving(true);
    await createGoal({
      title: form.name,
      category: form.category.toLowerCase(),
      target: parseFloat(form.target),
      unit: form.unit || null,
      dueDate: form.dueDate || null,
    });
    if (isPostHogEnabled) {
      posthog.capture('goal_created', { category: form.category, has_deadline: !!form.dueDate });
    }
    setSaving(false);
    onGoalAdded();
    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-screen w-[400px] bg-[rgb(var(--bg-surface))] border-l-2 border-[rgb(var(--border-default))] z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border-default))]">
        <h2 className="font-black uppercase tracking-tight">Add Goal</h2>
        <button onClick={onClose} className="p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Goal Name</label>
          <input
            className="input-os"
            placeholder="e.g. Hit $200k ARR"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Category</label>
          <select
            className="input-os"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <option>Quota</option>
            <option>Activity</option>
            <option>Skill</option>
            <option>Streak</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Target Value</label>
            <input
              className="input-os"
              type="number"
              placeholder="150000"
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Unit</label>
            <input
              className="input-os"
              placeholder="$ / calls / pts"
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] block mb-1.5">Due Date</label>
          <input
            className="input-os"
            type="date"
            value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="p-6 border-t border-[rgb(var(--border-default))]">
        <button
          className="btn-primary w-full disabled:opacity-50"
          onClick={handleCreate}
          disabled={saving || !form.name || !form.target}
        >
          {saving ? 'Creating...' : 'Create Goal'}
        </button>
      </div>
    </motion.div>
  );
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { data: goals = [], isLoading: loading, refetch: fetchGoals, updateProgress, deleteGoal } = useGoals(user?.id);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [confettiActive, setConfettiActive] = useState(false);
  const completedIdsRef = useRef<Set<string>>(new Set());

  const fireConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 1400);
  }, []);

  // Fire confetti when a goal newly hits 100%
  useEffect(() => {
    if (loading) return;
    let fired = false;
    for (const g of goals) {
      const complete = g.current >= g.target;
      if (complete && !completedIdsRef.current.has(g.id)) {
        completedIdsRef.current.add(g.id);
        if (!fired) { setTimeout(fireConfetti, 0); fired = true; }
      }
    }
  }, [goals, loading, fireConfetti]);

  const categories = ['All', 'Quota', 'Activity', 'Skill', 'Streak'];
  const filtered = categoryFilter === 'All' ? goals : goals.filter(g => g.category === categoryFilter);
  const primaryGoal = goals[0] || null;
  const primaryPct = primaryGoal ? Math.min(Math.round((primaryGoal.current / primaryGoal.target) * 100), 100) : 0;

  return (
    <div className="pb-12 space-y-8">
      <ConfettiBurst active={confettiActive} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Goals</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">Track your progress and stay on target</p>
        </div>
        <button onClick={() => setShowAddPanel(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="h-48 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] animate-pulse" />
      )}

      {/* Empty state */}
      {!loading && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-[rgb(var(--border-default))]">
          <span className="text-4xl mb-4">🎯</span>
          <p className="text-[rgb(var(--text-primary))] font-black mb-2">No goals yet</p>
          <p className="text-[rgb(var(--text-muted))] text-sm mb-6">Set your first goal to start tracking progress</p>
          <button onClick={() => setShowAddPanel(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Your First Goal
          </button>
        </div>
      )}

      {/* Hero: Primary Goal Ring */}
      {!loading && primaryGoal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-8 flex items-center gap-10"
        >
          <div className="relative flex items-center justify-center flex-shrink-0">
            <ProgressRing percent={primaryPct} size={180} strokeWidth={14} color="#ff6b6b" />
            <div className="absolute text-center">
              <span className="text-3xl font-black text-[rgb(var(--text-primary))]">{primaryPct}%</span>
              <p className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest">complete</p>
            </div>
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-primary))]">{primaryGoal.category}</span>
            <h2 className="text-2xl font-black text-[rgb(var(--text-primary))] mt-1">{primaryGoal.name}</h2>
            <p className="text-[rgb(var(--text-muted))] text-sm mt-2">
              <span className="text-[rgb(var(--text-primary))] font-bold text-xl">
                {primaryGoal.unit === '$' ? `$${primaryGoal.current.toLocaleString()}` : `${primaryGoal.current} ${primaryGoal.unit}`}
              </span>
              {' '}/{' '}
              {primaryGoal.unit === '$' ? `$${primaryGoal.target.toLocaleString()}` : `${primaryGoal.target} ${primaryGoal.unit}`}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div>
                <p className="text-xs text-[rgb(var(--text-muted))]">Due</p>
                <p className="text-sm font-bold text-[rgb(var(--text-secondary))]">{primaryGoal.dueDate}</p>
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--text-muted))]">Days Left</p>
                <p className="text-sm font-bold" style={{ color: getStatusColor(getStatus(primaryGoal)) }}>
                  {getDaysUntil(primaryGoal.dueDate)}
                </p>
              </div>
              <span
                className="px-3 py-1 text-xs font-black border ml-auto"
                style={{ color: getStatusColor(getStatus(primaryGoal)), borderColor: getStatusColor(getStatus(primaryGoal)), background: `${getStatusColor(getStatus(primaryGoal))}18` }}
              >
                {getStatus(primaryGoal)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Filter */}
      {!loading && goals.length > 0 && (
        <div className="flex items-center gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors
                ${categoryFilter === c
                  ? 'bg-[rgb(var(--accent-primary))] border-[rgb(var(--accent-primary))] text-white'
                  : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
                }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((goal, i) => {
            const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
            const status = getStatus(goal);
            const statusColor = getStatusColor(status);
            const daysLeft = getDaysUntil(goal.dueDate);

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedGoal(goal)}
                className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-5 cursor-pointer
                  hover:border-[rgb(var(--accent-primary)/0.4)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: CATEGORY_COLORS[goal.category] || '#ff6b6b' }}>
                    {goal.category}
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs font-black border"
                    style={{ color: statusColor, borderColor: statusColor, background: `${statusColor}18` }}
                  >
                    {status}
                  </span>
                </div>

                <h3 className="text-base font-black text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors mb-1">
                  {goal.name}
                </h3>

                <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
                  <span className="text-[rgb(var(--text-secondary))] font-bold">
                    {goal.unit === '$' ? `$${goal.current.toLocaleString()}` : `${goal.current} ${goal.unit}`}
                  </span>
                  {' '}/ {goal.unit === '$' ? `$${goal.target.toLocaleString()}` : `${goal.target} ${goal.unit}`}
                </p>

                <div className="h-1.5 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] mb-3">
                  <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: '#ff6b6b' }} />
                </div>

                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                  <span>{pct}% complete</span>
                  <span style={{ color: daysLeft < 5 ? '#ef4444' : daysLeft < 10 ? '#f59e0b' : '#22c55e' }}>
                    {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                  </span>
                </div>

                <div className="flex items-center justify-end mt-3 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--accent-primary))] transition-colors">
                  <span className="text-xs">View details</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <GoalModal
            goal={selectedGoal}
            onClose={() => setSelectedGoal(null)}
            onDelete={() => deleteGoal(selectedGoal.id)}
            onUpdate={(newVal) => updateProgress(selectedGoal.id, newVal)}
          />
        )}
      </AnimatePresence>

      {/* Add Goal Panel */}
      <AnimatePresence>
        {showAddPanel && user?.id && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowAddPanel(false)} />
            <AddGoalPanel
              onClose={() => setShowAddPanel(false)}
              onGoalAdded={fetchGoals}
              userId={user.id}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
