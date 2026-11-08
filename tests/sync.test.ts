import { SyncEngine, emptyStore, type Handlers, type Snapshot, type SyncInfo } from "../lib/cloud/engine";
import { applyChange } from "../lib/cloud/apply";
import type { Store, Transaction } from "../lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------- Supabase giả lập trong bộ nhớ (một CSDL dùng chung cho nhiều "thiết bị") ----------
type Row = Record<string, unknown>;
class FakeServer {
  tables: Record<string, Map<string, Row>> = {};
  clients: FakeClient[] = [];
  upsertCalls = 0;
  log: string[] = [];
  failNextUpsert = 0;
  table(t: string) { return (this.tables[t] ??= new Map()); }
  key(r: Row) { return `${r.user_id}|${r.id}`; }
  broadcast(table: string, eventType: string, n: Row | null, o: Row | null) {
    for (const c of this.clients) c.deliver(table, eventType, n, o);
  }
}
class FakeClient {
  handlers: { table: string; event: string; filter?: string; cb: (p: unknown) => void }[] = [];
  constructor(private srv: FakeServer) { srv.clients.push(this); }
  deliver(table: string, eventType: string, n: Row | null, o: Row | null) {
    for (const h of this.handlers) {
      if (h.table !== table) continue;
      if (h.event !== "*" && h.event !== eventType) continue;
      if (h.filter && eventType !== "DELETE") {
        const [col, val] = h.filter.split("=eq.");
        if (n?.[col] !== val) continue;
      }
      queueMicrotask(() => h.cb({ eventType, new: n ?? {}, old: o ? { user_id: o.user_id, id: o.id } : {} }));
    }
  }
  channel() {
    const self = this;
    const ch = { on(_t: string, o: { event: string; table: string; filter?: string }, cb: (p: unknown) => void) { self.handlers.push({ table: o.table, event: o.event, filter: o.filter, cb }); return ch; }, subscribe(cb?: (s: string) => void) { if (cb) queueMicrotask(() => cb('SUBSCRIBED')); return ch; } };
    return ch;
  }
  removeChannel() { this.handlers = []; return Promise.resolve("ok"); }
  from(table: string) {
    const srv = this.srv;
    const q = { filters: [] as ((r: Row) => boolean)[], range: null as [number, number] | null, op: "select", rows: [] as Row[], head: false, count: false, order: null as [string, boolean] | null, limit: null as number | null };
    const run = async (): Promise<{ data: Row[] | null; error: { message: string } | null; count?: number }> => {
      const t = srv.table(table);
      if (q.op === "upsert") {
        srv.upsertCalls++;
        if (srv.failNextUpsert > 0) { srv.failNextUpsert--; return { data: null, error: { message: "network down" } }; }
        for (const r of q.rows) {
          const k = srv.key(r); const had = t.has(k); t.set(k, { ...r });
          srv.broadcast(table, had ? "UPDATE" : "INSERT", r, null);
        }
        return { data: null, error: null };
      }
      if (q.op === "delete") {
        for (const [k, r] of [...t]) if (q.filters.every((f) => f(r))) { t.delete(k); srv.broadcast(table, "DELETE", null, r); }
        return { data: null, error: null };
      }
      srv.log.push(q.limit !== null || q.head ? 'light:' + table : 'full:' + table);
      let data = [...t.values()].filter((r) => q.filters.every((f) => f(r)));
      const count = data.length;
      if (q.order) { const [col, asc] = q.order; data.sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (asc ? 1 : -1)); }
      if (q.range) data = data.slice(q.range[0], q.range[1] + 1);
      if (q.limit !== null) data = data.slice(0, q.limit);
      return { data: q.head ? null : data, error: null, count: q.count ? count : undefined };
    };
    const b: Record<string, unknown> = {
      select: (_c?: string, o?: { count?: string; head?: boolean }) => { q.op = "select"; q.head = !!o?.head; q.count = !!o?.count; return b; },
      upsert: (rows: Row[]) => { q.op = "upsert"; q.rows = rows; return b; },
      delete: () => { q.op = "delete"; return b; },
      eq: (c: string, v: unknown) => { q.filters.push((r) => r[c] === v); return b; },
      in: (c: string, v: unknown[]) => { q.filters.push((r) => v.includes(r[c])); return b; },
      range: (a: number, z: number) => { q.range = [a, z]; return b; },
      order: (c: string, o?: { ascending?: boolean }) => { q.order = [c, o?.ascending !== false]; return b; },
      limit: (n: number) => { q.limit = n; return b; },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run().then(res, rej),
    };
    return b;
  }
}

// ---------- tiện ích kiểm thử ----------
let failures = 0;
const ok = (cond: boolean, msg: string) => { if (cond) console.log("  ✓", msg); else { failures++; console.log("  ✗ FAIL:", msg); } };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Device {
  store: Store; info: SyncInfo = { status: "idle", pending: 0, lastSync: null, message: "", realtime: false };
  engine: SyncEngine; client: FakeClient;
  saved: Snapshot | null = null;
  constructor(public name: string, srv: FakeServer, uid: string, initial: Store) {
    this.store = initial; this.client = new FakeClient(srv);
    const h: Handlers = {
      getStore: () => this.store,
      replaceStore: (s) => { this.store = s; },
      applyRemote: (c) => { this.store = applyChange(this.store, c); },
      onInfo: (i) => { this.info = i; },
    };
    this.engine = new SyncEngine(this.client as unknown as SupabaseClient, uid, h, 20, { load: () => this.saved, save: (x) => { this.saved = x; } });
    this.uid = uid; this.srv = srv;
  }
  uid: string; srv: FakeServer;
  /** Mở lại ứng dụng: engine mới, dữ liệu và ảnh chụp cũ còn trên máy */
  restart() { const d = new Device(this.name, this.srv, this.uid, this.store); d.saved = this.saved; return d; }
  set(fn: (s: Store) => Store) { this.store = fn(this.store); this.engine.notify(); }
}
const tx = (id: string, amount: number, extra: Partial<Transaction> = {}): Transaction => ({ id, type: "expense", amount, category: "an_uong", date: "2026-11-08", note: "", account: "tien_mat", payee: "", tags: [], ...extra });

(async () => {
  const srv = new FakeServer();
  const UID = "user-1";

  console.log("1. Thiết bị A (có dữ liệu trên máy) gộp lên tài khoản trống");
  const A = new Device("A", srv, UID, { ...emptyStore(), tx: [tx("a1", 100000, { payee: "Cafe", tags: ["x"] }), tx("a2", 200000), { ...tx("s1", 999), isSample: true }], budgets: { an_uong: 5000000 } });
  await A.engine.start("merge");
  ok(srv.table("transactions").size === 2, "lên server 2 giao dịch thật, bỏ dữ liệu mẫu");
  ok(srv.table("categories").size > 0 && srv.table("accounts").size === 3, "danh mục và tài khoản mặc định được lưu");
  ok(srv.table("settings").size === 1, "ngân sách được lưu");
  ok(A.info.status === "synced" && A.info.pending === 0, "trạng thái: đã đồng bộ");

  console.log("2. Thiết bị B đăng nhập, dùng dữ liệu của tài khoản");
  const B = new Device("B", srv, UID, emptyStore());
  await B.engine.start("account");
  ok(B.store.tx.length === 2 && B.store.tx.find((t) => t.id === "a1")?.payee === "Cafe", "B nhận đủ 2 giao dịch, đúng trường nơi chi");
  ok(B.store.budgets.an_uong === 5000000, "B nhận ngân sách");

  console.log("3. A thêm giao dịch, B nhận tức thời");
  A.set((s) => ({ ...s, tx: [...s.tx, tx("a3", 300000, { note: "mới" })] }));
  await wait(120);
  ok(B.store.tx.some((t) => t.id === "a3" && t.note === "mới"), "B thấy giao dịch mới của A");

  console.log("4. B sửa và xóa, A nhận");
  B.set((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== "a2").map((t) => (t.id === "a1" ? { ...t, amount: 150000 } : t)) }));
  await wait(120);
  ok(A.store.tx.find((t) => t.id === "a1")?.amount === 150000, "A thấy giao dịch đã sửa");
  ok(!A.store.tx.some((t) => t.id === "a2"), "A thấy giao dịch đã xóa");

  console.log("5. Ngân sách và danh mục");
  B.set((s) => ({ ...s, budgets: { ...s.budgets, di_lai: 2000000 }, categories: [...s.categories, { id: "cat_x", label: "Thú cưng", icon: "🐶", type: "expense", color: 10 }] }));
  await wait(120);
  ok(A.store.budgets.di_lai === 2000000, "A nhận ngân sách mới");
  ok(A.store.categories.some((c) => c.id === "cat_x"), "A nhận danh mục mới");

  console.log("6. Không lặp vô hạn (echo)");
  const before = srv.upsertCalls;
  await wait(200);
  ok(srv.upsertCalls === before, "không có lần ghi thừa sau khi đã yên");

  console.log("7. Mất mạng rồi tự thử lại");
  srv.failNextUpsert = 1;
  A.set((s) => ({ ...s, tx: [...s.tx, tx("a4", 40000)] }));
  await wait(80);
  ok(A.info.status === "error" && A.info.pending > 0, "báo lỗi và còn thay đổi chờ gửi");
  await A.engine.flush();
  await wait(100);
  ok(A.info.status === "synced" && B.store.tx.some((t) => t.id === "a4"), "gửi lại thành công, B nhận được");

  console.log("8. Kiểm tra dữ liệu khớp");
  const v = await A.engine.verify();
  ok(v.every((r) => r.onlyLocal === 0 && r.onlyRemote === 0 && r.different === 0), "mọi bảng khớp giữa máy và tài khoản");
  A.store = { ...A.store, tx: A.store.tx.filter((t) => t.id !== "a4") }; // lệch có chủ đích (chưa notify)
  const v2 = await A.engine.verify();
  ok(v2.find((r) => r.table === "transactions")!.onlyRemote === 1, "phát hiện lệch dữ liệu");

  console.log("9. Phân trang và dữ liệu lớn");
  const big = Array.from({ length: 2300 }, (_, i) => tx("b" + i, 1000 + i));
  const C = new Device("C", srv, "user-2", { ...emptyStore(), tx: big });
  await C.engine.start("merge");
  ok([...srv.table("transactions").values()].filter((r) => r.user_id === "user-2").length === 2300, "tải lên đủ 2300 giao dịch");
  const D = new Device("D", srv, "user-2", emptyStore());
  await D.engine.start("account");
  ok(D.store.tx.length === 2300, "thiết bị khác tải về đủ 2300 giao dịch (qua nhiều trang)");
  ok(!D.store.tx.some((t) => srv.table("transactions").get(`user-1|${t.id}`)), "không lẫn dữ liệu giữa hai tài khoản");

  console.log("10. Sửa lúc offline, đóng trang, mở lại: không mất dữ liệu (gộp ba chiều)");
  // A đang đồng bộ tốt. Chuẩn bị 3 giao dịch chung.
  A.store = (await (async () => { await A.engine.start("account"); return A.store; })());
  A.set((s) => ({ ...s, tx: [...s.tx, tx("k1", 1000), tx("k2", 2000), tx("k3", 3000)] })); await wait(120);
  await A.engine.flush();
  A.engine.stop();
  const savedStore = A.store, savedSnap = A.saved;
  // A mất mạng: sửa k1, xóa k2, thêm k4 nhưng không kịp gửi, rồi đóng trang
  const offline = { ...savedStore, tx: savedStore.tx.filter((t) => t.id !== "k2").map((t) => (t.id === "k1" ? { ...t, amount: 1111 } : t)).concat(tx("k4", 4000)) };
  // Trong lúc đó B sửa k3, xóa a1, thêm k5
  B.set((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== "a1").map((t) => (t.id === "k3" ? { ...t, amount: 3333 } : t)).concat(tx("k5", 5000)) }));
  await wait(120);
  // A mở lại bằng dữ liệu cũ trên máy + ảnh chụp cũ
  const A2 = new Device("A2", srv, UID, offline); A2.saved = savedSnap;
  await A2.engine.start("resume"); await wait(120);
  const ids = (d: Device) => d.store.tx.map((t) => t.id).sort().join(",");
  ok(A2.store.tx.find((t) => t.id === "k1")?.amount === 1111, "thay đổi chưa gửi (sửa k1) được giữ và đẩy lên");
  ok(!A2.store.tx.some((t) => t.id === "k2") && !srv.table("transactions").has(`${UID}|k2`), "xóa k2 lúc offline được áp dụng lên tài khoản");
  ok(A2.store.tx.some((t) => t.id === "k4") && srv.table("transactions").has(`${UID}|k4`), "giao dịch mới k4 lúc offline được đẩy lên");
  ok(A2.store.tx.find((t) => t.id === "k3")?.amount === 3333, "nhận thay đổi của thiết bị khác (k3) trong lúc vắng mặt");
  ok(!A2.store.tx.some((t) => t.id === "a1") && A2.store.tx.some((t) => t.id === "k5"), "nhận xóa a1 và giao dịch mới k5 từ thiết bị khác");
  ok(ids(A2) === ids(B), "hai thiết bị cuối cùng giống hệt nhau");
  const v3 = await A2.engine.verify();
  ok(v3.every((r) => r.onlyLocal === 0 && r.onlyRemote === 0 && r.different === 0), "kiểm tra dữ liệu: khớp hoàn toàn");
  A2.engine.stop();

  console.log("11. Không có Realtime: kéo định kỳ (pull) vẫn đưa dữ liệu qua lại giữa hai máy");
  const P = new Device("P", srv, "user-3", { ...emptyStore(), tx: [tx("p1", 1000)] });
  await P.engine.start("merge");
  const Q = new Device("Q", srv, "user-3", emptyStore());
  await Q.engine.start("account");
  P.client.handlers = []; Q.client.handlers = []; // tắt Realtime ở cả hai máy
  Q.set((s) => ({ ...s, tx: [...s.tx, tx("q1", 2000, { payee: "từ điện thoại" })] }));
  await wait(120);
  ok(!P.store.tx.some((t) => t.id === "q1"), "(không có Realtime) P chưa thấy giao dịch của Q");
  await P.engine.pull();
  ok(P.store.tx.some((t) => t.id === "q1" && t.payee === "từ điện thoại"), "pull: P nhận giao dịch nhập trên Q");
  P.set((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== "p1") })); // P xóa p1 (chưa gửi)
  Q.set((s) => ({ ...s, tx: [...s.tx, tx("q2", 3000)] }));        // Q thêm q2
  await wait(120);
  await P.engine.pull(); await Q.engine.pull(); await wait(60);
  ok(P.store.tx.some((t) => t.id === "q2") && !P.store.tx.some((t) => t.id === "p1"), "pull: P nhận q2 và giữ việc xóa p1");
  ok(!Q.store.tx.some((t) => t.id === "p1") && Q.store.tx.some((t) => t.id === "q2"), "pull: Q nhận việc xóa p1");
  const vq = await Q.engine.verify();
  ok(vq.every((r) => r.onlyLocal === 0 && r.onlyRemote === 0 && r.different === 0), "sau pull hai bên khớp hoàn toàn");
  const calls0 = srv.upsertCalls; await P.engine.pull(); await Q.engine.pull(); await wait(40);
  ok(srv.upsertCalls === calls0, "pull khi không có thay đổi không ghi thừa lên máy chủ");
  // pull thông minh: không có thay đổi thì không tải lại toàn bộ dữ liệu
  const getsBefore = srv.log.length;
  await P.engine.pull(); await P.engine.pull(); await wait(30);
  const bigReads = srv.log.slice(getsBefore).filter((l) => l.startsWith("full:")).length;
  ok(bigReads === 0, "pull khi không có thay đổi chỉ dùng truy vấn nhẹ, không tải lại toàn bộ");
  Q.set((s) => ({ ...s, tx: s.tx.map((t) => (t.id === "q1" ? { ...t, amount: 2222 } : t)) })); // chỉ SỬA (số dòng không đổi)
  await wait(120);
  await P.engine.pull();
  ok(P.store.tx.find((t) => t.id === "q1")?.amount === 2222, "pull phát hiện cả thay đổi chỉ-sửa (số dòng không đổi)");
  P.engine.stop(); Q.engine.stop();

  A.engine.stop(); B.engine.stop(); C.engine.stop(); D.engine.stop();
  console.log(failures ? `\n${failures} kiểm thử THẤT BẠI` : "\nTất cả kiểm thử đạt");
  process.exit(failures ? 1 : 0);
})();
