const DRIP_PATH = "M10 2c-2 4-4 6-4 9a4 4 0 0 0 8 0c0-3-2-5-4-9z";

type Size = "header" | "sm" | "lg";

const TEXT_CLASSES: Record<Size, string> = {
  header: "text-2xl",
  sm: "text-base",
  lg: "text-6xl sm:text-7xl",
};

const DRIP_CLASSES: Record<Size, { big: string; small: string }> = {
  header: { big: "h-3 w-3", small: "h-2 w-2" },
  sm: { big: "h-1.5 w-1.5", small: "h-1 w-1" },
  lg: { big: "h-8 w-8", small: "h-5 w-5" },
};

export function Logo({ size = "header" }: { size?: Size }) {
  const drips = DRIP_CLASSES[size];

  return (
    <span className={`relative inline-block ${TEXT_CLASSES[size]}`}>
      <span
        className="font-graffiti inline-block select-none leading-none text-teal-400"
        style={{
          transform: "rotate(-4deg)",
          textShadow: "1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000",
        }}
      >
        Paper<span className="text-white">Punch</span>
      </span>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`absolute text-teal-400 ${drips.big}`}
        style={{ left: "14%", top: "78%" }}
      >
        <path d={DRIP_PATH} />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`absolute text-teal-400 ${drips.small}`}
        style={{ left: "80%", top: "82%" }}
      >
        <path d={DRIP_PATH} />
      </svg>
    </span>
  );
}
