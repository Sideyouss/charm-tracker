/**
 * Ongoing-calendar-month helpers. Client-safe (pure Date math) — both the
 * data layer and the UI reason about "this month" through these.
 */

export function monthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(d: Date = new Date()): number {
  return d.getDate();
}

/** Fractional days since the month began (e.g. 1.5 at noon on the 2nd). */
export function daysElapsed(d: Date = new Date()): number {
  return (d.getTime() - monthStart(d).getTime()) / 86_400_000;
}

/** French label for the ongoing month, e.g. "juillet 2026". */
export function monthLabel(d: Date = new Date()): string {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
