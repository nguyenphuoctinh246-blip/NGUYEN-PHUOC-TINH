import type { Transaction } from "./types";

const KEY = "vn_expense_v2";

export function loadTransactions(): Transaction[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : null;
  } catch {
    return null;
  }
}

export function saveTransactions(tx: Transaction[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tx));
  } catch {
    /* storage unavailable (private mode, quota) — ignore */
  }
}
