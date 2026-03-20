import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const GlowingStarsBackgroundCard = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const [mouseEnter, setMouseEnter] = useState(false);
  return (
    <div
      onMouseEnter={() => setMouseEnter(true)}
      onMouseLeave={() => setMouseEnter(false)}
      className={`bg-[rgba(22,22,24,0.85)] border border-[#2a2a2e] p-0 w-full overflow-hidden${className ? ` ${className}` : ""}`}
    >
      <div className="flex justify-center items-center px-4 pt-4 pb-2">
        <Illustration mouseEnter={mouseEnter} />
      </div>
      <div className="px-6 pb-8">{children}</div>
    </div>
  );
};

export const GlowingStarsTitle = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <h2
    className={`font-bold text-2xl uppercase tracking-wide text-[#eaeaea] font-['Oswald']${className ? ` ${className}` : ""}`}
  >
    {children}
  </h2>
);

export const GlowingStarsDescription = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <p className={`text-sm text-[#888] leading-relaxed max-w-xs mt-2${className ? ` ${className}` : ""}`}>
    {children}
  </p>
);

export const Illustration = ({ mouseEnter }: { mouseEnter: boolean }) => {
  const stars = 108;
  const columns = 18;
  const [glowingStars, setGlowingStars] = useState<number[]>([]);
  const highlightedStars = useRef<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      highlightedStars.current = Array.from({ length: 5 }, () =>
        Math.floor(Math.random() * stars)
      );
      setGlowingStars([...highlightedStars.current]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="h-32 p-1 w-full"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1px",
      }}
    >
      {[...Array(stars)].map((_, starIdx) => {
        const isGlowing = glowingStars.includes(starIdx);
        const delay = (starIdx % 10) * 0.1;
        const staticDelay = starIdx * 0.01;
        return (
          <div
            key={`star-${starIdx}`}
            className="relative flex items-center justify-center"
          >
            <Star
              isGlowing={mouseEnter ? true : isGlowing}
              delay={mouseEnter ? staticDelay : delay}
            />
            {mouseEnter && <Glow delay={staticDelay} />}
            <AnimatePresence mode="wait">
              {isGlowing && (
                <Glow key={`glow-${starIdx}-${glowingStars.join("")}`} delay={delay} />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

const Star = ({ isGlowing, delay }: { isGlowing: boolean; delay: number }) => (
  <motion.div
    key={delay}
    initial={{ scale: 1 }}
    animate={{
      scale: isGlowing ? [1, 1.2, 2.5, 2.2, 1.5] : 1,
      background: isGlowing ? "#ffffff" : "#444444",
    }}
    transition={{ duration: 2, ease: "easeInOut", delay }}
    className="bg-[#444] h-[1px] w-[1px] rounded-full relative z-20"
  />
);

const Glow = ({ delay }: { delay: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, ease: "easeInOut", delay }}
    exit={{ opacity: 0 }}
    className="absolute left-1/2 -translate-x-1/2 z-10 h-[4px] w-[4px] rounded-full bg-[#FF6B6B] blur-[1px] shadow-2xl shadow-[#FF6B6B]/60"
  />
);

interface StarData {
  x: number;
  y: number;
  radius: number;
  color: string;
  baseOpacity: number;
  twinkleAmp: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  isLarge: boolean;
}

export const GlowingStarsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    let rafId: number;
    let stars: StarData[] = [];

    const lowPower =
      (navigator.hardwareConcurrency ?? 4) <= 2 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4) <= 2;

    function buildStars(w: number, h: number) {
      const base = Math.floor((w * h) / 6000);
      let count = Math.max(180, Math.min(320, base));
      if (lowPower) count = Math.floor(count * 0.6);

      stars = Array.from({ length: count }, (): StarData => {
        const tier = Math.random();
        let radius: number;
        if (tier < 0.6) radius = 0.8 + Math.random() * 0.6;
        else if (tier < 0.9) radius = 1.6 + Math.random() * 1.0;
        else radius = 3.0 + Math.random() * 1.5;

        const colorRoll = Math.random();
        const color =
          colorRoll < 0.85 ? '#FFFFFF' :
          colorRoll < 0.95 ? '#FFF8E7' : '#FFD4D4';

        return {
          x: Math.random() * w,
          y: Math.random() * h,
          radius,
          color,
          baseOpacity: 0.55 + Math.random() * 0.45,
          twinkleAmp: 0.3,
          twinkleSpeed: 0.4 + Math.random() * 1.4,
          twinkleOffset: Math.random() * Math.PI * 2,
          isLarge: radius >= 3.0,
        };
      });
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      buildStars(window.innerWidth, window.innerHeight);
    }

    function draw(timestamp: number) {
      const t = timestamp / 1000;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const s of stars) {
        const twinkle = Math.sin(t * (2 * Math.PI / s.twinkleSpeed) + s.twinkleOffset);
        const opacity = Math.max(0, Math.min(1, s.baseOpacity + twinkle * s.twinkleAmp));

        ctx.globalCompositeOperation = 'screen';

        const haloR = s.radius * 6;
        const haloGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
        haloGrad.addColorStop(0, `rgba(255,255,255,${opacity * 0.6})`);
        haloGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        if (s.isLarge) {
          const bloomR = s.radius * 14;
          const bloomGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, bloomR);
          bloomGrad.addColorStop(0, `rgba(255,255,255,${opacity * 0.08})`);
          bloomGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(s.x, s.y, bloomR, 0, Math.PI * 2);
          ctx.fillStyle = bloomGrad;
          ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(draw);
    }

    function handleVisibility() {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
