import type { Store, Transaction } from "./types";
import { DEFAULT_ACCOUNTS } from "./accounts";
import { DEFAULT_CATEGORIES } from "./categories";
import { DEFAULT_BUDGETS, getSamples } from "./samples";

const KEY = "vn_expense_v3";
const OLD_KEY = "vn_expense_v2";

/** Bổ sung các trường mới cho giao dịch cũ */
export function normalizeTx(raw: Partial<Transaction>): Transaction {
  return {
    id: String(raw.id ?? ""),
    type: raw.type === "income" ? "income" : "expense",
    amount: Number(raw.amount) || 0,
    category: String(raw.category ?? "chi_khac"),
    date: String(raw.date ?? ""),
    note: String(raw.note ?? ""),
    account: typeof raw.account === "string" && raw.account ? raw.account : "tien_mat",
    payee: typeof raw.payee === "string" ? raw.payee : "",
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    isSample: raw.isSample ? true : undefined,
  };
}

export function sampleStore(): Store {
  const s = getSamples();
  return { tx: s.tx, accounts: DEFAULT_ACCOUNTS, budgets: DEFAULT_BUDGETS, goals: s.goals, categories: DEFAULT_CATEGORIES };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Store>;
      return {
        tx: (d.tx ?? []).map((t) => normalizeTx(t)),
        accounts: d.accounts?.length ? d.accounts : DEFAULT_ACCOUNTS,
        budgets: d.budgets ?? {},
        goals: d.goals ?? [],
        categories: d.categories?.length ? d.categories : DEFAULT_CATEGORIES,
      };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const arr = JSON.parse(old) as Transaction[];
      if (Array.isArray(arr)) {
        return { tx: arr.map((t) => normalizeTx(t)), accounts: DEFAULT_ACCOUNTS, budgets: DEFAULT_BUDGETS, goals: [], categories: DEFAULT_CATEGORIES };
      }
    }
  } catch {
    /* dữ liệu hỏng: dùng dữ liệu mẫu */
  }
  return sampleStore();
}

export function saveStore(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* không lưu được (chế độ riêng tư, hết dung lượng) */
  }
}
