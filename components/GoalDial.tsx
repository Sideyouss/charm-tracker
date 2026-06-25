"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

type Accent = "money" | "reach";

const THEME: Record<Accent, { a: string; b: string; text: string }> = {
  money: { a: "16, 185, 129", b: "45, 212, 191", text: "text-emerald-300" },
  reach: { a: "99, 102, 241", b: "56, 189, 248", text: "text-indigo-300" },
};

const ease = [0.16, 1, 0.3, 1] as const;

export interface Chip {
  label: string;
  value: string;
}

interface Props {
  accent: Accent;
  icon: "money" | "reach";
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
 * A goal card built around one luminous progress ring: current value in the
 * centre, the ring filling to the exact percentage with a glow bloom behind it
 * and a glowing tip riding the leading edge. Memoized so the count-up never
 * re-renders siblings.
 */
function GoalDial({
  accent,
  icon,
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
  const t = THEME[accent];

  // Ring geometry.
  const size = 248;
  const stroke = 16;
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const gid = `grad-${accent}`;

  // Glowing tip position (svg is -rotate-90; param angle is clockwise from there).
  const rad = (pct / 100) * 2 * Math.PI;
  const tipX = c + r * Math.cos(rad);
  const tipY = c + r * Math.sin(rad);

  return (
    <motion.section
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease }}
      whileHover={{ y: -5 }}
      className="glass group relative flex flex-col overflow-hidden rounded-[1.9rem] p-7 sm:p-8"
    >
      {/* Gradient hairline border. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.9rem]"
        style={{
          padding: "1px",
          background: `linear-gradient(150deg, rgba(${t.a},0.6), rgba(${t.b},0.18) 50%, rgba(255,255,255,0.04))`,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: `rgba(${t.a},0.14)`, color: `rgb(${t.b})`, boxShadow: `inset 0 0 0 1px rgba(${t.a},0.3)` }}
          >
            <Icon kind={icon} />
          </span>
          <div className="leading-tight">
            <div className="text-[0.95rem] font-semibold text-ink">{label}</div>
            <div className="text-xs text-ink-400">{meta}</div>
          </div>
        </div>
        <StatusPill status={status} a={t.a} />
      </div>

      {/* Ring */}
      <div className="relative mx-auto my-7 grid place-items-center" style={{ width: size, height: size }}>
        {/* Accent bloom behind the ring. */}
        <div
          className="absolute inset-6 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, rgba(${t.a},0.28), transparent 70%)` }}
          aria-hidden
        />
        <svg width={size} height={size} className="relative -rotate-90">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={`rgb(${t.a})`} />
              <stop offset="100%" stopColor={`rgb(${t.b})`} />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <motion.circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
            transition={{ duration: 1.6, ease, delay: delay + 0.25 }}
            style={{ filter: `drop-shadow(0 0 10px rgba(${t.a},0.7))` }}
          />
          {/* Glowing leading-edge tip. */}
          {pct > 0 && pct < 100 && (
            <motion.circle
              cx={tipX}
              cy={tipY}
              r={stroke / 2 + 1}
              fill="#fff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: delay + 1.7 }}
              style={{ filter: `drop-shadow(0 0 8px rgba(${t.b},0.95))` }}
            />
          )}
        </svg>

        {/* Centre readout */}
        <div className="absolute inset-0 grid place-content-center text-center">
          {loading ? (
            <div className="mx-auto h-9 w-24 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <AnimatedNumber
              value={current}
              format={format}
              className="font-display text-[2.5rem] font-bold leading-none tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]"
            />
          )}
          <div className="mt-2 text-[0.8rem] font-medium text-ink-400">of {format(target)}</div>
        </div>
      </div>

      {/* Percentage + plain-language status */}
      <div className="relative flex items-center justify-center gap-2.5">
        <span
          className="tnum rounded-full px-2.5 py-1 text-sm font-bold text-white"
          style={{ background: `linear-gradient(90deg, rgb(${t.a}), rgb(${t.b}))`, boxShadow: `0 4px 16px -4px rgba(${t.a},0.7)` }}
        >
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
        <span className="text-sm text-ink-500">
          {reached ? (
            <span className={`font-semibold ${t.text}`}>Goal reached 🎉</span>
          ) : (
            <>
              <span className="tnum font-semibold text-ink-700">{format(remaining)}</span> to go
            </>
          )}
        </span>
      </div>

      {/* Secondary figures */}
      {chips.length > 0 && (
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-5">
          {chips.map((chip) => (
            <div key={chip.label}>
              <div className="tnum text-base font-bold text-ink">{chip.value}</div>
              <div className="text-xs text-ink-400">{chip.label}</div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

function StatusPill({ status, a }: { status: "ok" | "stale" | "error"; a: string }) {
  const map = {
    ok: { dot: `rgb(${a})`, text: "Live", cls: "text-emerald-300" },
    stale: { dot: "#fbbf24", text: "Stale", cls: "text-amber-300" },
    error: { dot: "#f87171", text: "Error", cls: "text-red-300" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium ${map.cls}`}>
      <span className="relative flex h-1.5 w-1.5">
        {status === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: map.dot }} />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: map.dot }} />
      </span>
      {map.text}
    </span>
  );
}

function Icon({ kind }: { kind: "money" | "reach" }) {
  if (kind === "money") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10Z" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

export default memo(GoalDial);
