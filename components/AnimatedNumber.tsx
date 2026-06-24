"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface Props {
  value: number;
  format: (n: number) => string;
  /** Seconds the count-up takes. */
  duration?: number;
  className?: string;
}

/**
 * Counts smoothly from the previous value to the new one. Isolated leaf
 * component so the rAF animation never re-renders the parent layout.
 */
export default function AnimatedNumber({
  value,
  format,
  duration = 1.1,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={`tnum ${className ?? ""}`}>{format(display)}</span>;
}
