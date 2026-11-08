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

export function normalizeUrl(u: string): string {
  let v = u.trim().replace(/\/+$/, "");
  if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
  return v;
}

export function getCloudConfig(): CloudConfig | null {
  if (ENV_URL && ENV_KEY) return { url: ENV_URL, key: ENV_KEY, source: "env" };
  if (!runtimeConfigAllowed || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { url?: string; key?: string };
    return c.url && c.key ? { url: c.url, key: c.key, source: "device" } : null;
  } catch { return null; }
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

/** Nếu địa chỉ có #ket-noi=..., lưu cấu hình và đưa về mục Đồng bộ. Trả về true nếu đã nhập. */
export function importConfigFromHash(): boolean {
  if (!runtimeConfigAllowed || typeof window === "undefined") return false;
  const m = window.location.hash.match(/^#ket-noi=(.+)$/);
  if (!m) return false;
  try {
    const { u, k } = dec(m[1]) as { u?: string; k?: string };
    if (u && k && /^https?:\/\//i.test(u) && !(ENV_URL && ENV_KEY)) saveCloudConfig(u, k);
  } catch { /* liên kết hỏng: bỏ qua */ }
  history.replaceState(null, "", window.location.pathname + "#dong-bo");
  return true;
}
