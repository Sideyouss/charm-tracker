"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

type Accent = "money" | "reach";

// One quiet tint per metric — on the bar and the percentage only. Enough to
// tell the cards apart, never enough to shout.
const ACCENT: Record<Accent, { bar: string; text: string; dot: string }> = {
  money: { bar: "bg-emerald-400", text: "text-emerald-300", dot: "bg-emerald-400" },
  reach: { bar: "bg-sky-400", text: "text-sky-300", dot: "bg-sky-400" },
};

interface Stat {
  label: string;
  value: string;
}

interface Props {
  accent: Accent;
  label: string;
  meta: string;
  current: number;
  target: number;
  format: (n: number) => string;
  stats: Stat[];
  status: "ok" | "stale" | "error";
  loading: boolean;
}

export default function GoalCard({
  accent,
  label,
  meta,
  current,
  target,
  format,
  stats,
  status,
  loading,
}: Props) {
  const a = ACCENT[accent];
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const reached = current >= target;
  const remaining = Math.max(0, target - current);

  return (
    <section className="group rounded-3xl border border-white/[0.06] bg-white/[0.015] p-7 transition-colors duration-300 hover:border-white/[0.1] sm:p-9">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-medium text-white/80">{label}</span>
          <span className="text-xs text-white/30">{meta}</span>
        </div>
        <StatusDot status={status} />
      </div>

      {loading ? (
        <div className="mt-7 h-12 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
      ) : (
        <div className="mt-6 flex items-baseline gap-3">
          <AnimatedNumber
            value={current}
            format={format}
            className="text-[2.75rem] font-semibold leading-none tracking-tight text-white sm:text-6xl"
          />
        </div>
      )}

      <div className="mt-8">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className={`h-full origin-left rounded-full ${a.bar}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ type: "spring", stiffness: 60, damping: 22 }}
            style={{ width: "100%" }}
          />
        </div>

        <div className="mt-3.5 flex items-center justify-between text-sm">
          <span className={`tnum font-medium ${a.text}`}>{pct.toFixed(1)}%</span>
          <span className="tnum text-white/40">of {format(target)}</span>
        </div>
      </div>

      <p className="mt-5 text-sm text-white/45">
        {reached ? (
          <span className={a.text}>Goal reached</span>
        ) : (
          <>
            <span className="tnum text-white/70">{format(remaining)}</span> to go
          </>
        )}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs uppercase tracking-wide text-white/30">
              {s.label}
            </div>
            <div className="tnum mt-1.5 text-base text-white/80">
              {loading ? "—" : s.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusDot({ status }: { status: "ok" | "stale" | "error" }) {
  const map = {
    ok: "bg-emerald-400",
    stale: "bg-amber-400",
    error: "bg-red-400",
  } as const;
  return (
    <span className="relative flex h-1.5 w-1.5">
      {status === "ok" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
      )}
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${map[status]}`} />
    </span>
  );
}
