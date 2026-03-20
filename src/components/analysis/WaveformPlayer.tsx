import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

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

interface WaveformPlayerProps {
  audioUrl: string | null;
  pitchId: string;
  waveformHeight?: number;
}

export default function WaveformPlayer({ audioUrl, pitchId, waveformHeight = 60 }: WaveformPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  const seed = pitchId.charCodeAt(0) + (pitchId.charCodeAt(3) || 0);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('ended', () => setPlaying(false));
    return () => { audio.pause(); audio.src = ''; };
  }, [audioUrl]);

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

  return (
    <div className="bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] p-4">
      <div
        className="relative cursor-pointer mb-3"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek(((e.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <Waveform seed={seed} height={waveformHeight} />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
          style={{ left: `${progress}%` }}
        />
        <div
          className="absolute top-0 left-0 bottom-0 pointer-events-none"
          style={{ width: `${progress}%`, background: 'rgba(255,107,107,0.08)' }}
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={audioUrl ? togglePlay : undefined}
          disabled={!audioUrl}
          className="w-10 h-10 flex items-center justify-center bg-[rgb(var(--accent-primary))] text-white disabled:opacity-40"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={e => seek(Number(e.target.value))}
            className="w-full accent-[#ff6b6b]"
            disabled={!audioUrl}
          />
        </div>
        <span className="text-xs font-bold text-[rgb(var(--text-muted))] tabular-nums">
          {formatTime((progress / 100) * duration)} / {formatTime(duration)}
        </span>
      </div>
      {!audioUrl && (
        <p className="text-xs text-[rgb(var(--text-muted))] mt-2">No audio file attached to this session.</p>
      )}
    </div>
  );
}
