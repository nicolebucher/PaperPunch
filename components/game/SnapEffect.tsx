const PARTICLE_COUNT = 10;

interface Particle {
  dx: number;
  dy: number;
  delay: number;
}

function buildParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const distance = 36 + Math.random() * 22;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      delay: Math.random() * 0.08,
    };
  });
}

/** Kurzer Partikel-Burst + aufsteigendes "+N Snaps", ausgelöst bei einer richtigen Antwort. */
export function SnapEffect({ amount, snapsUnit }: { amount: number; snapsUnit: string }) {
  const particles = buildParticles();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-brand-400 animate-snap-particle"
            style={
              {
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="absolute right-3 top-0 animate-snap-float text-lg font-bold text-brand-400">
        +{amount} {snapsUnit}
      </div>
    </div>
  );
}
