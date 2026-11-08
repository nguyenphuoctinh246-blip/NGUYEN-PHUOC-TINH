import type { SupabaseClient } from "@supabase/supabase-js";

const ID_KEY = "vn_device_id";
const TOKEN_KEY = "vn_device_token";

const hex = (bytes: number) => {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
};

let memo: { id: string; token: string } | null = null;

/** Mã và khóa bí mật của thiết bị này, tạo một lần và lưu trên máy */
export function deviceIdentity(): { id: string; token: string } {
  if (memo) return memo;
  let id = "", token = "";
  try { id = localStorage.getItem(ID_KEY) ?? ""; token = localStorage.getItem(TOKEN_KEY) ?? ""; } catch { /* bỏ qua */ }
  if (!id || !token) {
    id = "dev-" + hex(8);
    token = hex(24);
    try { localStorage.setItem(ID_KEY, id); localStorage.setItem(TOKEN_KEY, token); } catch { /* bỏ qua */ }
  }
  return (memo = { id, token });
}

export function forgetDevice() {
  memo = null;
  try { localStorage.removeItem(ID_KEY); localStorage.removeItem(TOKEN_KEY); } catch { /* bỏ qua */ }
}

/** Tên dễ đọc của thiết bị, ví dụ "Safari trên iPhone" */
export function deviceName(ua = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "máy Mac" : /Linux|X11/.test(ua) ? "Linux" : "thiết bị lạ";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Trình duyệt";
  return `${br} trên ${os}`;
}

export interface DeviceInfo { id: string; name: string; status: "pending" | "approved" | "denied"; created_at: string; approved_at: string | null; last_seen: string; current: boolean; attempts: number }
export type RegisterResult = { kind: "legacy" } | { kind: "ok"; status: "approved" | "pending" | "denied"; code?: string; first: boolean; hasRecovery: boolean };

type Rpc = { data: unknown; error: { message: string; code?: string } | null };
const rpc = (db: SupabaseClient, fn: string, args?: Record<string, unknown>) => db.rpc(fn, args) as unknown as Promise<Rpc>;

/** Chưa chạy lược đồ mới: hàm chưa tồn tại → tạm coi như không bật duyệt thiết bị */
const missing = (e: { message: string; code?: string } | null) => !!e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function|does not exist/i.test(e.message));

export function friendlyDeviceError(msg: string): string {
  if (/last_device/.test(msg)) return "Không thể thu hồi thiết bị đã duyệt cuối cùng.";
  if (/not_approved/.test(msg)) return "Thiết bị này chưa được duyệt nên chưa thực hiện được thao tác.";
  if (/not_pending/.test(msg)) return "Yêu cầu này không còn ở trạng thái chờ duyệt.";
  if (/bad_device/.test(msg)) return "Thông tin thiết bị không hợp lệ. Hãy đăng xuất rồi đăng nhập lại.";
  return msg;
}

export async function registerDevice(db: SupabaseClient): Promise<RegisterResult> {
  const { id, token } = deviceIdentity();
  const { data, error } = await rpc(db, "register_device", { p_id: id, p_token: token, p_name: deviceName() });
  if (missing(error)) return { kind: "legacy" };
  if (error) throw new Error(friendlyDeviceError(error.message));
  const r = data as { status: "approved" | "pending" | "denied"; code?: string; first?: boolean; has_recovery?: boolean };
  return { kind: "ok", status: r.status, code: r.code ?? undefined, first: !!r.first, hasRecovery: !!r.has_recovery };
}

export async function myDevice(db: SupabaseClient): Promise<{ status: "approved" | "pending" | "denied" | "none"; code?: string }> {
  const { data, error } = await rpc(db, "my_device");
  if (error) throw new Error(friendlyDeviceError(error.message));
  const r = data as { status: "approved" | "pending" | "denied" | "none"; code?: string };
  return { status: r.status, code: r.code ?? undefined };
}

export async function listDevices(db: SupabaseClient): Promise<DeviceInfo[]> {
  const { data, error } = await rpc(db, "list_devices");
  if (error) throw new Error(friendlyDeviceError(error.message));
  return (data as DeviceInfo[]) ?? [];
}

export async function approveDevice(db: SupabaseClient, id: string, code: string): Promise<{ ok: boolean; status: string; attemptsLeft?: number }> {
  const { data, error } = await rpc(db, "approve_device", { p_id: id, p_code: code.replace(/\s/g, "") });
  if (error) throw new Error(friendlyDeviceError(error.message));
  const r = data as { ok: boolean; status: string; attempts_left?: number };
  return { ok: r.ok, status: r.status, attemptsLeft: r.attempts_left };
}

export async function denyDevice(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await rpc(db, "deny_device", { p_id: id });
  if (error) throw new Error(friendlyDeviceError(error.message));
}

export async function revokeDevice(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await rpc(db, "revoke_device", { p_id: id });
  if (error) throw new Error(friendlyDeviceError(error.message));
}

export async function createRecoveryCodes(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await rpc(db, "create_recovery_codes");
  if (error) throw new Error(friendlyDeviceError(error.message));
  return (data as string[]) ?? [];
}

export async function useRecoveryCode(db: SupabaseClient, code: string): Promise<{ ok: boolean; status: string; attemptsLeft?: number }> {
  const { data, error } = await rpc(db, "use_recovery_code", { p_code: code });
  if (error) throw new Error(friendlyDeviceError(error.message));
  const r = data as { ok: boolean; status: string; attempts_left?: number };
  return { ok: r.ok, status: r.status, attemptsLeft: r.attempts_left };
}
