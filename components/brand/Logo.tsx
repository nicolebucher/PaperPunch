/* eslint-disable @next/next/no-img-element -- SVG-Bildmarke, keine Optimierung nötig */

type Size = "header" | "sm" | "lg";

// Bildmarke (Buch + Pixel) und Wortmarke "Paper"/"Punch" in Outfit, wie in public/brand/lockup-white.svg.
const MARK_HEIGHT: Record<Size, string> = { header: "h-8", sm: "h-5", lg: "h-20 sm:h-24" };
const TEXT_SIZE: Record<Size, string> = { header: "text-2xl", sm: "text-base", lg: "text-5xl sm:text-6xl" };

export function Logo({ size = "header" }: { size?: Size }) {
  return (
    <span className="inline-flex items-center gap-2 sm:gap-3">
      <img src="/brand/logo-white.svg" alt="" aria-hidden className={`${MARK_HEIGHT[size]} w-auto`} />
      <span className={`font-brand font-bold leading-none tracking-tight ${TEXT_SIZE[size]}`}>
        <span className="text-white">Paper</span>
        <span className="text-[#1FD6EA]">Punch</span>
      </span>
    </span>
  );
}
