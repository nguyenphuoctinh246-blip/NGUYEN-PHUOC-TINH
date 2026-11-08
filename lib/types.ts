export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
  isSample?: boolean;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}
