import type { Goal, Transaction } from "./types";
import { isoDate } from "./format";

export const DEFAULT_BUDGETS: Record<string, number> = {
  an_uong: 6_500_000,
  di_lai: 2_000_000,
  nha_cua: 4_500_000,
  hoa_don: 1_500_000,
  giai_tri: 1_500_000,
  suc_khoe: 1_000_000,
  giao_duc: 1_000_000,
  mua_sam: 1_500_000,
};

export function getSamples(): { tx: Transaction[]; goals: Goal[] } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const mk = (mo: number, d: number) => isoDate(new Date(y, mo, d));
  const prevNum = (k: number) => ((m - k + 12) % 12) + 1;
  type Row = [number, number, "income" | "expense", number, string, string, string, string, string[]];
  // [tháng lùi, ngày, loại, tiền, danh mục, tài khoản, nơi chi/nguồn, ghi chú, nhãn]
  const rows: Row[] = [
    [0, 1, "income", 18_000_000, "luong", "ngan_hang", "Công ty ABC", `Lương tháng ${m + 1}`, ["cố định"]],
    [0, 5, "income", 3_000_000, "thuong", "ngan_hang", "Công ty ABC", "Thưởng KPI", []],
    [0, 10, "income", 1_500_000, "phu_thu", "tien_mat", "Chợ nông sản", "Bán dưa lưới", []],
    [0, 2, "expense", 2_400_000, "an_uong", "tien_mat", "Chợ & siêu thị", "Đi chợ tuần", ["gia đình"]],
    [0, 7, "expense", 1_800_000, "an_uong", "vi_dien_tu", "Nhà hàng", "Ăn ngoài", []],
    [0, 1, "expense", 3_500_000, "nha_cua", "ngan_hang", "Chủ nhà", "Tiền thuê nhà", ["cố định"]],
    [0, 4, "expense", 1_150_000, "hoa_don", "ngan_hang", "Điện nước", "Điện, nước, internet", ["cố định"]],
    [0, 3, "expense", 1_800_000, "di_lai", "vi_dien_tu", "Trạm xăng", "Xăng + bảo dưỡng xe", []],
    [0, 8, "expense", 800_000, "giai_tri", "vi_dien_tu", "Rạp phim", "Xem phim, cafe", []],
    [0, 6, "expense", 1_200_000, "suc_khoe", "tien_mat", "Phòng khám", "Thuốc + khám", []],
    [0, 4, "expense", 650_000, "giao_duc", "ngan_hang", "Nhà sách", "Sách và khóa học", []],
    [0, 7, "expense", 950_000, "mua_sam", "vi_dien_tu", "Cửa hàng", "Quần áo", []],
    [1, 1, "income", 17_000_000, "luong", "ngan_hang", "Công ty ABC", `Lương tháng ${prevNum(1)}`, ["cố định"]],
    [1, 15, "income", 2_000_000, "dau_tu", "ngan_hang", "Cổ tức", "Cổ tức", []],
    [1, 5, "expense", 3_800_000, "an_uong", "tien_mat", "Chợ & siêu thị", "Ăn uống", []],
    [1, 1, "expense", 3_500_000, "nha_cua", "ngan_hang", "Chủ nhà", "Tiền thuê nhà", ["cố định"]],
    [1, 10, "expense", 1_500_000, "di_lai", "vi_dien_tu", "Trạm xăng", "Đi lại", []],
    [1, 12, "expense", 400_000, "giai_tri", "vi_dien_tu", "Cafe", "Giải trí", []],
    [2, 1, "income", 16_500_000, "luong", "ngan_hang", "Công ty ABC", `Lương tháng ${prevNum(2)}`, ["cố định"]],
    [2, 3, "expense", 4_000_000, "an_uong", "tien_mat", "Chợ & siêu thị", "Ăn uống", []],
    [2, 1, "expense", 3_500_000, "nha_cua", "ngan_hang", "Chủ nhà", "Tiền thuê nhà", ["cố định"]],
    [2, 8, "expense", 2_000_000, "di_lai", "vi_dien_tu", "Trạm xăng", "Đi lại", []],
    [2, 14, "expense", 1_000_000, "mua_sam", "vi_dien_tu", "Cửa hàng", "Mua sắm", []],
  ];
  const tx: Transaction[] = rows.map(([k, d, type, amount, category, account, payee, note, tags], i) => ({
    id: `s${i + 1}`, type, amount, category, account, payee, note, tags, date: mk(m - k, d), isSample: true,
  }));
  const goals: Goal[] = [
    { id: "g1", name: "Quỹ khẩn cấp (6 tháng chi tiêu)", target: 60_000_000, saved: 24_000_000, deadline: isoDate(new Date(y, m + 8, 1)), isSample: true },
    { id: "g2", name: "Du lịch Đà Lạt", target: 15_000_000, saved: 6_500_000, deadline: isoDate(new Date(y, m + 4, 1)), isSample: true },
  ];
  return { tx, goals };
}
