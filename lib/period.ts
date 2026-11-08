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
export function nextPeriod(p: Period): Period {
  if (p.month === 0) return { year: p.year + 1, month: 0 };
  return p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 };
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

/**
 * Danh sách năm cho ô chọn: luôn có 5 năm gần đây và 2 năm tới,
 * cộng thêm mọi năm có dữ liệu, nên người dùng chọn được năm bất kỳ cần xem.
 */
export function yearOptions(tx: Transaction[], selected: number): number[] {
  const now = new Date().getFullYear();
  let lo = Math.min(now - 5, selected);
  let hi = Math.max(now + 2, selected);
  for (const t of tx) {
    const y = parseInt(t.date.slice(0, 4), 10);
    if (y) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  const out: number[] = [];
  for (let y = hi; y >= lo; y--) out.push(y);
  return out;
}

export function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** Số ngày đã trôi qua trong kỳ (tính đến hôm nay nếu kỳ đang diễn ra) */
export function elapsedDays(p: Period, now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (p.month) {
    if (p.year === y && p.month === m) return now.getDate();
    return daysInMonth(p.year, p.month);
  }
  if (p.year === y) {
    const start = new Date(y, 0, 1).getTime();
    return Math.floor((now.getTime() - start) / 86400000) + 1;
  }
  return (p.year % 4 === 0 && p.year % 100 !== 0) || p.year % 400 === 0 ? 366 : 365;
}
