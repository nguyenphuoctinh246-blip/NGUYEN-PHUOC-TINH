"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getCloud } from "@/lib/cloud/client";
import { cloudConfigured } from "@/lib/cloud/config";
import { SyncEngine, type Snapshot, type SyncInfo, type VerifyRow } from "@/lib/cloud/engine";
import type { StoreApi } from "./useStore";

const LINK_KEY = "vn_cloud_uid";
const SNAP_KEY = "vn_cloud_snap_";
const IDLE: SyncInfo = { status: "idle", pending: 0, lastSync: null, message: "" };

const readLink = () => { try { return localStorage.getItem(LINK_KEY); } catch { return null; } };
const writeLink = (v: string | null) => { try { if (v) localStorage.setItem(LINK_KEY, v); else localStorage.removeItem(LINK_KEY); } catch { /* bỏ qua */ } };

export function viAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Sai email hoặc mật khẩu.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email này đã được đăng ký. Hãy chuyển sang Đăng nhập.";
  if (m.includes("at least") && m.includes("password")) return "Mật khẩu cần tối thiểu 6 ký tự.";
  if (m.includes("not confirmed")) return "Email chưa được xác nhận. Hãy mở email xác nhận rồi đăng nhập lại.";
  if (m.includes("invalid") && m.includes("email")) return "Email không hợp lệ.";
  if (m.includes("rate limit") || m.includes("too many")) return "Thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  if (m.includes("fetch") || m.includes("network")) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return msg;
}

export interface PendingChoice { localTx: number; remoteTx: number }

/** Đăng nhập + đồng bộ dữ liệu giữa các thiết bị (Supabase). Không cấu hình thì mọi thứ ở chế độ chỉ lưu trên máy. */
export function useCloud(s: StoreApi) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloudConfigured);
  const [info, setInfo] = useState<SyncInfo>(IDLE);
  const [choice, setChoice] = useState<PendingChoice | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const sRef = useRef(s);
  sRef.current = s;

  // Theo dõi phiên đăng nhập
  useEffect(() => {
    const db = getCloud();
    if (!db) return;
    let alive = true;
    void db.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setAuthReady(true); } });
    const { data } = db.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  const uid = session?.user.id ?? null;

  // Khởi động đồng bộ khi đã đăng nhập và dữ liệu trên máy đã nạp xong
  useEffect(() => {
    const db = getCloud();
    if (!db || !uid || !s.ready) return;
    const eng = new SyncEngine(db, uid, {
      getStore: () => sRef.current.getStore(),
      replaceStore: (st) => sRef.current.replaceAll(st),
      applyRemote: (c) => sRef.current.applyRemote(c),
      onInfo: setInfo,
    }, 500, {
      load: () => { try { const r = localStorage.getItem(SNAP_KEY + uid); return r ? (JSON.parse(r) as Snapshot) : null; } catch { return null; } },
      save: (snap) => { try { localStorage.setItem(SNAP_KEY + uid, JSON.stringify(snap)); } catch { /* bỏ qua */ } },
    });
    engine.current = eng;
    let cancelled = false;
    (async () => {
      try {
        const local = sRef.current.getStore();
        const localTx = local.tx.filter((t) => !t.isSample).length;
        const linked = readLink() === uid;
        if (linked) {
          await eng.start("resume");
        } else if (localTx > 0) {
          const { tx: remoteTx } = await eng.remoteCounts();
          if (cancelled) return;
          if (remoteTx > 0) { setChoice({ localTx, remoteTx }); return; }
          await eng.start("merge");
        } else {
          await eng.start("account");
        }
        writeLink(uid);
      } catch (e) {
        if (!cancelled) setInfo({ ...IDLE, status: "error", message: e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Lỗi không xác định" });
      }
    })();
    const online = () => void eng.flush();
    window.addEventListener("online", online);
    return () => { cancelled = true; window.removeEventListener("online", online); eng.stop(); engine.current = null; setInfo(IDLE); };
  }, [uid, s.ready]);

  // Có thay đổi dữ liệu trên máy: báo cho engine
  useEffect(() => { engine.current?.notify(); }, [s.tx, s.accounts, s.budgets, s.goals, s.categories]);

  const resolveChoice = useCallback(async (mode: "account" | "merge") => {
    setChoice(null);
    if (!engine.current || !uid) return;
    try { await engine.current.start(mode); writeLink(uid); }
    catch (e) { setInfo({ ...IDLE, status: "error", message: e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Lỗi không xác định" }); }
  }, [uid]);

  const signIn = useCallback(async (email: string, password: string) => {
    const db = getCloud(); if (!db) return "Chưa cấu hình đồng bộ.";
    const { error } = await db.auth.signInWithPassword({ email, password });
    return error ? viAuthError(error.message) : null;
  }, []);

  /** Trả về { error } hoặc { needsConfirm } khi dự án yêu cầu xác nhận email */
  const signUp = useCallback(async (email: string, password: string) => {
    const db = getCloud(); if (!db) return { error: "Chưa cấu hình đồng bộ." };
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) return { error: viAuthError(error.message) };
    return { needsConfirm: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const db = getCloud(); if (!db) return;
    try { await engine.current?.flush(); } catch { /* bỏ qua */ }
    const id = session?.user.id;
    await db.auth.signOut();
    writeLink(null);
    try { if (id) localStorage.removeItem(SNAP_KEY + id); } catch { /* bỏ qua */ }
    sRef.current.resetLocal(); // không để lại dữ liệu cá nhân trên thiết bị dùng chung
  }, [session]);

  const syncNow = useCallback(async () => { await engine.current?.flush(); }, []);
  const verify = useCallback(async (): Promise<VerifyRow[]> => (engine.current ? engine.current.verify() : []), []);
  /** Tải lại toàn bộ từ tài khoản, bỏ thay đổi cục bộ chưa gửi */
  const reload = useCallback(async () => { if (engine.current) await engine.current.start("account"); }, []);

  return { configured: cloudConfigured, authReady, user: session?.user ?? null, info, choice, resolveChoice, signIn, signUp, signOut, syncNow, verify, reload };
}

export type CloudApi = ReturnType<typeof useCloud>;
