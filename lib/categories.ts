import type { Category, TxType } from "./types";

export const CATEGORIES: Record<TxType, Category[]> = {
  income: [
    { id: "luong", label: "Lương", icon: "💼" },
    { id: "thuong", label: "Thưởng", icon: "🎁" },
    { id: "dau_tu", label: "Đầu tư", icon: "📈" },
    { id: "phu_thu", label: "Phụ thu", icon: "💡" },
    { id: "thu_khac", label: "Thu khác", icon: "💰" },
  ],
  expense: [
    { id: "an_uong", label: "Ăn uống", icon: "🍜" },
    { id: "di_lai", label: "Đi lại", icon: "🚗" },
    { id: "nha_cua", label: "Nhà cửa", icon: "🏠" },
    { id: "giai_tri", label: "Giải trí", icon: "🎮" },
    { id: "suc_khoe", label: "Sức khỏe", icon: "🏥" },
    { id: "giao_duc", label: "Giáo dục", icon: "📚" },
    { id: "mua_sam", label: "Mua sắm", icon: "🛒" },
    { id: "chi_khac", label: "Chi khác", icon: "📦" },
  ],
};

const ALL = [...CATEGORIES.expense, ...CATEGORIES.income];

/** CSS variables defined in globals.css (--cat-1 … --cat-8) */
const CAT_COLORS = Array.from({ length: 8 }, (_, i) => `var(--cat-${i + 1})`);

export function catInfo(id: string): Category {
  return ALL.find((c) => c.id === id) ?? { id, label: id, icon: "📌" };
}

export function catColor(id: string): string {
  const i = CATEGORIES.expense.findIndex((c) => c.id === id);
  if (i >= 0) return CAT_COLORS[i % 8];
  const j = CATEGORIES.income.findIndex((c) => c.id === id);
  return CAT_COLORS[(CATEGORIES.expense.length + Math.max(j, 0)) % 8];
}
