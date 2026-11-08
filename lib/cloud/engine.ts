import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Store } from "../types";
import { DEFAULT_ACCOUNTS } from "../accounts";
import { DEFAULT_CATEGORIES } from "../categories";
import { TABLES, canon, fromRow, realRecords, toRow, type Table } from "./map";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";
export interface SyncInfo { status: SyncStatus; pending: number; lastSync: number | null; message: string; realtime: boolean }

export type RemoteChange =
  | { table: Exclude<Table, "settings">; kind: "upsert"; record: unknown }
  | { table: Exclude<Table, "settings">; kind: "delete"; id: string }
  | { table: "settings"; kind: "upsert"; budgets: Record<string, number> };

export interface Handlers {
  getStore: () => Store;
  replaceStore: (s: Store) => void;
  applyRemote: (c: RemoteChange) => void;
  onInfo: (i: SyncInfo) => void;
}

type Row = Record<string, unknown>;
export type Snapshot = Record<Table, Record<string, string>>;
export interface SnapshotStorage { load(): Snapshot | null; save(s: Snapshot): void }

/** Băm ngắn (FNV-1a) để lưu "ảnh chụp" gọn trên máy */
export function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + str.length.toString(36);
}
const hrow = (r: Row) => hash(canon(r));
const CHUNK = 400;
const PAGE = 1000;

export const emptyStore = (): Store => ({ tx: [], accounts: DEFAULT_ACCOUNTS, budgets: {}, goals: [], categories: DEFAULT_CATEGORIES });

export interface VerifyRow { table: string; label: string; local: number; remote: number; onlyLocal: number; onlyRemote: number; different: number }

/**
 * Đồng bộ hai chiều giữa kho dữ liệu trên máy và Supabase.
 * - Đẩy lên: so sánh dữ liệu hiện tại với "ảnh chụp" lần đồng bộ cuối, chỉ gửi bản ghi mới/đổi/xóa.
 * - Kéo về: lắng nghe Realtime, áp dụng thay đổi từ thiết bị khác ngay lập tức.
 */
export class SyncEngine {
  private snap = Object.fromEntries(TABLES.map((t) => [t, new Map<string, string>()])) as Record<Table, Map<string, string>>;
  private channel: RealtimeChannel | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private retryMs = 3000;
  private running = false;
  private dirty = false;
  private started = false;
  private stopped = false;
  private info: SyncInfo = { status: "idle", pending: 0, lastSync: null, message: "", realtime: false };
  private lastFp = "";

  constructor(private db: SupabaseClient, private uid: string, private h: Handlers, private debounceMs = 500, private storage?: SnapshotStorage) {}

  private emit(p: Partial<SyncInfo>) {
    this.info = { ...this.info, ...p };
    this.h.onInfo(this.info);
  }

  // ---------- tải về ----------
  private async fetchTable(table: Table): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db.from(table).select("*").eq("user_id", this.uid).range(from, from + PAGE - 1);
      if (error) throw error;
      out.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  /**
   * "Dấu vân tay" rẻ tiền của dữ liệu trên máy chủ: số dòng + thời điểm sửa gần nhất của từng bảng.
   * Khác nhau nghĩa là có thay đổi (thêm, sửa, xóa) từ thiết bị nào đó.
   */
  async fingerprint(): Promise<string> {
    const parts = await Promise.all(TABLES.map(async (t) => {
      const { data, count, error } = await this.db.from(t).select("updated_at", { count: "exact" }).eq("user_id", this.uid).order("updated_at", { ascending: false }).limit(1);
      if (error) throw error;
      return `${t}:${count ?? 0}:${(data as { updated_at?: string }[] | null)?.[0]?.updated_at ?? ""}`;
    }));
    return parts.join("|");
  }

  /** Dữ liệu đúng như đang có trên máy chủ (có thể thiếu tài khoản/danh mục nếu tài khoản mới) */
  async fetchRemote(): Promise<Store> {
    const [tx, accounts, goals, categories, settings] = await Promise.all(TABLES.map((t) => this.fetchTable(t)));
    return {
      tx: tx.map(fromRow.transactions),
      accounts: accounts.map(fromRow.accounts),
      goals: goals.map(fromRow.goals),
      categories: categories.map(fromRow.categories),
      budgets: settings[0] ? fromRow.budgets(settings[0]) : {},
    };
  }

  /** Số bản ghi thật đang có trên tài khoản (để hỏi người dùng khi gộp dữ liệu) */
  async remoteCounts(): Promise<{ tx: number }> {
    const { count, error } = await this.db.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", this.uid);
    if (error) throw error;
    return { tx: count ?? 0 };
  }

  private setSnapshot(s: Store) {
    const recs = realRecords(s);
    for (const t of TABLES) this.snap[t] = new Map([...recs[t]].map(([id, r]) => [id, hrow(r.row)]));
  }

  private persist() {
    if (!this.storage) return;
    this.storage.save(Object.fromEntries(TABLES.map((t) => [t, Object.fromEntries(this.snap[t])])) as Snapshot);
  }

  /**
   * Gộp ba chiều giữa dữ liệu trên máy (local), trên tài khoản (remote) và lần đồng bộ cuối (base).
   * - Chỉ một bên thay đổi so với base: lấy bên đó. Hai bên giống nhau: giữ nguyên.
   * - Cả hai cùng đổi (xung đột): theo `prefer`.
   */
  private threeWay(remote: Store, local: Store, base: Snapshot | null, prefer: "local" | "remote"): Store {
    const R = realRecords(remote);
    const L = realRecords(local);
    const out: Record<string, unknown[]> = {};
    for (const t of TABLES) {
      if (t === "settings") continue;
      const keep: unknown[] = [];
      const ids = new Set([...R[t].keys(), ...L[t].keys()]);
      for (const id of ids) {
        const r = R[t].get(id), l = L[t].get(id);
        const rh = r && hrow(r.row), lh = l && hrow(l.row), b = base?.[t]?.[id];
        let pick: typeof r;
        if (rh === lh) pick = l ?? r;
        else if (base && lh === b) pick = r; // máy không đổi: lấy bản của tài khoản (hoặc xóa)
        else if (base && rh === b) pick = l; // tài khoản không đổi: giữ thay đổi của máy (hoặc xóa)
        else pick = prefer === "local" ? (l ?? r) : (r ?? l); // xung đột hoặc chưa có base
        if (pick) keep.push(pick.local);
      }
      out[t] = keep;
    }
    // ngân sách: so cả khối với bản gốc
    const rh = hrow(toRow.settings(remote.budgets)), lh = hrow(toRow.settings(local.budgets)), bh = base?.settings?.budgets;
    const budgets = rh === lh ? remote.budgets
      : base && lh === bh ? remote.budgets
      : base && rh === bh ? local.budgets
      : prefer === "local" ? local.budgets : { ...local.budgets, ...remote.budgets };
    return { tx: out.transactions as Store["tx"], accounts: out.accounts as Store["accounts"], goals: out.goals as Store["goals"], categories: out.categories as Store["categories"], budgets };
  }

  /**
   * Bắt đầu đồng bộ.
   * "account": dùng dữ liệu của tài khoản (bỏ dữ liệu trên máy).
   * "merge": lần đầu gộp dữ liệu trên máy vào tài khoản (xung đột: lấy của tài khoản).
   * "resume": máy đã từng đồng bộ; giữ thay đổi chưa kịp gửi, nhận thay đổi mới từ thiết bị khác.
   */
  async start(mode: "account" | "merge" | "resume"): Promise<void> {
    this.emit({ status: "syncing", message: "Đang tải dữ liệu từ tài khoản…" });
    const fp0 = await this.fingerprint().catch(() => "");
    const remote = await this.fetchRemote();
    // Tài khoản mới chưa có tài khoản/danh mục: dùng bộ mặc định và để diff tải chúng lên
    const withDefaults: Store = {
      ...remote,
      accounts: remote.accounts.length ? remote.accounts : DEFAULT_ACCOUNTS,
      categories: remote.categories.length ? remote.categories : DEFAULT_CATEGORIES,
    };
    let local = withDefaults;
    if (mode !== "account") {
      const base = mode === "resume" ? this.storage?.load() ?? null : null;
      local = this.threeWay(withDefaults, this.h.getStore(), base, mode === "resume" ? "local" : "remote");
    }
    this.setSnapshot(remote);
    this.h.replaceStore(local);
    this.started = true;
    this.lastFp = fp0;
    this.subscribe();
    await this.flush();
    this.persist();
  }

  private snapshotObject(): Snapshot {
    return Object.fromEntries(TABLES.map((t) => [t, Object.fromEntries(this.snap[t])])) as Snapshot;
  }

  /**
   * Kéo thay đổi mới từ tài khoản (không phụ thuộc Realtime): gọi định kỳ và khi quay lại ứng dụng.
   * Gộp ba chiều với "ảnh chụp" lần đồng bộ trước nên không làm mất thay đổi chưa gửi trên máy.
   */
  async pull(): Promise<void> {
    if (!this.started || this.stopped || this.running) return;
    this.running = true; // chặn đẩy lên chen ngang trong lúc gộp
    let again = false;
    try {
      const fp = await this.fingerprint();
      if (fp === this.lastFp) { // không có thay đổi mới trên tài khoản: khỏi tải lại cả dữ liệu
        this.emit({ status: "synced", lastSync: Date.now(), message: "" });
        again = true;
      } else {
      const remote = await this.fetchRemote();
      this.lastFp = fp;
      const withDefaults: Store = {
        ...remote,
        accounts: remote.accounts.length ? remote.accounts : DEFAULT_ACCOUNTS,
        categories: remote.categories.length ? remote.categories : DEFAULT_CATEGORIES,
      };
      const local = this.h.getStore();
      const merged = this.threeWay(withDefaults, local, this.snapshotObject(), "local");
      this.setSnapshot(remote);
      const sig = (st: Store) => TABLES.map((t) => [...realRecords(st)[t]].map(([id, r]) => id + hrow(r.row)).sort().join("|")).join("#");
      if (sig(merged) !== sig(local)) this.h.replaceStore(merged);
      this.persist();
      this.emit({ status: "synced", lastSync: Date.now(), message: "" });
      again = true;
      }
    } catch {
      /* lỗi mạng tạm thời: lần sau thử lại, không đổi trạng thái đang hiển thị */
    } finally {
      this.running = false;
    }
    if (again || this.dirty) await this.flush();
  }

  // ---------- đẩy lên ----------
  private diff() {
    const cur = realRecords(this.h.getStore());
    const upserts: { table: Table; rows: Row[]; keys: string[] }[] = [];
    const deletes: { table: Table; ids: string[] }[] = [];
    for (const t of TABLES) {
      const rows: Row[] = [];
      const keys: string[] = [];
      for (const [id, r] of cur[t]) {
        const k = hrow(r.row);
        if (this.snap[t].get(id) !== k) { rows.push(r.row); keys.push(k); }
      }
      if (rows.length) upserts.push({ table: t, rows, keys });
      if (t !== "settings") {
        const ids = [...this.snap[t].keys()].filter((id) => !cur[t].has(id));
        if (ids.length) deletes.push({ table: t, ids });
      }
    }
    return { upserts, deletes, count: upserts.reduce((n, u) => n + u.rows.length, 0) + deletes.reduce((n, d) => n + d.ids.length, 0) };
  }

  /** Gọi mỗi khi dữ liệu trên máy thay đổi */
  notify() {
    if (!this.started || this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  async flush(): Promise<void> {
    if (!this.started || this.stopped) return;
    if (this.running) { this.dirty = true; return; }
    this.running = true;
    try {
      do {
        this.dirty = false;
        const d = this.diff();
        this.emit({ pending: d.count });
        if (d.count === 0) break;
        this.emit({ status: "syncing", message: `Đang đồng bộ ${d.count} thay đổi…` });
        for (const u of d.upserts) {
          for (let i = 0; i < u.rows.length; i += CHUNK) {
            const rows: Row[] = u.rows.slice(i, i + CHUNK).map((r) => ({ ...r, user_id: this.uid, updated_at: new Date().toISOString() }));
            const { error } = await this.db.from(u.table).upsert(rows, { onConflict: "user_id,id" });
            if (error) throw error;
            rows.forEach((r, j) => this.snap[u.table].set(String(r.id), u.keys[i + j]));
          }
        }
        for (const x of d.deletes) {
          for (let i = 0; i < x.ids.length; i += CHUNK) {
            const ids = x.ids.slice(i, i + CHUNK);
            const { error } = await this.db.from(x.table).delete().eq("user_id", this.uid).in("id", ids);
            if (error) throw error;
            ids.forEach((id) => this.snap[x.table].delete(id));
          }
        }
      } while (this.dirty);
      this.retryMs = 3000;
      this.persist();
      this.emit({ status: "synced", pending: this.diff().count, lastSync: Date.now(), message: "" });
    } catch (e) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Lỗi không xác định";
      this.emit({ status: offline ? "offline" : "error", pending: this.diff().count, message: offline ? "Mất kết nối. Dữ liệu sẽ tự đồng bộ khi có mạng." : msg });
      this.scheduleRetry();
    } finally {
      this.running = false;
    }
  }

  private scheduleRetry() {
    if (this.stopped) return;
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.flush(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, 60000);
  }

  // ---------- nhận thay đổi từ thiết bị khác ----------
  private subscribe() {
    if (this.channel) void this.db.removeChannel(this.channel);
    let ch = this.db.channel(`sync-${this.uid}`);
    for (const table of TABLES) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${this.uid}` }, (p) => this.onRemote(table, p as unknown as { eventType: string; new: Row; old: Row }));
      // Sự kiện xóa không lọc được theo cột, nên nghe riêng và tự kiểm tra user_id
      ch = ch.on("postgres_changes", { event: "DELETE", schema: "public", table }, (p) => this.onRemote(table, p as unknown as { eventType: string; new: Row; old: Row }));
    }
    this.channel = ch.subscribe((status) => this.emit({ realtime: status === "SUBSCRIBED" }));
  }

  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private schedulePersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), 800);
  }

  onRemote(table: Table, p: { eventType: string; new: Row; old: Row }) {
    if (this.stopped) return;
    if (p.eventType === "DELETE") {
      const old = p.old ?? {};
      if (old.user_id && old.user_id !== this.uid) return;
      const id = String(old.id ?? "");
      if (!id || table === "settings") return;
      if (!this.snap[table].has(id)) return;
      this.snap[table].delete(id);
      this.schedulePersist();
      this.h.applyRemote({ table, kind: "delete", id });
      return;
    }
    const row = p.new;
    if (!row || (row.user_id && row.user_id !== this.uid)) return;
    if (table === "settings") {
      const budgets = fromRow.budgets(row);
      const k = hrow(toRow.settings(budgets));
      if (this.snap.settings.get("budgets") === k) return;
      this.snap.settings.set("budgets", k);
      this.schedulePersist();
      this.h.applyRemote({ table, kind: "upsert", budgets });
      return;
    }
    const record = fromRow[table](row);
    const k = hrow(toRow[table](record as never));
    if (this.snap[table].get(record.id) === k) return; // chính là thay đổi vừa gửi đi
    this.snap[table].set(record.id, k);
    this.schedulePersist();
    this.h.applyRemote({ table, kind: "upsert", record });
  }

  // ---------- kiểm tra ----------
  async verify(): Promise<VerifyRow[]> {
    const remote = await this.fetchRemote();
    const a = realRecords(this.h.getStore());
    const b = realRecords(remote);
    const labels: Record<Table, string> = { transactions: "Giao dịch", accounts: "Tài khoản", goals: "Mục tiêu", categories: "Danh mục", settings: "Ngân sách" };
    return TABLES.map((t) => {
      let onlyLocal = 0, onlyRemote = 0, different = 0;
      for (const [id, r] of a[t]) {
        const o = b[t].get(id);
        if (!o) onlyLocal++;
        else if (canon(o.row) !== canon(r.row)) different++;
      }
      for (const id of b[t].keys()) if (!a[t].has(id)) onlyRemote++;
      return { table: t, label: labels[t], local: a[t].size, remote: b[t].size, onlyLocal, onlyRemote, different };
    });
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.retry) clearTimeout(this.retry);
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persist();
    if (this.channel) void this.db.removeChannel(this.channel);
    this.channel = null;
  }
}
