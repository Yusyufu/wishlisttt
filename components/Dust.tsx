"use client";

import { useEffect, useState } from "react";

type Mote = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
};

const COUNT = 28;

function makeMotes(): Mote[] {
  return Array.from({ length: COUNT }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 0.6 + Math.random() * 1.6, // px
    duration: 18 + Math.random() * 22, // s
    delay: -Math.random() * 30, // negative so they start mid-flight
    drift: (Math.random() - 0.5) * 80, // horizontal sway in px
    opacity: 0.15 + Math.random() * 0.45,
  }));
}

export function Dust() {
  const [motes, setMotes] = useState<Mote[] | null>(null);

  useEffect(() => {
    setMotes(makeMotes());
  }, []);

  if (!motes) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {motes.map((m) => (
        <span
          key={m.id}
          className="absolute bottom-0 block rounded-full bg-white"
          style={{
            left: `${m.left}%`,
            width: `${m.size}px`,
            height: `${m.size}px`,
            opacity: m.opacity,
            boxShadow: `0 0 ${m.size * 4}px rgba(255,255,255,${m.opacity * 0.6})`,
            filter: "blur(0.3px)",
            animation: `dust-rise ${m.duration}s linear ${m.delay}s infinite`,
            // CSS variable for horizontal drift
            ["--drift" as any]: `${m.drift}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes dust-rise {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: var(--o, 0.4);
          }
          90% {
            opacity: var(--o, 0.4);
          }
          100% {
            transform: translate3d(var(--drift), -110vh, 0) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
