// Cấu hình kết nối Supabase. Ưu tiên biến môi trường (đặt trên Vercel); nếu không có thì dùng
// cấu hình nhập ngay trong ứng dụng (lưu trên thiết bị). Cả hai chỉ là thông tin công khai
// (địa chỉ dự án + khóa anon/publishable), không phải khóa bí mật.
// Next.js chỉ thay thế các biến NEXT_PUBLIC_* khi được viết nguyên văn như dưới đây.
const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ENV_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Bản xem trước một file không kết nối được ra ngoài nên tắt phần nhập cấu hình */
export const runtimeConfigAllowed = process.env.NEXT_PUBLIC_STATIC_PREVIEW !== "1";

const STORE_KEY = "vn_cloud_config";

export interface CloudConfig { url: string; key: string; source: "env" | "device" }

/** Chuẩn hóa Project URL: thêm https://, bỏ phần đường dẫn thừa (ví dụ /rest/v1/ hay /dashboard/...) */
export function normalizeUrl(u: string): string {
  let v = u.trim().replace(/\/+$/, "");
  if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
  try { return new URL(v).origin; } catch { return v; }
}

/** Cấu hình nhập trong ứng dụng được ưu tiên hơn biến môi trường, để sửa được khi biến môi trường bị sai */
export function getCloudConfig(): CloudConfig | null {
  if (runtimeConfigAllowed && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const c = raw ? (JSON.parse(raw) as { url?: string; key?: string }) : null;
      if (c?.url && c.key) return { url: c.url, key: c.key, source: "device" };
    } catch { /* bỏ qua */ }
  }
  if (ENV_URL && ENV_KEY) return { url: ENV_URL, key: ENV_KEY, source: "env" };
  return null;
}

export function saveCloudConfig(url: string, key: string) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ url: normalizeUrl(url), key: key.trim() }));
}
export function clearCloudConfig() {
  try { localStorage.removeItem(STORE_KEY); } catch { /* bỏ qua */ }
}

const enc = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));

/** Đường link để thiết bị khác tự kết nối cùng nguồn dữ liệu (cấu hình nằm sau dấu #, không gửi lên máy chủ web) */
export function shareLink(c: CloudConfig): string {
  return `${window.location.origin}${window.location.pathname}#ket-noi=${enc({ u: c.url, k: c.key })}`;
}

/**
 * Đọc cấu hình trong địa chỉ dạng #ket-noi=... NHƯNG CHƯA LƯU: người dùng phải xác nhận,
 * để người lạ không thể gửi link đổi ứng dụng sang máy chủ giả mạo rồi lấy mật khẩu.
 */
export function parseConnectHash(): { url: string; key: string } | null {
  if (!runtimeConfigAllowed || typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#ket-noi=(.+)$/);
  if (!m) return null;
  try {
    const { u, k } = dec(m[1]) as { u?: string; k?: string };
    if (u && k && /^https?:\/\//i.test(u)) return { url: normalizeUrl(u), key: k };
  } catch { /* liên kết hỏng */ }
  return null;
}

export function clearConnectHash() {
  window.location.hash = "dong-bo"; // xóa cấu hình khỏi thanh địa chỉ và mở mục Đồng bộ
}
