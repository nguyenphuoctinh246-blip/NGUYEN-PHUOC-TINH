import type { Transaction } from "./types";
import { isoDate } from "./format";

export function getSamples(): Transaction[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const mk = (mo: number, d: number) => isoDate(new Date(y, mo, d));
  const prevMonth = (offset: number) => ((m - offset + 12) % 12) + 1;

  const rows: Omit<Transaction, "isSample">[] = [
    { id: "s1", type: "income", amount: 18_000_000, category: "luong", date: mk(m, 1), note: `Lương tháng ${m + 1}` },
    { id: "s2", type: "income", amount: 3_000_000, category: "thuong", date: mk(m, 5), note: "Thưởng KPI" },
    { id: "s3", type: "income", amount: 1_500_000, category: "phu_thu", date: mk(m, 10), note: "Bán dưa lưới" },
    { id: "s4", type: "expense", amount: 4_200_000, category: "an_uong", date: mk(m, 2), note: "Đi chợ + ăn ngoài" },
    { id: "s5", type: "expense", amount: 3_500_000, category: "nha_cua", date: mk(m, 1), note: "Tiền điện nước internet" },
    { id: "s6", type: "expense", amount: 1_800_000, category: "di_lai", date: mk(m, 3), note: "Xăng + bảo dưỡng xe" },
    { id: "s7", type: "expense", amount: 800_000, category: "giai_tri", date: mk(m, 8), note: "Xem phim, cafe" },
    { id: "s8", type: "expense", amount: 1_200_000, category: "suc_khoe", date: mk(m, 6), note: "Thuốc + khám" },
    { id: "s9", type: "expense", amount: 650_000, category: "giao_duc", date: mk(m, 4), note: "Sách và khóa học" },
    { id: "s10", type: "expense", amount: 950_000, category: "mua_sam", date: mk(m, 7), note: "Quần áo" },
    { id: "s11", type: "income", amount: 17_000_000, category: "luong", date: mk(m - 1, 1), note: `Lương tháng ${prevMonth(1)}` },
    { id: "s12", type: "income", amount: 2_000_000, category: "dau_tu", date: mk(m - 1, 15), note: "Cổ tức" },
    { id: "s13", type: "expense", amount: 3_800_000, category: "an_uong", date: mk(m - 1, 5), note: "Ăn uống" },
    { id: "s14", type: "expense", amount: 3_200_000, category: "nha_cua", date: mk(m - 1, 1), note: "Nhà cửa" },
    { id: "s15", type: "expense", amount: 1_500_000, category: "di_lai", date: mk(m - 1, 10), note: "Đi lại" },
    { id: "s16", type: "expense", amount: 400_000, category: "giai_tri", date: mk(m - 1, 12), note: "Giải trí" },
    { id: "s17", type: "income", amount: 16_500_000, category: "luong", date: mk(m - 2, 1), note: `Lương tháng ${prevMonth(2)}` },
    { id: "s18", type: "expense", amount: 4_000_000, category: "an_uong", date: mk(m - 2, 3), note: "Ăn uống" },
    { id: "s19", type: "expense", amount: 3_300_000, category: "nha_cua", date: mk(m - 2, 1), note: "Nhà cửa" },
    { id: "s20", type: "expense", amount: 2_000_000, category: "di_lai", date: mk(m - 2, 8), note: "Đi lại" },
    { id: "s21", type: "expense", amount: 1_000_000, category: "mua_sam", date: mk(m - 2, 14), note: "Mua sắm" },
  ];
  return rows.map((r) => ({ ...r, isSample: true }));
}
