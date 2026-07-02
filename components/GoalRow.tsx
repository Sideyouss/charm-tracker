"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

const ease = [0.16, 1, 0.3, 1] as const;

export interface Chip {
  label: string;
  value: string;
}

interface Props {
  label: string;
  meta: string;
  current: number;
  target: number;
  format: (n: number) => string;
  status: "ok" | "stale" | "error";
  loading: boolean;
  chips?: Chip[];
  delay?: number;
}

/**
 * One scoreboard row: the figure itself is the design. A screen-filling
 * number, its percentage as hollow outline type, a full-bleed bar with a
 * light sweep, and a monospace telemetry line underneath. No card, no chrome.
 */
function GoalRow({
  label,
  meta,
  current,
  target,
  format,
  status,
  loading,
  chips = [],
  delay = 0,
}: Props) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const reached = current >= target;
  const remaining = Math.max(0, target - current);
  const pctLabel = (pct >= 100 ? "100" : pct.toFixed(1)).replace(".", ",");

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease }}
      className="py-8 sm:py-12"
    >
      {/* Label line */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3 font-mono text-xs uppercase tracking-[0.22em]">
          <span className="font-semibold text-ink">{label}</span>
          <span className="text-ink-400" aria-hidden>
            ／
          </span>
          <span className="text-ink-400">{meta}</span>
        </div>
        <StatusTag status={status} />
      </div>

      {/* The number vs. its percentage */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-1">
        {loading ? (
          <div className="h-[clamp(2.5rem,9vw,7.5rem)] w-56 max-w-full animate-pulse bg-white/[0.07]" />
        ) : (
          <AnimatedNumber
            value={current}
            format={format}
            className={`font-display text-[clamp(2.5rem,10vw,8.5rem)] font-black leading-[0.95] tracking-[-0.03em] ${
              reached ? "text-accent" : "text-ink"
            }`}
          />
        )}
        <div
          className={`font-display text-[clamp(1.5rem,5vw,4.2rem)] font-black leading-none tracking-[-0.02em] ${
            reached ? "text-outline-accent" : "text-outline"
          }`}
          aria-label={`${pctLabel} pour cent`}
        >
          {loading ? "—" : `${pctLabel}%`}
        </div>
      </div>

      {/* Full-bleed bar */}
      <div className="mt-6 h-1.5 w-full bg-white/[0.08]">
        <motion.div
          className="relative h-full overflow-hidden bg-accent shadow-[0_0_16px_rgba(240,180,41,0.45)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, ease, delay: delay + 0.2 }}
        >
          <span className="bar-shine" aria-hidden />
        </motion.div>
      </div>

      {/* Telemetry line */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 font-mono text-[0.75rem] text-ink-500 sm:gap-x-7 sm:text-[0.8rem]">
        <span>
          objectif <b className="tnum font-semibold text-ink-700">{format(target)}</b>
        </span>
        {reached ? (
          <span className="font-semibold text-accent">objectif atteint</span>
        ) : (
          <span>
            reste <b className="tnum font-semibold text-ink-700">{format(remaining)}</b>
          </span>
        )}
        {chips.map((chip) => (
          <span key={chip.label}>
            {chip.label.toLowerCase()}{" "}
            <b className="tnum font-semibold text-ink-700">{chip.value}</b>
          </span>
        ))}
      </div>
    </motion.section>
  );
}

function StatusTag({ status }: { status: "ok" | "stale" | "error" }) {
  const map = {
    ok: { dot: "#4ade80", text: "en direct" },
    stale: { dot: "#fbbf24", text: "obsolète" },
    error: { dot: "#f87171", text: "erreur" },
  }[status];
  return (
    <span className="inline-flex items-center gap-2 border border-white/12 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-500">
      <span className="relative flex h-1.5 w-1.5">
        {status === "ok" && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: map.dot }}
          />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: map.dot }} />
      </span>
      {map.text}
    </span>
  );
}

export default memo(GoalRow);
