import type { Transaction } from "./types";

/** month = 0 nghĩa là cả năm */
export interface Period { year: number; month: number }

const pad = (n: number) => String(n).padStart(2, "0");

export const periodPrefix = (p: Period) => (p.month ? `${p.year}-${pad(p.month)}` : `${p.year}-`);
export const inPeriod = (t: Transaction, p: Period) => t.date.startsWith(periodPrefix(p));
export const periodLabel = (p: Period) => (p.month ? `Tháng ${p.month}/${p.year}` : `Năm ${p.year}`);
export const prevLabel = (p: Period) => (p.month ? "tháng trước" : "năm trước");

export function prevPeriod(p: Period): Period {
  if (p.month === 0) return { year: p.year - 1, month: 0 };
  return p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 };
}

export function totals(tx: Transaction[]) {
  let inc = 0;
  let exp = 0;
  for (const t of tx) {
    if (t.type === "income") inc += t.amount;
    else exp += t.amount;
  }
  return { inc, exp, bal: inc - exp };
}

/** Tổng thu, chi của 12 tháng trong một năm (index 0 = tháng 1) */
export function monthlyTotals(tx: Transaction[], year: number) {
  const out = Array.from({ length: 12 }, () => ({ inc: 0, exp: 0, count: 0 }));
  for (const t of tx) {
    if (!t.date.startsWith(`${year}-`)) continue;
    const m = parseInt(t.date.slice(5, 7), 10) - 1;
    if (m < 0 || m > 11) continue;
    out[m].count++;
    if (t.type === "income") out[m].inc += t.amount;
    else out[m].exp += t.amount;
  }
  return out;
}

export function yearsOf(tx: Transaction[], extra: number[] = []): number[] {
  const set = new Set<number>(extra);
  for (const t of tx) {
    const y = parseInt(t.date.slice(0, 4), 10);
    if (y) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}
