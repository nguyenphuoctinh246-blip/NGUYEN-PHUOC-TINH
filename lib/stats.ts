import type { Transaction } from "./types";
import { catInfo } from "./categories";
import { daysInMonth, elapsedDays, totals, type Period } from "./period";

export interface Insights {
  savingsRate: number | null;
  avgDaily: number;
  topCategory: { label: string; icon: string; amount: number; pct: number } | null;
  biggest: Transaction | null;
  forecast: number | null;
}

export function insights(tx: Transaction[], period: Period, now = new Date()): Insights {
  const { inc, exp } = totals(tx);
  const days = Math.max(elapsedDays(period, now), 1);
  const byCat = new Map<string, number>();
  let biggest: Transaction | null = null;
  for (const t of tx) {
    if (t.type !== "expense") continue;
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    if (!biggest || t.amount > biggest.amount) biggest = t;
  }
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const isCurrentMonth = period.month === now.getMonth() + 1 && period.year === now.getFullYear();
  return {
    savingsRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : null,
    avgDaily: exp / days,
    topCategory: top ? { ...catInfo(top[0]), amount: top[1], pct: exp ? (top[1] / exp) * 100 : 0 } : null,
    biggest,
    forecast: isCurrentMonth ? (exp / days) * daysInMonth(period.year, period.month) : null,
  };
}

export function groupSum(tx: Transaction[], key: (t: Transaction) => string | null) {
  const m = new Map<string, number>();
  for (const t of tx) {
    const k = key(t);
    if (k) m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, amount: v })).sort((a, b) => b.amount - a.amount);
}
