"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

type Accent = "money" | "reach";

const ACCENT: Record<Accent, { text: string; bar: string; glow: string; track: string }> = {
  money: {
    text: "text-emerald-400",
    bar: "bg-emerald-400",
    glow: "shadow-[0_0_60px_-12px_rgba(52,211,153,0.45)]",
    track: "bg-emerald-400/10",
  },
  reach: {
    text: "text-blue-400",
    bar: "bg-blue-400",
    glow: "shadow-[0_0_60px_-12px_rgba(96,165,250,0.45)]",
    track: "bg-blue-400/10",
  },
};

interface SubStat {
  label: string;
  value: string;
}

interface Props {
  accent: Accent;
  eyebrow: string;
  objectiveLabel: string;
  current: number;
  target: number;
  format: (n: number) => string;
  formatRemaining: (n: number) => string;
  subStats: SubStat[];
  status: "ok" | "stale" | "error";
  loading: boolean;
  note?: string;
}

export default function GoalCard({
  accent,
  eyebrow,
  objectiveLabel,
  current,
  target,
  format,
  formatRemaining,
  subStats,
  status,
  loading,
  note,
}: Props) {
  const a = ACCENT[accent];
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const reached = current >= target;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-ink-900/80 p-7 sm:p-9 ${a.glow}`}
    >
      <div className="sheen absolute inset-0" aria-hidden />

      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
          {eyebrow}
        </span>
        <StatusDot status={status} accent={a.text} />
      </div>

      {loading ? (
        <div className="relative mt-7 h-[64px] w-3/4 animate-pulse rounded-xl bg-white/[0.06]" />
      ) : (
        <div className="relative mt-6 flex items-end gap-3">
          <AnimatedNumber
            value={current}
            format={format}
            className={`font-mono text-5xl font-semibold leading-none tracking-tight sm:text-6xl ${a.text}`}
          />
          {reached && (
            <span className="mb-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Goal hit
            </span>
          )}
        </div>
      )}

      <div className="relative mt-7">
        <div className={`h-2.5 w-full overflow-hidden rounded-full ${a.track}`}>
          <motion.div
            className={`h-full origin-left rounded-full ${a.bar}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ type: "spring", stiffness: 70, damping: 20 }}
            style={{ width: "100%" }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-sm">
          <span className="tnum font-mono text-white/80">{pct.toFixed(1)}%</span>
          <span className="text-white/45">
            {objectiveLabel}{" "}
            <span className="tnum font-mono text-white/70">{format(target)}</span>
          </span>
        </div>
      </div>

      <div className="relative mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.05]">
        <Cell
          label={reached ? "Surplus" : "To go"}
          value={
            reached
              ? formatRemaining(current - target)
              : formatRemaining(remaining)
          }
        />
        {subStats.slice(0, 1).map((s) => (
          <Cell key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {subStats.length > 1 && (
        <div className="relative mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/40">
          {subStats.slice(1).map((s) => (
            <span key={s.label}>
              {s.label}:{" "}
              <span className="tnum font-mono text-white/65">{s.value}</span>
            </span>
          ))}
        </div>
      )}

      {note && (
        <p className="relative mt-4 text-xs leading-relaxed text-amber-300/70">
          {note}
        </p>
      )}
    </section>
  );
}

function Cell({ label, value }: SubStat) {
  return (
    <div className="bg-ink-900 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div className="tnum mt-0.5 font-mono text-lg text-white/90">{value}</div>
    </div>
  );
}

function StatusDot({
  status,
  accent,
}: {
  status: "ok" | "stale" | "error";
  accent: string;
}) {
  const map = {
    ok: { color: accent, label: "Live" },
    stale: { color: "text-amber-400", label: "Stale" },
    error: { color: "text-red-400", label: "Error" },
  } as const;
  const s = map[status];
  return (
    <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/40">
      <span className="relative flex h-2 w-2">
        {status === "ok" && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.color} opacity-60`}
            style={{ backgroundColor: "currentColor" }}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${s.color}`}
          style={{ backgroundColor: "currentColor" }}
        />
      </span>
      {s.label}
    </span>
  );
}
