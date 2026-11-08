import type { Category, TxType } from "./types";

export const CATEGORIES: Record<TxType, Category[]> = {
  income: [
    { id: "luong", label: "Lương", icon: "💼" },
    { id: "thuong", label: "Thưởng", icon: "🎁" },
    { id: "kinh_doanh", label: "Kinh doanh", icon: "🏪" },
    { id: "dau_tu", label: "Đầu tư", icon: "📈" },
    { id: "phu_thu", label: "Thu nhập phụ", icon: "💡" },
    { id: "thu_khac", label: "Thu khác", icon: "💰" },
  ],
  expense: [
    { id: "an_uong", label: "Ăn uống", icon: "🍜" },
    { id: "di_lai", label: "Đi lại", icon: "🚗" },
    { id: "nha_cua", label: "Nhà cửa", icon: "🏠" },
    { id: "hoa_don", label: "Hóa đơn & tiện ích", icon: "🧾" },
    { id: "giai_tri", label: "Giải trí", icon: "🎮" },
    { id: "suc_khoe", label: "Sức khỏe", icon: "🏥" },
    { id: "giao_duc", label: "Giáo dục", icon: "📚" },
    { id: "mua_sam", label: "Mua sắm", icon: "🛒" },
    { id: "gia_dinh", label: "Gia đình & con cái", icon: "👨‍👩‍👧" },
    { id: "du_lich", label: "Du lịch", icon: "✈️" },
    { id: "bao_hiem", label: "Bảo hiểm", icon: "🛡️" },
    { id: "chi_khac", label: "Chi khác", icon: "📦" },
  ],
};

const ALL = [...CATEGORIES.expense, ...CATEGORIES.income];
const COLORS = Array.from({ length: 12 }, (_, i) => `var(--cat-${i + 1})`);

export function catInfo(id: string): Category {
  return ALL.find((c) => c.id === id) ?? { id, label: id, icon: "📌" };
}

export function catColor(id: string): string {
  const e = CATEGORIES.expense.findIndex((c) => c.id === id);
  if (e >= 0) return COLORS[e % 12];
  const i = CATEGORIES.income.findIndex((c) => c.id === id);
  return COLORS[(CATEGORIES.expense.length + Math.max(i, 0)) % 12];
}
