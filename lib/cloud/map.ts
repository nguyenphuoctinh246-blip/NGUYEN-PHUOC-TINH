import type { Account, Category, Goal, Store, Transaction } from "../types";

export const TABLES = ["transactions", "accounts", "goals", "categories", "settings"] as const;
export type Table = (typeof TABLES)[number];

type Row = Record<string, unknown>;

/** Chuỗi chuẩn hóa (khóa sắp xếp, bỏ undefined) để so sánh hai bản ghi */
export function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Row).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : val);
}

export const toRow = {
  transactions: (t: Transaction): Row => ({ id: t.id, type: t.type, amount: t.amount, category: t.category, date: t.date, note: t.note, account: t.account, payee: t.payee, tags: t.tags }),
  accounts: (a: Account): Row => ({ id: a.id, name: a.name, kind: a.kind, opening: a.opening }),
  goals: (g: Goal): Row => ({ id: g.id, name: g.name, target: g.target, saved: g.saved, deadline: g.deadline }),
  categories: (c: Category): Row => ({ id: c.id, label: c.label, icon: c.icon, type: c.type, color: c.color }),
  settings: (budgets: Record<string, number>): Row => ({ id: "budgets", budgets }),
};

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v) || d);

export const fromRow = {
  transactions: (r: Row): Transaction => ({
    id: str(r.id), type: r.type === "income" ? "income" : "expense", amount: num(r.amount), category: str(r.category),
    date: str(r.date).slice(0, 10), note: str(r.note), account: str(r.account), payee: str(r.payee),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    createdBy: typeof r.created_by === "string" ? r.created_by : undefined,
    createdAt: typeof r.created_at === "string" ? r.created_at : undefined,
  }),
  accounts: (r: Row): Account => ({ id: str(r.id), name: str(r.name), kind: str(r.kind, "cash") as Account["kind"], opening: num(r.opening) }),
  goals: (r: Row): Goal => ({ id: str(r.id), name: str(r.name), target: num(r.target), saved: num(r.saved), deadline: str(r.deadline) }),
  categories: (r: Row): Category => ({ id: str(r.id), label: str(r.label), icon: str(r.icon, "📦"), type: r.type === "income" ? "income" : "expense", color: num(r.color, 1) }),
  budgets: (r: Row): Record<string, number> => {
    const b = (r.budgets ?? {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, num(v)]).filter(([, v]) => (v as number) > 0));
  },
};

/** Chỉ phần dữ liệu thật (loại dữ liệu mẫu) mới được đồng bộ */
export function realRecords(s: Store): Record<Table, Map<string, { local: unknown; row: Row }>> {
  const mk = <T extends { id: string }>(list: T[], f: (x: T) => Row) => new Map(list.map((x) => [x.id, { local: x, row: f(x) }]));
  return {
    transactions: mk(s.tx.filter((t) => !t.isSample), toRow.transactions),
    accounts: mk(s.accounts, toRow.accounts),
    goals: mk(s.goals.filter((g) => !g.isSample), toRow.goals),
    categories: mk(s.categories, toRow.categories),
    settings: new Map([["budgets", { local: s.budgets, row: toRow.settings(s.budgets) }]]),
  };
}
