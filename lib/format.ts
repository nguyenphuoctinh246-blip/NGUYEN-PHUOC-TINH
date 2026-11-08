const nf = new Intl.NumberFormat("vi-VN");

export const fmt = (n: number) => nf.format(n);

export function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "T";
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "Tr";
  if (abs >= 1e4) return (n / 1e3).toFixed(0) + "K";
  return fmt(n);
}

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

export const monthLabel = (d: Date) =>
  d.toLocaleDateString("vi-VN", { month: "short", year: "2-digit" });

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Local-date YYYY-MM-DD (avoids the UTC shift of toISOString) */
export function isoDate(d: Date): string {
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
}
