import type { Account, AccountKind, Transaction } from "./types";

export const ACCOUNT_KINDS: Record<AccountKind, { label: string; icon: string; color: number }> = {
  cash: { label: "Tiền mặt", icon: "💵", color: 3 },
  bank: { label: "Tài khoản ngân hàng", icon: "🏦", color: 1 },
  ewallet: { label: "Ví điện tử", icon: "📱", color: 5 },
  credit: { label: "Thẻ tín dụng", icon: "💳", color: 2 },
  saving: { label: "Tiết kiệm", icon: "🐷", color: 4 },
};

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: "tien_mat", name: "Tiền mặt", kind: "cash", opening: 0 },
  { id: "ngan_hang", name: "Tài khoản ngân hàng", kind: "bank", opening: 0 },
  { id: "vi_dien_tu", name: "Ví điện tử", kind: "ewallet", opening: 0 },
];

export function accountBalance(a: Account, tx: Transaction[]): number {
  let b = a.opening;
  for (const t of tx) if (t.account === a.id) b += t.type === "income" ? t.amount : -t.amount;
  return b;
}
