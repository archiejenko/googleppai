import { useRef, useState } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabase';

const VOICES = [
  { id: '5PEXwsADjqmz7GO58o3B', name: 'Julian', gender: 'Male',   accent: 'British', style: 'Raspy, dramatic'      },
  { id: 'rfkTsdZrVWEVhDycUYn9', name: 'Shelby', gender: 'Female', accent: 'British', style: 'Clear, conversational' },
  { id: 'jRAAK67SEFE9m7ci5DhD', name: 'Ollie',  gender: 'Male',   accent: 'British', style: 'Natural, relaxed'      },
] as const;

const PREVIEW_TEXT = "Hi, I'm looking at a few options right now";

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  label?: string;
}

export default function VoiceSelector({ value, onChange, label }: VoiceSelectorProps) {
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loadingId, setLoadingId]       = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewingId(null);
  };

  const handlePreview = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    // Clicking the active preview stops it
    if (previewingId === id) {
      stopPreview();
      return;
    }

    // Stop any existing preview before starting a new one
    stopPreview();

    setLoadingId(id);
    try {
      const { data, error } = await supabase.functions.invoke('tts-generate', {
        body: { text: PREVIEW_TEXT, voice_id: id },
        headers: { Accept: 'audio/mpeg' },
      });
      if (error) throw error;

      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        const blobPart = data instanceof Uint8Array ? data.buffer.slice(0) : data;
        blob = new Blob([blobPart], { type: 'audio/mpeg' });
      } else {
        throw new Error('non-binary response');
      }
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      setPreviewingId(id);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
        audioRef.current = null;
        setPreviewingId(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
        audioRef.current = null;
        setPreviewingId(null);
      };

      audio.play().catch(() => {
        setPreviewingId(null);
      });
    } catch {
      setPreviewingId(null);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-3">
        {VOICES.map(voice => {
          const isSelected  = value === voice.id;
          const isPreviewing = previewingId === voice.id;
          const isLoading   = loadingId === voice.id;

          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => onChange(voice.id)}
              className={`bg-[#161618] border p-4 cursor-pointer transition-colors text-left rounded-[12px] ${
                isSelected
                  ? 'border-[#FF6B6B]'
                  : 'border-[#2a2a2e] hover:border-[#3a3a3e]'
              }`}
            >
              <p className="font-['Oswald'] text-sm font-bold uppercase tracking-wide text-white">
                {voice.name}
              </p>
              <p className="inline-flex gap-1 text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
                {voice.accent} · {voice.gender}
              </p>
              <p className="text-xs text-text-muted font-['DM_Sans'] mt-2">
                {voice.style}
              </p>
              <button
                type="button"
                onClick={(e) => handlePreview(e, voice.id)}
                disabled={isLoading}
                className={`mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  isPreviewing
                    ? 'text-[#FF6B6B]'
                    : 'text-text-muted hover:text-text-primary'
                } disabled:opacity-40`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isPreviewing ? (
                  <Square className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                {isLoading ? 'Loading' : isPreviewing ? 'Stop' : 'Preview'}
              </button>
            </button>
          );
        })}
      </div>
    </div>
  );
}
