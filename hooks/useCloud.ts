"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getCloud } from "@/lib/cloud/client";
import { getCloudConfig, importConfigFromHash, shareLink, type CloudConfig } from "@/lib/cloud/config";
import {
  approveDevice, createRecoveryCodes, denyDevice, deviceIdentity, forgetDevice, listDevices, myDevice,
  registerDevice, revokeDevice, useRecoveryCode, type DeviceInfo,
} from "@/lib/cloud/device";
import { SyncEngine, type Snapshot, type SyncInfo, type VerifyRow } from "@/lib/cloud/engine";
import type { StoreApi } from "./useStore";

const LINK_KEY = "vn_cloud_uid";
const SNAP_KEY = "vn_cloud_snap_";
const IDLE: SyncInfo = { status: "idle", pending: 0, lastSync: null, message: "" };

const readLink = () => { try { return localStorage.getItem(LINK_KEY); } catch { return null; } };
const writeLink = (v: string | null) => { try { if (v) localStorage.setItem(LINK_KEY, v); else localStorage.removeItem(LINK_KEY); } catch { /* bỏ qua */ } };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Lỗi không xác định");

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
/** checking: đang kiểm tra · approved: được phép · pending: chờ xác nhận bằng mã · denied: bị từ chối · error: lỗi */
export interface DeviceState { status: "checking" | "approved" | "pending" | "denied" | "error"; code?: string; message?: string; legacy?: boolean }

/** Đăng nhập + duyệt thiết bị bằng mã + đồng bộ dữ liệu giữa các thiết bị (Supabase). */
export function useCloud(s: StoreApi) {
  const [cfg, setCfg] = useState<CloudConfig | null>(null);
  const [cfgReady, setCfgReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [info, setInfo] = useState<SyncInfo>(IDLE);
  const [choice, setChoice] = useState<PendingChoice | null>(null);
  const [device, setDevice] = useState<DeviceState>({ status: "checking" });
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const engine = useRef<SyncEngine | null>(null);
  const sRef = useRef(s);
  sRef.current = s;

  // Đọc cấu hình kết nối (biến môi trường, hoặc cấu hình đã nhập/nhận qua link #ket-noi=...)
  useEffect(() => {
    importConfigFromHash();
    setCfg(getCloudConfig());
    setCfgReady(true);
  }, []);

  useEffect(() => {
    const db = cfgReady ? getCloud() : null;
    if (!db) return;
    let alive = true;
    void db.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setSessionChecked(true); } });
    const { data } = db.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [cfgReady]);

  const configured = !!cfg;
  const authReady = cfgReady && (!configured || sessionChecked);
  const uid = session?.user.id ?? null;

  const refreshDevices = useCallback(async () => {
    const db = getCloud();
    if (!db) return;
    try { setDevices(await listDevices(db)); } catch { /* chưa được duyệt hoặc mạng lỗi */ }
  }, []);

  // 1) Khai báo thiết bị; 2) khi được duyệt thì bắt đầu đồng bộ
  useEffect(() => {
    const db = getCloud();
    if (!db || !uid || !s.ready) { setDevice({ status: "checking" }); return; }
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const cleanups: (() => void)[] = [];

    const startSync = async () => {
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
      cleanups.push(() => { eng.stop(); engine.current = null; });
      try {
        const localTx = sRef.current.getStore().tx.filter((t) => !t.isSample).length;
        if (readLink() === uid) await eng.start("resume");
        else if (localTx > 0) {
          const { tx: remoteTx } = await eng.remoteCounts();
          if (cancelled) return;
          if (remoteTx > 0) { setChoice({ localTx, remoteTx }); return; }
          await eng.start("merge");
        } else await eng.start("account");
        writeLink(uid);
      } catch (e) {
        if (!cancelled) setInfo({ ...IDLE, status: "error", message: errMsg(e) });
        return;
      }
      if (cancelled) return;
      // Kéo thay đổi mới định kỳ và mỗi khi quay lại ứng dụng (dự phòng khi Realtime không chạy)
      // Trước mỗi lần kéo dữ liệu, xác nhận thiết bị này vẫn còn được phép (có thể đã bị thu hồi)
      const pull = async () => {
        if (document.visibilityState !== "visible") return;
        try {
          const m = await myDevice(db);
          if (m.status !== "approved" && !cancelled) {
            writeLink(null);
            try { localStorage.removeItem(SNAP_KEY + uid); } catch { /* bỏ qua */ }
            sRef.current.resetLocal(); // thiết bị bị thu hồi: xóa dữ liệu đã lưu trên máy
            setNonce((n) => n + 1);
            return;
          }
        } catch { /* lỗi mạng: bỏ qua, thử lại lần sau */ }
        void eng.pull();
      };
      const flush = () => void eng.flush();
      const iv = setInterval(pull, 15000);
      document.addEventListener("visibilitychange", pull);
      window.addEventListener("focus", pull);
      window.addEventListener("online", flush);
      cleanups.push(() => { clearInterval(iv); document.removeEventListener("visibilitychange", pull); window.removeEventListener("focus", pull); window.removeEventListener("online", flush); });
    };

    (async () => {
      try {
        deviceIdentity();
        const r = await registerDevice(db);
        if (cancelled) return;
        if (r.kind === "legacy") { setDevice({ status: "approved", legacy: true }); await startSync(); return; }
        if (r.status === "approved") {
          setDevice({ status: "approved" });
          if (r.first && !r.hasRecovery) { try { const codes = await createRecoveryCodes(db); if (!cancelled) setRecovery(codes); } catch { /* tạo sau trong mục Đồng bộ */ } }
          await startSync();
          return;
        }
        setDevice({ status: r.status, code: r.code });
        if (r.status === "pending") {
          // Chờ thiết bị tin cậy nhập mã: hỏi trạng thái mỗi 3 giây
          pollTimer = setInterval(async () => {
            try {
              const m = await myDevice(db);
              if (cancelled) return;
              if (m.status === "approved") { if (pollTimer) clearInterval(pollTimer); pollTimer = null; setDevice({ status: "approved" }); await startSync(); }
              else if (m.status === "denied") { if (pollTimer) clearInterval(pollTimer); pollTimer = null; setDevice({ status: "denied" }); }
              else if (m.status === "pending") setDevice((d) => (d.status === "pending" ? { ...d, code: m.code ?? d.code } : d));
            } catch { /* thử lại ở lần sau */ }
          }, 3000);
        }
      } catch (e) {
        if (!cancelled) setDevice({ status: "error", message: errMsg(e) });
      }
    })();

    return () => { cancelled = true; if (pollTimer) clearInterval(pollTimer); cleanups.forEach((f) => f()); setInfo(IDLE); setDevices([]); setDevice({ status: "checking" }); };
  }, [uid, s.ready, nonce]);

  // Thiết bị đã duyệt: định kỳ xem có yêu cầu mới không
  const approved = device.status === "approved" && !device.legacy;
  useEffect(() => {
    if (!approved) return;
    void refreshDevices();
    const iv = setInterval(() => { if (document.visibilityState === "visible") void refreshDevices(); }, 8000);
    return () => clearInterval(iv);
  }, [approved, refreshDevices]);

  // Thay đổi dữ liệu trên máy: báo cho engine
  useEffect(() => { engine.current?.notify(); }, [s.tx, s.accounts, s.budgets, s.goals, s.categories]);

  const resolveChoice = useCallback(async (mode: "account" | "merge") => {
    setChoice(null);
    if (!engine.current || !uid) return;
    try { await engine.current.start(mode); writeLink(uid); } catch (e) { setInfo({ ...IDLE, status: "error", message: errMsg(e) }); }
  }, [uid]);

  const signIn = useCallback(async (email: string, password: string) => {
    const db = getCloud(); if (!db) return "Chưa cấu hình đồng bộ.";
    const { error } = await db.auth.signInWithPassword({ email, password });
    return error ? viAuthError(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const db = getCloud(); if (!db) return { error: "Chưa cấu hình đồng bộ." };
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) return { error: viAuthError(error.message) };
    return { needsConfirm: !data.session };
  }, []);

  /** forget = true: quên thiết bị này, lần sau đăng nhập phải được duyệt lại */
  const signOut = useCallback(async (forget = false) => {
    const db = getCloud(); if (!db) return;
    try { await engine.current?.flush(); } catch { /* bỏ qua */ }
    if (forget) { try { await revokeDevice(db, deviceIdentity().id); } catch { /* thiết bị cuối cùng thì giữ lại */ } }
    const id = session?.user.id;
    await db.auth.signOut();
    writeLink(null);
    if (forget) forgetDevice();
    try { if (id) localStorage.removeItem(SNAP_KEY + id); } catch { /* bỏ qua */ }
    sRef.current.resetLocal(); // không để lại dữ liệu cá nhân trên thiết bị dùng chung
  }, [session]);

  const syncNow = useCallback(async () => { await engine.current?.pull(); await engine.current?.flush(); }, []);
  const verify = useCallback(async (): Promise<VerifyRow[]> => (engine.current ? engine.current.verify() : []), []);
  const reload = useCallback(async () => { if (engine.current) await engine.current.start("account"); }, []);

  // ----- Thao tác với thiết bị -----
  const approve = useCallback(async (id: string, code: string) => {
    const db = getCloud(); if (!db) throw new Error("Chưa cấu hình đồng bộ.");
    const r = await approveDevice(db, id, code);
    await refreshDevices();
    return r;
  }, [refreshDevices]);
  const deny = useCallback(async (id: string) => { const db = getCloud(); if (!db) return; await denyDevice(db, id); await refreshDevices(); }, [refreshDevices]);
  const revoke = useCallback(async (id: string) => { const db = getCloud(); if (!db) return; await revokeDevice(db, id); await refreshDevices(); }, [refreshDevices]);
  const newRecoveryCodes = useCallback(async () => { const db = getCloud(); if (!db) return; setRecovery(await createRecoveryCodes(db)); }, []);
  const submitRecovery = useCallback(async (code: string) => {
    const db = getCloud(); if (!db) throw new Error("Chưa cấu hình đồng bộ.");
    const r = await useRecoveryCode(db, code);
    if (r.status === "denied") setDevice({ status: "denied" });
    return r;
  }, []);
  const dismissRecovery = useCallback(() => setRecovery(null), []);

  return {
    configured, configSource: cfg?.source ?? null, authReady, makeShareLink: () => (cfg ? shareLink(cfg) : ""), user: session?.user ?? null, info, choice, resolveChoice,
    signIn, signUp, signOut, syncNow, verify, reload,
    device, devices, pendingDevices: devices.filter((d) => d.status === "pending"), refreshDevices,
    approve, deny, revoke, recovery, newRecoveryCodes, dismissRecovery, submitRecovery,
  };
}

export type CloudApi = ReturnType<typeof useCloud>;
