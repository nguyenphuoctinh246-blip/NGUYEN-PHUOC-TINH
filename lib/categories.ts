import type { Category, TxType } from "./types";

type Seed = [string, string, string];
const EXPENSE: Seed[] = [
  ["an_uong", "Ăn uống", "🍜"], ["di_lai", "Đi lại", "🚗"], ["nha_cua", "Nhà cửa", "🏠"], ["hoa_don", "Hóa đơn & tiện ích", "🧾"],
  ["giai_tri", "Giải trí", "🎮"], ["suc_khoe", "Sức khỏe", "🏥"], ["giao_duc", "Giáo dục", "📚"], ["mua_sam", "Mua sắm", "🛒"],
  ["gia_dinh", "Gia đình & con cái", "👨‍👩‍👧"], ["du_lich", "Du lịch", "✈️"], ["bao_hiem", "Bảo hiểm", "🛡️"], ["chi_khac", "Chi khác", "📦"],
];
const INCOME: Seed[] = [
  ["luong", "Lương", "💼"], ["thuong", "Thưởng", "🎁"], ["kinh_doanh", "Kinh doanh", "🏪"],
  ["dau_tu", "Đầu tư", "📈"], ["phu_thu", "Thu nhập phụ", "💡"], ["thu_khac", "Thu khác", "💰"],
];

export const DEFAULT_CATEGORIES: Category[] = [
  ...EXPENSE.map<Category>(([id, label, icon], i) => ({ id, label, icon, type: "expense", color: (i % 12) + 1 })),
  ...INCOME.map<Category>(([id, label, icon], i) => ({ id, label, icon, type: "income", color: ((EXPENSE.length + i) % 12) + 1 })),
];

/**
 * Danh mục đang dùng. Được cập nhật mỗi khi dữ liệu thay đổi (xem useStore),
 * để các hàm tra cứu dưới đây dùng được ở mọi nơi mà không phải truyền tham số.
 */
let registry: Category[] = DEFAULT_CATEGORIES;
export function setCategories(list: Category[]) {
  registry = list;
}

export const catList = (type: TxType): Category[] => registry.filter((c) => c.type === type);
export const allCats = (): Category[] => registry;

export function catInfo(id: string): Category {
  return registry.find((c) => c.id === id) ?? { id, label: "Chưa phân loại", icon: "📌", type: "expense", color: 12 };
}
export const catColor = (id: string): string => `var(--cat-${catInfo(id).color})`;

/** Nền nhạt cùng tông với màu danh mục, dùng cho ô biểu tượng */
export const tint = (color: string, pct = 16) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
export const fallbackCategory = (type: TxType) => (type === "income" ? "thu_khac" : "chi_khac");

export const CATEGORY_ICONS = [
  "🍜", "☕", "🍔", "🛒", "🥗", "🍺", "🚗", "⛽", "🚌", "✈️", "🏠", "💡", "🧾", "📱", "🌐", "👕",
  "💊", "🏥", "🦷", "📚", "🎓", "🎮", "🎬", "🎵", "🏋️", "🐶", "👶", "👨‍👩‍👧", "🎁", "💄", "🔧", "🛡️",
  "💼", "🏪", "📈", "💰", "💵", "🏦", "🎯", "🌴", "⚽", "🎉", "🧳", "📦",
];
