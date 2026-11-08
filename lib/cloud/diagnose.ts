import { normalizeUrl } from "./config";

export interface Check { label: string; ok: boolean; warn?: boolean; detail?: string }
export interface Diagnosis { reachable: boolean; ready: boolean; checks: Check[]; confirmEmail: boolean }

async function call(url: string, key: string, path: string, init?: RequestInit) {
  const r = await fetch(url + path, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  let body: unknown = null;
  try { body = await r.json(); } catch { /* không phải JSON */ }
  return { status: r.status, body: body as Record<string, unknown> | null };
}

/** Kiểm tra địa chỉ + khóa, và xem đã chạy file schema.sql chưa, để báo lỗi dễ hiểu trước khi lưu cấu hình */
export async function diagnose(rawUrl: string, key: string): Promise<Diagnosis> {
  const url = normalizeUrl(rawUrl);
  const checks: Check[] = [];
  let confirmEmail = false;
  if (!/^https?:\/\/(localhost(:\d+)?|[^/\s]+\.[^/\s]+)/i.test(url) || !key.trim()) {
    return { reachable: false, ready: false, confirmEmail, checks: [{ label: "Nhập đủ Project URL và khóa", ok: false, detail: "Ví dụ địa chỉ: https://abcdefghijkl.supabase.co" }] };
  }
  if (/service_role|sb_secret_/i.test(key) || (key.split(".").length === 3 && (() => { try { return JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; } catch { return false; } })())) {
    return { reachable: false, ready: false, confirmEmail, checks: [{ label: "Đây là khóa bí mật (service_role/secret)", ok: false, detail: "Tuyệt đối không dùng khóa này. Hãy lấy khóa anon (public) hoặc Publishable key." }] };
  }
  try {
    const a = await call(url, key, "/auth/v1/settings");
    if (a.status === 401 || a.status === 403) { checks.push({ label: "Khóa không đúng", ok: false, detail: "Kiểm tra lại khóa anon/publishable, chép đủ và không thừa khoảng trắng." }); return { reachable: false, ready: false, confirmEmail, checks }; }
    if (a.status !== 200) { checks.push({ label: "Không nhận ra máy chủ Supabase tại địa chỉ này", ok: false, detail: `Mã phản hồi ${a.status}. Kiểm tra lại Project URL.` }); return { reachable: false, ready: false, confirmEmail, checks }; }
    checks.push({ label: "Kết nối được dự án Supabase và khóa hợp lệ", ok: true });
    confirmEmail = a.body?.mailer_autoconfirm === false;
    if (a.body?.disable_signup === true) checks.push({ label: "Đang tắt đăng ký tài khoản mới", ok: true, warn: true, detail: "Nếu chưa có tài khoản, hãy bật lại ở Authentication → Sign In / Providers." });
  } catch {
    checks.push({ label: "Không kết nối được tới địa chỉ này", ok: false, detail: "Kiểm tra Project URL và kết nối mạng." });
    return { reachable: false, ready: false, confirmEmail, checks };
  }
  let tables = false;
  try {
    const t = await call(url, key, "/rest/v1/transactions?select=id&limit=1");
    tables = t.status === 200;
    checks.push(tables ? { label: "Đã có bảng dữ liệu (schema.sql đã chạy)", ok: true } : { label: "Chưa có bảng dữ liệu", ok: false, detail: "Mở Supabase → SQL Editor, dán toàn bộ file schema.sql và bấm Run, rồi bấm Kiểm tra lại." });
  } catch { checks.push({ label: "Không đọc được bảng dữ liệu", ok: false }); }
  if (tables) {
    try {
      const f = await call(url, key, "/rest/v1/rpc/register_device", { method: "POST", body: "{}" });
      const missing = f.status === 404 && /PGRST202|could not find/i.test(JSON.stringify(f.body ?? {}));
      checks.push(missing ? { label: "Chưa có tính năng duyệt thiết bị bằng mã", ok: true, warn: true, detail: "Chạy lại schema.sql bản mới để bật. Vẫn kết nối được." } : { label: "Đã bật duyệt thiết bị bằng mã", ok: true });
    } catch { /* bỏ qua */ }
  }
  return { reachable: true, ready: tables, confirmEmail, checks };
}
