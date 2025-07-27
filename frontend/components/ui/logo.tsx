export default function QuatrexLogo({
  className = "",
  size = "md",
}: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-10",
    md: "h-14",
    lg: "h-20", // Changed from h-18 to h-20
  }

  const iconSizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20", // Changed from w-18 h-18 to w-20 h-20
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${iconSizeClasses[size]} relative`}>
        {/* Outer glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 blur-sm opacity-60"></div>

        {/* Main container */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 p-0.5">
          <div className="w-full h-full rounded-[15px] bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 flex items-center justify-center relative overflow-hidden">
            {/* Background geometric pattern */}
            <div className="absolute inset-0">
              {/* Diagonal lines */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-2 left-2 w-6 h-0.5 bg-white/20 rotate-45 origin-left"></div>
                <div className="absolute bottom-2 right-2 w-4 h-0.5 bg-white/15 rotate-45 origin-right"></div>
                <div className="absolute top-1/2 right-1 w-3 h-0.5 bg-white/10 -rotate-45"></div>
              </div>

              {/* Dots pattern */}
              <div className="absolute top-1 right-1 w-1 h-1 bg-white/30 rounded-full"></div>
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-white/20 rounded-full"></div>
              <div className="absolute top-2/3 left-2 w-0.5 h-0.5 bg-white/40 rounded-full"></div>
            </div>

            {/* Main icon design */}
            <svg viewBox="0 0 40 40" fill="none" className="w-4/5 h-4/5 text-white relative z-10">
              {/* Central Q shape with modern design */}
              <g>
                {/* Main Q circle */}
                <circle
                  cx="20"
                  cy="20"
                  r="12"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="drop-shadow-sm"
                />

                {/* Q tail with arrow effect */}
                <path
                  d="M28 28l6 6M32 30l2 2 2-2"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Inner design elements */}
                <g opacity="0.9">
                  {/* Trading chart pattern */}
                  <path
                    d="M14 20l3-3 3 4 3-5 3 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Data points */}
                  <circle cx="14" cy="20" r="1.5" fill="currentColor" />
                  <circle cx="17" cy="17" r="1.5" fill="currentColor" />
                  <circle cx="20" cy="21" r="1.5" fill="currentColor" />
                  <circle cx="23" cy="16" r="1.5" fill="currentColor" />
                  <circle cx="26" cy="19" r="1.5" fill="currentColor" />
                </g>

                {/* Modern geometric accents */}
                <g opacity="0.7">
                  {/* Top right accent */}
                  <path d="M26 12l4-4M28 14l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Bottom left accent */}
                  <path d="M14 28l-4 4M12 26l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Digital circuit elements */}
                <g opacity="0.6">
                  <path
                    d="M10 15h6M10 18h4M10 21h6M10 24h3"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />

                  <path
                    d="M24 15h6M26 18h4M24 21h6M27 24h3"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </g>

                {/* Center highlight */}
                <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.8" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Logo Text */}
      <div className="flex flex-col">
        <span
          className={`bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent font-bold tracking-wide ${
            size === "sm" ? "text-2xl" : size === "md" ? "text-3xl" : "text-4xl"
          }`}
          style={{
            fontFamily: 'var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          QUATT<span className="text-purple-500">REX</span>
        </span>
      </div>
    </div>
  )
}

// For backward compatibility
export const Logo = QuatrexLogo