"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";
import ProgressRing from "./ProgressRing";

type Accent = "money" | "reach";

const TEXT: Record<Accent, string> = {
  money: "text-emerald-300",
  reach: "text-sky-300",
};

interface Props {
  accent: Accent;
  label: string;
  meta: string;
  current: number;
  target: number;
  format: (n: number) => string;
  status: "ok" | "stale" | "error";
  loading: boolean;
  /** Flip ring to the right on desktop for visual rhythm. */
  mirror?: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function GoalCard({
  accent,
  label,
  meta,
  current,
  target,
  format,
  status,
  loading,
  mirror,
}: Props) {
  const ratio = target > 0 ? current / target : 0;
  const pct = Math.min(100, ratio * 100);
  const reached = current >= target;
  const remaining = Math.max(0, target - current);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      className={`flex flex-col items-center gap-9 md:gap-16 ${
        mirror ? "md:flex-row-reverse md:text-right" : "md:flex-row"
      }`}
    >
      <ProgressRing progress={ratio} accent={accent} size={208} stroke={14}>
        <div className="flex items-baseline">
          <span
            className={`tnum text-5xl font-semibold tracking-tight ${TEXT[accent]} sm:text-6xl`}
          >
            {pct.toFixed(0)}
          </span>
          <span className={`text-2xl font-medium ${TEXT[accent]} opacity-60`}>
            %
          </span>
        </div>
      </ProgressRing>

      <div className="w-full">
        <div
          className={`flex items-center gap-2.5 ${
            mirror ? "md:justify-end" : ""
          }`}
        >
          <StatusDot status={status} />
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            {label}
          </span>
          <span className="text-xs text-white/25">{meta}</span>
        </div>

        {loading ? (
          <div className="mt-5 h-16 w-2/3 animate-pulse rounded-2xl bg-white/[0.04] sm:h-20" />
        ) : (
          <AnimatedNumber
            value={current}
            format={format}
            className="mt-3 block bg-gradient-to-b from-white to-white/70 bg-clip-text text-6xl font-semibold leading-[0.95] tracking-tighter text-transparent sm:text-7xl lg:text-8xl"
          />
        )}

        <p className="mt-5 text-sm text-white/40">
          {reached ? (
            <span className={`font-medium ${TEXT[accent]}`}>
              Goal smashed — set a bigger one
            </span>
          ) : (
            <>
              <span className="tnum font-medium text-white/70">
                {format(remaining)}
              </span>{" "}
              to go
              <span className="mx-2 text-white/20">/</span>
              target{" "}
              <span className="tnum text-white/60">{format(target)}</span>
            </>
          )}
        </p>
      </div>
    </motion.div>
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
