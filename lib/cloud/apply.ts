import type { Store } from "../types";
import type { RemoteChange } from "./engine";
import type { Account, Category, Goal, Transaction } from "../types";

function upsertBy<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

/** Áp dụng một thay đổi nhận từ thiết bị khác vào kho dữ liệu trên máy */
export function applyChange(s: Store, c: RemoteChange): Store {
  if (c.table === "settings") return { ...s, budgets: c.budgets };
  if (c.kind === "delete") {
    switch (c.table) {
      case "transactions": return { ...s, tx: s.tx.filter((x) => x.id !== c.id) };
      case "accounts": return { ...s, accounts: s.accounts.filter((x) => x.id !== c.id) };
      case "goals": return { ...s, goals: s.goals.filter((x) => x.id !== c.id) };
      case "categories": return { ...s, categories: s.categories.filter((x) => x.id !== c.id) };
    }
  }
  if (c.kind === "upsert") {
    switch (c.table) {
      case "transactions": return { ...s, tx: upsertBy(s.tx, c.record as Transaction) };
      case "accounts": return { ...s, accounts: upsertBy(s.accounts, c.record as Account) };
      case "goals": return { ...s, goals: upsertBy(s.goals, c.record as Goal) };
      case "categories": return { ...s, categories: upsertBy(s.categories, c.record as Category) };
    }
  }
  return s;
}
