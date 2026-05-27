import { Link } from "react-router-dom";

interface Props {
  size?: number;
  /** When true, logo renders in cream-on-dark mode (for use over the dark video). */
  lightOnDark?: boolean;
}

export default function Logo({ size = 26, lightOnDark = false }: Props) {
  const stops = lightOnDark
    ? { from: "#f5efe2", mid: "#cbc7bd", to: "#7a7976" }
    : { from: "#2a2a2c", mid: "#18171a", to: "#0a0908" };

  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-110"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`logo-grad-${lightOnDark ? "light" : "dark"}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stops.from} />
            <stop offset="50%" stopColor={stops.mid} />
            <stop offset="100%" stopColor={stops.to} />
          </linearGradient>
        </defs>
        <rect
          width="32"
          height="32"
          rx="8"
          fill={lightOnDark ? "rgba(255,255,255,0.06)" : "rgba(10,9,8,0.04)"}
          stroke={lightOnDark ? "rgba(245,239,226,0.28)" : "rgba(10,9,8,0.18)"}
        />
        <path
          d="M7 22 L13 11 L17 18 L25 8"
          stroke={`url(#logo-grad-${lightOnDark ? "light" : "dark"})`}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`display text-lg leading-none tracking-tightest transition-colors duration-300 ${
          lightOnDark ? "text-white" : "text-sap-50"
        }`}
      >
        STRIDE
      </span>
    </Link>
  );
}
