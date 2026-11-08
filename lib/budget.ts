import type { Transaction } from "./types";
import { groupSum } from "./stats";

export type BudgetStatus = "ok" | "warn" | "over" | "none";
export interface BudgetRow { cat: string; limit: number; spent: number; pct: number; status: BudgetStatus }

/** factor = 1 khi xem một tháng, 12 khi xem cả năm */
export function budgetRows(budgets: Record<string, number>, tx: Transaction[], factor: number): BudgetRow[] {
  const spentBy = new Map(groupSum(tx.filter((t) => t.type === "expense"), (t) => t.category).map((g) => [g.key, g.amount]));
  const cats = new Set([...Object.keys(budgets), ...spentBy.keys()]);
  const rows = [...cats].map<BudgetRow>((cat) => {
    const limit = (budgets[cat] ?? 0) * factor;
    const spent = spentBy.get(cat) ?? 0;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    const status: BudgetStatus = limit <= 0 ? "none" : pct > 100 ? "over" : pct >= 80 ? "warn" : "ok";
    return { cat, limit, spent, pct, status };
  });
  return rows.sort((a, b) => (a.status === "none" ? 1 : 0) - (b.status === "none" ? 1 : 0) || b.pct - a.pct || b.spent - a.spent);
}

export const statusTone = (s: BudgetStatus) => (s === "over" ? "expense" : s === "warn" ? "warn" : s === "ok" ? "income" : "accent") as "expense" | "warn" | "income" | "accent";
