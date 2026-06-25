export function formatMoney(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const s = Math.max(0, Math.round(diff / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  return `il y a ${h} h`;
}
