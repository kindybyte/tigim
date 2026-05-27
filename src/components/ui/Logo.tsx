interface LogoProps {
  variant?: "dark" | "light";
  size?: number;
  withWordmark?: boolean;
}

export default function Logo({ variant = "dark", size = 28, withWordmark = true }: LogoProps) {
  const fg = variant === "dark" ? "#2563EB" : "#FFFFFF";
  const accent = variant === "dark" ? "#60A5FA" : "#BFDBFE";
  return (
    <div className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="64" height="64" rx="14" fill={fg} />
        <path
          d="M16 22h32M22 22v22M42 22v22"
          stroke={accent}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="44" r="4" fill={accent} />
      </svg>
      {withWordmark && (
        <span
          className={`text-[19px] font-bold tracking-tight ${
            variant === "dark" ? "text-ink-900" : "text-white"
          }`}
        >
          Tigim
        </span>
      )}
    </div>
  );
}
