import { normalizeUrl } from "./config";

export interface Check { label: string; ok: boolean; warn?: boolean; detail?: string }
export interface Diagnosis { reachable: boolean; ready: boolean; checks: Check[]; confirmEmail: boolean }

async function call(url: string, key: string, path: string, init?: RequestInit) {
  const r = await fetch(url + path, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  let body: unknown = null;
  let json = false;
  try { body = await r.json(); json = true; } catch { /* không phải JSON: thường là một trang web */ }
  return { status: r.status, body: body as Record<string, unknown> | null, json };
}

/** Kiểm tra địa chỉ + khóa, và xem đã chạy file schema.sql chưa, để báo lỗi dễ hiểu trước khi lưu cấu hình */
export async function diagnose(rawUrl: string, key: string): Promise<Diagnosis> {
  const url = normalizeUrl(rawUrl);
  const checks: Check[] = [];
  let confirmEmail = false;
  if (!/^https?:\/\/(localhost(:\d+)?|[^/\s]+\.[^/\s]+)/i.test(url) || !key.trim()) {
    return { reachable: false, ready: false, confirmEmail, checks: [{ label: "Nhập đủ Project URL và khóa", ok: false, detail: "Ví dụ địa chỉ: https://abcdefghijkl.supabase.co" }] };
  }
  const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if (/^(www\.)?supabase\.(com|io)$|\.vercel\.app$|^github\.com$/i.test(host)) {
    return { reachable: false, ready: false, confirmEmail, checks: [{ label: "Đây là địa chỉ một trang web, không phải Project URL", ok: false, detail: "Project URL đúng có dạng https://xxxxxxxxxxxxxxxxxxxx.supabase.co. Lấy ở Supabase → Project Settings → API → Project URL." }] };
  }
  if (/service_role|sb_secret_/i.test(key) || (key.split(".").length === 3 && (() => { try { return JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; } catch { return false; } })())) {
    return { reachable: false, ready: false, confirmEmail, checks: [{ label: "Đây là khóa bí mật (service_role/secret)", ok: false, detail: "Tuyệt đối không dùng khóa này. Hãy lấy khóa anon (public) hoặc Publishable key." }] };
  }
  try {
    const a = await call(url, key, "/auth/v1/settings");
    if (a.status === 401 || a.status === 403) { checks.push({ label: "Khóa không đúng", ok: false, detail: "Kiểm tra lại khóa anon/publishable, chép đủ và không thừa khoảng trắng." }); return { reachable: false, ready: false, confirmEmail, checks }; }
    if (a.status !== 200 || !a.json || !a.body || typeof a.body !== "object" || !("external" in a.body || "mailer_autoconfirm" in a.body || "disable_signup" in a.body)) {
      checks.push({
        label: "Địa chỉ này không trả lời như một dự án Supabase",
        ok: false,
        detail: a.json
          ? `Mã phản hồi ${a.status}. Kiểm tra lại Project URL (Project Settings → API).`
          : "Địa chỉ trả về một trang web thay vì dữ liệu Supabase. Có thể bạn đã dán địa chỉ mẫu, địa chỉ trang quản lý hoặc dự án đã bị tạm dừng (vào Supabase bấm Restore project). Project URL đúng có dạng https://xxxxxxxxxxxxxxxxxxxx.supabase.co.",
      });
      return { reachable: false, ready: false, confirmEmail, checks };
    }
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
    tables = t.status === 200 || ((t.status === 401 || t.status === 403) && /42501|permission denied/i.test(JSON.stringify(t.body ?? {})));
    const missingTable = t.status === 404 || /PGRST205|42P01|does not exist|Could not find the table/i.test(JSON.stringify(t.body ?? {}));
    checks.push(tables
      ? { label: "Đã có bảng dữ liệu (schema.sql đã chạy)", ok: true }
      : missingTable
        ? { label: "Chưa có bảng dữ liệu", ok: false, detail: "Còn một bước: mở Supabase → SQL Editor → New query, dán toàn bộ file schema.sql, bấm Run (chờ chữ Success), rồi quay lại đây bấm Kiểm tra và kết nối lần nữa." }
        : { label: "Không đọc được bảng dữ liệu", ok: false, detail: `Mã phản hồi ${t.status}${t.body && typeof t.body.message === "string" ? ": " + t.body.message : ""}. Hãy chạy lại schema.sql trong SQL Editor rồi thử lại.` });
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
