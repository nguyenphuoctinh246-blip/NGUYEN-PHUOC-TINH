import type { User } from "@supabase/supabase-js";

/** Supabase bắt buộc có email, nên tên đăng nhập được đổi thành địa chỉ nội bộ này (không bao giờ gửi email tới đó) */
export const LOGIN_DOMAIN = "chitieu.local";

/** "Bé An" → "be.an": bỏ dấu, chữ thường, khoảng trắng thành dấu chấm */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/\s+/g, ".");
}

export const isEmailLike = (raw: string) => raw.includes("@");

/** Trả về thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ */
export function validateLogin(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Vui lòng nhập tên đăng nhập.";
  if (isEmailLike(v)) return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v) ? null : "Email chưa đúng định dạng (ví dụ ten@gmail.com), hoặc bỏ dấu @ và dùng tên đăng nhập.";
  const u = normalizeUsername(v);
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) return "Tên đăng nhập dài 3 đến 30 ký tự, chỉ gồm chữ không dấu, số và các dấu . _ - (ví dụ: be.an).";
  return null;
}

/** Giá trị gửi cho Supabase: email thật nếu người dùng nhập email, còn không là tên đăng nhập + tên miền nội bộ */
export function toLoginEmail(raw: string): string {
  const v = raw.trim();
  return isEmailLike(v) ? v.toLowerCase() : `${normalizeUsername(v)}@${LOGIN_DOMAIN}`;
}

/** Tên hiển thị của tài khoản: tên đăng nhập hoặc email */
export function accountName(user: Pick<User, "email"> | null | undefined): string {
  const e = user?.email ?? "";
  return e.endsWith("@" + LOGIN_DOMAIN) ? e.slice(0, -(LOGIN_DOMAIN.length + 1)) : e || "–";
}
