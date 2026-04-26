import { useState, useEffect, useRef } from 'react';
import { Play, Share2, BookOpen, ChevronLeft, Clock, Pause, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { SKILL_LABELS } from '../../constants/skills';
import ScoreBadge from '../../components/shared/ScoreBadge';
import FilterBar from '../../components/shared/FilterBar';
import EmptyState from '../../components/shared/EmptyState';

interface PitchRecord {
  id: string;
  title: string;
  date: string;
  score: number;
  audio_url: string | null;
  skills: string[];
  skillBreakdown: { skill: string; score: number }[];
  transcript: { speaker: string; text: string }[];
  coachNotes: { note: string }[];
  coachFeedback: string;
  scenario: string;
}

function parsePitch(row: any): PitchRecord {
  const analysis = row.analysis || {};
  const feedback = row.feedback || {};

  // Skill breakdown from analysis.scores JSONB
  const skillBreakdown = Object.entries(analysis.scores || {}).map(([id, data]: any) => ({
    skill: SKILL_LABELS[id] || id,
    score: Math.round(data.score || 0),
  }));

  const skills = (analysis.skills_evaluated || Object.keys(analysis.scores || {}))
    .map((id: string) => SKILL_LABELS[id] || id);

  // Parse plain transcript string into speaker lines
  const rawTranscript: string = row.transcript || '';
  const transcript = rawTranscript
    .split('\n')
    .map((line: string) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return null;
      const speaker = line.slice(0, colonIdx).trim();
      const text = line.slice(colonIdx + 1).trim();
      return speaker && text ? { speaker: speaker === 'USER' ? 'You' : 'Buyer', text } : null;
    })
    .filter(Boolean) as { speaker: string; text: string }[];

  // Coach notes from feedback weaknesses
  const weaknesses: { description: string; example?: string }[] = feedback.top_weaknesses || [];
  const coachNotes = weaknesses.map(w => ({ note: w.description + (w.example ? ` — e.g. "${w.example}"` : '') }));

  const scenario = row.training_sessions?.scenario || 'Practice Session';
  const date = new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    id: row.id,
    title: scenario.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    date,
    score: row.score || 0,
    audio_url: row.audio_url || null,
    skills,
    skillBreakdown,
    transcript,
    coachNotes,
    coachFeedback: row.coaching_feedback || '',
    scenario,
  };
}

// Static waveform SVG visual
function Waveform({ seed, color = '#ff6b6b', height = 40 }: { seed: number; color?: string; height?: number }) {
  const bars = Array.from({ length: 40 }, (_, i) => {
    const h = Math.max(4, Math.abs(Math.sin((i + seed) * 0.7) * height * 0.8 + Math.sin(i * 0.3 + seed) * height * 0.2));
    return h;
  });
  return (
    <svg viewBox={`0 0 120 ${height}`} className="w-full" style={{ height }}>
      {bars.map((h, i) => (
        <rect key={i} x={i * 3} y={(height - h) / 2} width="2" height={h} fill={color} opacity={0.6} rx="1" />
      ))}
    </svg>
  );
}

function AudioPlayer({ recording }: { recording: PitchRecord }) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  useEffect(() => {
    if (!recording.audio_url) return;
    const audio = new Audio(recording.audio_url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('ended', () => setPlaying(false));
    return () => { audio.pause(); audio.src = ''; };
  }, [recording.audio_url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const seek = (pct: number) => {
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (pct / 100) * duration;
      setProgress(pct);
    }
  };

  const seed = recording.id.charCodeAt(0) + recording.id.charCodeAt(3);

  return (
    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
      <div className="relative cursor-pointer mb-3" onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        seek(((e.clientX - rect.left) / rect.width) * 100);
      }}>
        <Waveform seed={seed} height={60} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none" style={{ left: `${progress}%` }} />
        <div className="absolute top-0 left-0 bottom-0 pointer-events-none" style={{ width: `${progress}%`, background: 'rgba(255,107,107,0.08)' }} />
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={recording.audio_url ? togglePlay : undefined}
          disabled={!recording.audio_url}
          className="w-10 h-10 rounded-full border-[1.5px] border-[#FF6B6B] bg-transparent flex items-center justify-center text-[#FF6B6B] hover:bg-[rgba(255,107,107,0.12)] disabled:opacity-40 transition-colors"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <input
            type="range" min={0} max={100} value={progress}
            onChange={e => seek(Number(e.target.value))}
            className="w-full accent-[#ff6b6b]"
            disabled={!recording.audio_url}
          />
        </div>
        <span className="text-xs font-bold text-[rgb(var(--text-muted))] tabular-nums">
          {formatTime((progress / 100) * duration)} / {formatTime(duration)}
        </span>
      </div>
      {!recording.audio_url && (
        <p className="text-xs text-[rgb(var(--text-muted))] mt-2">No audio file attached to this session.</p>
      )}
    </div>
  );
}

function RecordingDetail({ recording, onBack }: { recording: PitchRecord; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'scores'>('transcript');

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to recordings
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>{recording.title}</h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">{recording.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={recording.score} size="lg" showLabel />
          <button className="btn-ghost flex items-center gap-2 text-xs border border-[rgb(var(--border-default))] rounded-lg px-3 py-2">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button className="btn-ghost flex items-center gap-2 text-xs border border-[rgb(var(--border-default))] rounded-lg px-3 py-2">
            <BookOpen className="w-3.5 h-3.5" /> Add to Library
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AudioPlayer recording={recording} />

          <div className="flex border-b border-[rgb(var(--border-default))]">
            {(['transcript', 'scores'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors
                  ${activeTab === tab ? 'border-b-2 border-[#FF6B6B] text-[#FF6B6B]' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'}`}
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'transcript' ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recording.transcript.length === 0
                ? <p className="text-sm text-[rgb(var(--text-muted))]">No transcript available.</p>
                : recording.transcript.map((line, i) => (
                  <div key={i} className={`flex gap-3 ${line.speaker === 'You' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-1 px-3 py-2 text-sm rounded-lg ${line.speaker === 'You'
                      ? 'bg-[rgba(255,107,107,0.1)] border-l-2 border-[#FF6B6B] text-[rgb(var(--text-secondary))]'
                      : 'bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))]'
                    }`}>
                      <span className="font-bold text-xs block mb-0.5">{line.speaker}</span>
                      {line.text}
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <div className="space-y-3">
              {recording.skillBreakdown.length === 0
                ? <p className="text-sm text-[rgb(var(--text-muted))]">No skill scores available.</p>
                : recording.skillBreakdown.map(s => (
                  <div key={s.skill}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[rgb(var(--text-secondary))]">{s.skill}</span>
                      <span className="font-semibold" style={{ color: s.score >= 80 ? '#4ADE80' : s.score >= 60 ? '#FBBF24' : '#FF6B6B' }}>{s.score}</span>
                    </div>
                    <div className="h-bar">
                      <div className="h-bar-fill" style={{ width: `${s.score}%`, background: s.score >= 80 ? '#4ADE80' : s.score >= 60 ? '#FBBF24' : '#FF6B6B' }} />
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div className="space-y-4">
          {recording.coachFeedback && (
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
              <div className="card-title">AI Coaching Feedback</div>
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">{recording.coachFeedback}</p>
            </div>
          )}
          {recording.coachNotes.length > 0 && (
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
              <div className="card-title">Weaknesses to Address</div>
              <div className="space-y-3">
                {recording.coachNotes.map((note, i) => (
                  <div key={i} className="border-l-2 border-[#FBBF24] pl-3">
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
            <div className="card-title">Skills Assessed</div>
            <div className="flex flex-wrap gap-2">
              {recording.skills.map(s => (
                <span key={s} className="px-2 py-1 text-xs font-semibold rounded-md border border-[rgba(255,107,107,0.3)] text-[#FF6B6B]">{s}</span>
              ))}
            </div>
          </div>
          <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
            <div className="card-title">Overall Score</div>
            <ScoreBadge score={recording.score} size="lg" showLabel />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const SCORE_FILTERS = [
  { value: 'all',  label: 'All'   },
  { value: 'high', label: '80+'   },
  { value: 'mid',  label: '60–79' },
  { value: 'low',  label: '<60'   },
];

export default function RecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<PitchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<PitchRecord | null>(null);
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchPitches = async () => {
      const { data, error } = await supabase
        .from('pitches')
        .select('id, audio_url, score, transcript, analysis, feedback, coaching_feedback, created_at, training_sessions(scenario)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecordings(data.map(parsePitch));
      }
      setLoading(false);
    };
    fetchPitches();
  }, [user]);

  const allSkills = Array.from(new Set(recordings.flatMap(r => r.skills)));

  const filtered = recordings.filter(r => {
    const matchSearch = search === '' || r.title.toLowerCase().includes(search.toLowerCase());
    const matchScore  = scoreFilter === 'all'
      || (scoreFilter === 'high' && r.score >= 80)
      || (scoreFilter === 'mid'  && r.score >= 60 && r.score < 80)
      || (scoreFilter === 'low'  && r.score < 60);
    const matchSkill  = skillFilter.length === 0 || skillFilter.some(s => r.skills.includes(s));
    return matchSearch && matchScore && matchSkill;
  });

  if (selectedRecording) {
    return (
      <div className="pb-12">
        <AnimatePresence mode="wait">
          <RecordingDetail recording={selectedRecording} onBack={() => setSelectedRecording(null)} />
        </AnimatePresence>
      </div>
    );
  }

  // Helper: get score pill class
  const pillClass = (score: number) =>
    score >= 80 ? 'pill pill-green' : score >= 60 ? 'pill pill-amber' : 'pill pill-coral';

  // Compute summary stats from loaded recordings
  const totalRecordings = recordings.length;
  const avgScore = totalRecordings > 0 ? Math.round(recordings.reduce((sum, r) => sum + r.score, 0) / totalRecordings) : 0;
  const avgScoreColor = avgScore >= 80 ? '#4ADE80' : avgScore >= 60 ? '#FBBF24' : '#FF6B6B';

  return (
    <div className="pb-12 space-y-5">
      {/* Page header */}
      <div>
        <div className="page-kicker">Coaching</div>
        <div className="page-title">Recordings</div>
        <div className="page-desc">Session recordings, playback, and review.</div>
      </div>

      {/* Top Stats Row */}
      {!loading && totalRecordings > 0 && (
        <div className="flex items-baseline gap-7">
          <div>
            <span className="text-[22px] font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{totalRecordings}</span>
            <span className="text-[11px] text-[rgb(var(--text-muted))] ml-1.5">Total Recordings</span>
          </div>
          <div>
            <span className="text-[22px] font-semibold" style={{ fontFamily: "'Oswald', sans-serif", lineHeight: 1, color: avgScoreColor }}>{avgScore}%</span>
            <span className="text-[11px] text-[rgb(var(--text-muted))] ml-1.5">Avg Score</span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search recordings..."
        filters={SCORE_FILTERS}
        activeFilter={scoreFilter}
        onFilterChange={setScoreFilter}
        tags={allSkills}
        activeTags={skillFilter}
        onTagToggle={tag => setSkillFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No recordings yet"
          description="Complete a practice session to see your recordings and AI analysis here."
          action={{ label: 'Start Training', onClick: () => window.location.href = '/training' }}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedRecording(rec)}
              className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg
                px-5 py-3.5 flex items-center justify-between cursor-pointer
                hover:bg-[rgb(var(--bg-deep))] transition-colors"
            >
              {/* Left: play + avatar + name/scenario */}
              <div className="flex items-center gap-3">
                <button
                  className="w-8 h-8 rounded-full border-[1.5px] border-[#FF6B6B] bg-transparent flex items-center justify-center flex-shrink-0 hover:bg-[rgba(255,107,107,0.12)] transition-colors"
                  onClick={e => { e.stopPropagation(); setSelectedRecording(rec); }}
                >
                  <Play className="w-3.5 h-3.5 text-[#FF6B6B]" fill="#FF6B6B" />
                </button>
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    background: rec.score >= 80 ? 'rgba(74,222,128,0.12)' : rec.score >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(255,107,107,0.12)',
                    color: rec.score >= 80 ? '#4ADE80' : rec.score >= 60 ? '#FBBF24' : '#FF6B6B',
                  }}
                >
                  {rec.title.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium text-[rgb(var(--text-primary))]">{rec.title}</div>
                  <div className="text-[11px] text-[rgb(var(--text-secondary))]">{rec.scenario}</div>
                </div>
              </div>

              {/* Middle: date + skills */}
              <div className="flex items-center gap-4">
                {rec.skills.length > 0 && (
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">{rec.skills.slice(0, 2).join(' / ')}</span>
                )}
                <span className="text-[10px] text-[rgb(var(--text-muted))]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.date}</span>
              </div>

              {/* Right: score pill */}
              <div className="flex items-center gap-3">
                <span className={pillClass(rec.score)}>{rec.score}%</span>
                <Star className="w-4 h-4 text-[rgb(var(--text-muted))]" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
