export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
  /** id tài khoản/ví */
  account: string;
  /** nơi chi tiêu hoặc nguồn thu (cửa hàng, công ty…) */
  payee: string;
  tags: string[];
  isSample?: boolean;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  type: TxType;
  /** 1..12, ứng với biến màu --cat-N (tự đổi theo giao diện sáng/tối) */
  color: number;
}

export type AccountKind = "cash" | "bank" | "ewallet" | "credit" | "saving";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** số dư ban đầu (thẻ tín dụng: số âm = dư nợ) */
  opening: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** YYYY-MM-DD hoặc "" nếu không đặt hạn */
  deadline: string;
  isSample?: boolean;
}

export interface Store {
  tx: Transaction[];
  accounts: Account[];
  /** hạn mức chi mỗi tháng theo id danh mục chi */
  budgets: Record<string, number>;
  goals: Goal[];
  categories: Category[];
}
