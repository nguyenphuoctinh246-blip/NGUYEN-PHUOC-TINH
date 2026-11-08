import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCloudConfig } from "./config";

let client: SupabaseClient | null = null;
let clientFor = "";

/** Trả về null khi chưa cấu hình (ứng dụng chạy ở chế độ lưu trên máy). */
export function getCloud(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const cfg = getCloudConfig();
  if (!cfg) return null;
  const id = cfg.url + "|" + cfg.key;
  if (!client || clientFor !== id) {
    client = createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
    clientFor = id;
  }
  return client;
}
