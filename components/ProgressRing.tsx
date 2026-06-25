"use client";

import { memo } from "react";
import { motion } from "framer-motion";

type Accent = "money" | "reach";

// Desaturated, singular accents — emerald for money, electric cyan for reach.
const GRAD: Record<Accent, [string, string]> = {
  money: ["#34d399", "#059669"],
  reach: ["#38bdf8", "#0284c7"],
};

interface Props {
  /** 0..1 */
  progress: number;
  accent: Accent;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}

/**
 * A goal ring that draws itself on mount and springs to new values. Isolated
 * leaf so the perpetual stroke physics never re-render the dashboard layout.
 */
function ProgressRing({ progress, accent, size = 208, stroke = 14, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);
  const [from, to] = GRAD[accent];
  const id = `ring-${accent}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 55, damping: 22, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default memo(ProgressRing);
