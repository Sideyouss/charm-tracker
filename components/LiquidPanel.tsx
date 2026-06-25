"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

type Accent = "money" | "reach";

const C: Record<Accent, { from: string; to: string; text: string; glow: string }> = {
  money: {
    from: "#059669",
    to: "#34d399",
    text: "text-emerald-200",
    glow: "rgba(52,211,153,0.25)",
  },
  reach: {
    from: "#0284c7",
    to: "#38bdf8",
    text: "text-sky-200",
    glow: "rgba(56,189,248,0.25)",
  },
};

const ease = [0.16, 1, 0.3, 1] as const;

interface Props {
  accent: Accent;
  label: string;
  meta: string;
  current: number;
  target: number;
  format: (n: number) => string;
  status: "ok" | "stale" | "error";
  loading: boolean;
  delay?: number;
}

/**
 * A goal "tank" that fills with animated liquid toward its target. The surface
 * ripples on an infinite loop so the panel feels alive at rest. Isolated +
 * memoized so the perpetual wave never re-renders the dashboard.
 */
function LiquidPanel({
  accent,
  label,
  meta,
  current,
  target,
  format,
  status,
  loading,
  delay = 0,
}: Props) {
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const reached = current >= target;
  const remaining = Math.max(0, target - current);
  const c = C[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease }}
      className="group relative flex min-h-[56vh] flex-col justify-between overflow-hidden rounded-[2.25rem] border border-white/[0.08] bg-white/[0.012] p-8 sm:p-10"
    >
      {/* Rising liquid: a full-height layer translated down so its surface sits
          at the fill line. Transform-only animation = GPU friendly. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ y: "100%" }}
        animate={{ y: `${100 - pct}%` }}
        transition={{ type: "spring", stiffness: 40, damping: 18, delay: delay + 0.25 }}
        aria-hidden
      >
        <Wave from={c.from} to={c.to} />
        <div
          className="absolute inset-x-0 bottom-0 top-[26px]"
          style={{
            background: `linear-gradient(to bottom, ${c.from}, ${c.to})`,
            opacity: 0.2,
          }}
        />
      </motion.div>

      {/* Soft accent bloom from the bottom, only on hover for a touch of life. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(60% 80% at 50% 100%, ${c.glow}, transparent 70%)` }}
        aria-hidden
      />

      <div className="relative flex items-center gap-2.5">
        <StatusDot status={status} />
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
          {label}
        </span>
        <span className="text-xs text-white/30">{meta}</span>
      </div>

      <div className="relative">
        {loading ? (
          <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-white/[0.06] sm:h-20" />
        ) : (
          <AnimatedNumber
            value={current}
            format={format}
            className="block font-display text-6xl font-semibold leading-[0.9] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-7xl"
          />
        )}
        <div className="mt-4 flex items-baseline gap-3">
          <span
            className={`tnum font-display text-3xl font-semibold tracking-tight ${c.text}`}
          >
            {pct.toFixed(0)}%
          </span>
          <span className="text-sm text-white/55">
            {reached ? (
              <span className={c.text}>goal reached — keep going</span>
            ) : (
              <>
                <span className="tnum text-white/75">{format(remaining)}</span> to
                go
              </>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/** Two offset sine layers drifting opposite directions = a living surface. */
function Wave({ from, to }: { from: string; to: string }) {
  const path =
    "M0 20 Q 150 2 300 20 T 600 20 T 900 20 T 1200 20 V40 H0 Z";
  return (
    <div className="absolute inset-x-0 top-0 h-[44px] overflow-hidden">
      <motion.svg
        className="absolute left-0 top-0 h-full w-[200%]"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        <path d={path} fill={to} opacity={0.45} />
      </motion.svg>
      <motion.svg
        className="absolute left-0 top-0 h-full w-[200%]"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        <path d={path} fill={from} opacity={0.6} />
      </motion.svg>
    </div>
  );
}

function StatusDot({ status }: { status: "ok" | "stale" | "error" }) {
  const color = {
    ok: "bg-emerald-400",
    stale: "bg-amber-400",
    error: "bg-red-400",
  }[status];
  return (
    <span className="relative flex h-1.5 w-1.5">
      {status === "ok" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${color}`} />
    </span>
  );
}

export default memo(LiquidPanel);
