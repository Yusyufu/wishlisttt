"use client";

import { useEffect, useState } from "react";

type Petal = {
  id: number;
  x: number;
  y: number;
  rot: number;
  drift: number;
  duration: number;
  delay: number;
  size: number;
};

let nextId = 0;

function spawn(originX: number, originY: number): Petal {
  return {
    id: nextId++,
    x: originX,
    y: originY,
    rot: Math.random() * 360,
    drift: (Math.random() - 0.5) * 160,
    duration: 2.2 + Math.random() * 1.6,
    delay: Math.random() * 0.15,
    size: 6 + Math.random() * 6,
  };
}

export function PetalBurst({ trigger }: { trigger: number }) {
  const [petals, setPetals] = useState<Petal[]>([]);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    // Use last tap/click position; fall back to center.
    setPetals((prev) => {
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const fresh = Array.from({ length: 14 }).map(() => spawn(o.x, o.y));
      // cap the array
      return [...prev, ...fresh].slice(-80);
    });
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-cleanup after animations finish
  useEffect(() => {
    if (petals.length === 0) return;
    const t = setTimeout(() => {
      setPetals((prev) => prev.slice(-30));
    }, 4500);
    return () => clearTimeout(t);
  }, [petals.length]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      onPointerDown={(e) => setOrigin({ x: e.clientX, y: e.clientY })}
    >
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute block"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.25))",
            borderRadius: "80% 0 80% 0",
            boxShadow: "0 0 6px rgba(255,255,255,0.25)",
            transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
            animation: `petal-fall ${p.duration}s cubic-bezier(.2,.7,.2,1) ${p.delay}s forwards`,
            ["--drift" as any]: `${p.drift}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes petal-fall {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--r, 0deg))
              translate3d(0, 0, 0);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(calc(var(--r, 0deg) + 540deg))
              translate3d(var(--drift), 220px, 0);
          }
        }
      `}</style>
    </div>
  );
}
