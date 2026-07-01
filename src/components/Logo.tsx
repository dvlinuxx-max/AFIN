export function Logo({ size = 28, mark = false }: { size?: number; mark?: boolean }) {
  const glyph = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="afin-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea371" />
          <stop offset="1" stopColor="#0d7d6b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#afin-g)" />
      {/* stacked form rows */}
      <rect x="8.5" y="9" width="9" height="2.4" rx="1.2" fill="#ffffff" opacity="0.55" />
      <rect x="8.5" y="14.8" width="7" height="2.4" rx="1.2" fill="#ffffff" opacity="0.55" />
      {/* a bold check: data verified/collected */}
      <path d="M12 20.4l2.9 2.9L23 15.2" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.2" cy="9.4" r="1.7" fill="#a7f3d0" />
    </svg>
  );

  if (mark) return glyph;

  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight" style={{ fontSize: size }}>
      {glyph}
      <span style={{ color: "var(--color-text)" }}>AFIN</span>
    </span>
  );
}
