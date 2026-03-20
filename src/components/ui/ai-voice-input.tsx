import { Mic } from "lucide-react";
import { useState, useEffect } from "react";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  useEffect(() => {
    if (!isDemo) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };
    const initialTimeout = setTimeout(runAnimation, 100);
    return () => { clearTimeout(timeoutId); clearTimeout(initialTimeout); };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) { setIsDemo(false); setSubmitted(false); }
    else setSubmitted((prev) => !prev);
  };

  return (
    <div className={`w-full py-6 ${className ?? ""}`}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-3">

        <p className="text-xs tracking-[0.2em] uppercase text-white/40 mb-1">
          {submitted ? "SIMULATION ACTIVE" : "READY TO TRAIN"}
        </p>

        <button
          className={`group w-20 h-20 flex items-center justify-center transition-all duration-300 border ${
            submitted
              ? "bg-[#FF6B6B]/10 border-[#FF6B6B] shadow-[0_0_24px_rgba(255,107,107,0.3)]"
              : "bg-transparent border-white/20 hover:border-[#FF6B6B]/60 hover:bg-[#FF6B6B]/5"
          }`}
          type="button"
          onClick={handleClick}
          aria-label={submitted ? "Stop recording" : "Start recording"}
        >
          {submitted ? (
            <div
              className="w-5 h-5 bg-[#FF6B6B] animate-spin"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-white/60 group-hover:text-[#FF6B6B] transition-colors" />
          )}
        </button>

        <span className={`font-mono text-sm tracking-widest transition-all duration-300 ${
          submitted ? "text-[#FF6B6B]" : "text-white/20"
        }`}>
          {formatTime(time)}
        </span>

        <div className="h-8 w-64 flex items-center justify-center gap-[2px]">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={`w-[2px] transition-all duration-300 ${
                submitted ? "bg-[#FF6B6B]/60 animate-pulse" : "bg-white/10 h-1"
              }`}
              style={
                submitted && isClient
                  ? {
                      height: `${15 + Math.random() * 85}%`,
                      animationDelay: `${i * 0.04}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="text-xs text-white/40 tracking-widest uppercase">
          {submitted ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}
