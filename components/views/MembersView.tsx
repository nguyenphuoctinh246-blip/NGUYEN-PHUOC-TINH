"use client";

import { useState } from "react";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Field, Pill } from "../ui";
import SchemaHelp from "./SchemaHelp";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "–");

function NewInvite({ onSchemaError }: { onSchemaError: () => void }) {
  const { cloud } = useApp();
  const [name, setName] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<{ code: string; expiresAt: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMade(null);
    if (!name.trim()) return setErr("Nhập tên để nhận biết người này (ví dụ: Bé An, Vợ, Kế toán).");
    setBusy(true);
    try { const r = await cloud.makeInvite(name.trim(), viewAll); setMade({ ...r, name: name.trim() }); setName(""); }
    catch (e2) { const m = e2 instanceof Error ? e2.message : "Có lỗi xảy ra."; if (/schema\.sql/.test(m)) onSchemaError(); else setErr(m); }
    finally { setBusy(false); }
  }
  async function copy(t: string) {
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* tự chép */ }
  }
  const link = typeof window === "undefined" ? "" : window.location.href.split("#")[0];

  return (
    <Card title="Mời tài khoản con" icon="plus" color={3}>
      <p className="mt-0 mb-3.5 text-[13px] leading-relaxed text-muted">Tạo mã mời rồi gửi cho người nhà. Họ mở ứng dụng, chọn tab <b>Có mã mời</b>, tự đặt tên đăng nhập và mật khẩu (không cần Gmail). Mọi số liệu họ nhập được máy chủ ghi nhận kèm tên người nhập.</p>
      <form onSubmit={create} className="flex flex-col gap-3">
        <Field label="Tên hiển thị của người này" htmlFor="inv-name"><input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ví dụ: Bé An" className="input-field" /></Field>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed"><input type="checkbox" checked={viewAll} onChange={(e) => setViewAll(e.target.checked)} className="mt-1" /><span><b>Cho xem toàn bộ dữ liệu</b> (không tick: người này chỉ thấy các khoản chính mình nhập). Tài khoản con không bao giờ sửa được danh mục, ngân sách, tài khoản hay giao dịch của người khác.</span></label>
        {err && <p role="alert" className="m-0 rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">{err}</p>}
        <div><Button variant="primary" type="submit" disabled={busy}><Icon name="plus" className="size-4" />Tạo mã mời</Button></div>
      </form>
      {made && (
        <div className="mt-4 rounded-xl border border-income/40 bg-income-soft px-4 py-4 text-center" role="status">
          <div className="text-xs font-semibold text-income">Mã mời cho {made.name} (dùng được 1 lần, hết hạn {fmtDate(made.expiresAt)})</div>
          <div aria-label={`Mã mời ${made.code}`} className="mt-1 font-mono text-4xl font-bold tracking-[0.15em] text-fg">{made.code}</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button onClick={() => void copy(`Mã mời: ${made.code}\nMở ${link} → mục Đồng bộ → tab "Có mã mời", nhập mã và tự đặt tên đăng nhập, mật khẩu.`)}><Icon name="copy" className="size-4" />{copied ? "Đã chép" : "Chép hướng dẫn gửi cho họ"}</Button>
          </div>
          <p className="mt-2 mb-0 text-xs text-muted">Mã chỉ hiện một lần. Nếu lỡ mất, thu hồi mã này và tạo mã mới.</p>
        </div>
      )}
    </Card>
  );
}

export default function MembersView() {
  const { cloud, s } = useApp();
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [rename, setRename] = useState<{ id: string; value: string } | null>(null);
  const [code, setCode] = useState("");
  const [needSchema, setNeedSchema] = useState(false);
  const outdated = needSchema || !!cloud.workspace?.legacy;
  /** Hiện ngay trạng thái tick trong lúc chờ máy chủ xác nhận */
  const [optim, setOptim] = useState<Record<string, boolean>>({});
  const members = cloud.people.filter((p) => p.role === "member");
  const countBy = (id: string) => s.tx.filter((t) => (t.createdBy ?? cloud.user?.id) === id).length;
  async function run(fn: () => Promise<unknown>): Promise<void> { setErr(""); try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Có lỗi xảy ra."); } }

  if (!cloud.user) return <Card title="Thành viên" icon="user" color={3}><p className="m-0 text-[14px] text-fg-2">Cần đăng nhập đồng bộ (mục Đồng bộ) để mời tài khoản con.</p></Card>;
  if (cloud.workspace?.role === "member") return <Card title="Thành viên" icon="user" color={3}><p className="m-0 text-[14px] text-fg-2">Bạn đang là tài khoản con. Chỉ chủ tài khoản quản lý được thành viên.</p></Card>;

  return (
    <div className="flex flex-col gap-4">
      {err && <p role="alert" className="m-0 rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">{err}</p>}
      {outdated && <SchemaHelp onChecked={() => setNeedSchema(false)} />}
      <Card title="Tài khoản con đang tham gia" icon="user" color={3}>
        {members.length === 0 ? <p className="m-0 text-[13px] text-muted">Chưa có tài khoản con nào. Tạo mã mời ở khung bên dưới.</p> : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {members.map((m) => (
              <li key={m.id} className="rounded-xl border border-line-light bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    {rename?.id === m.id ? (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => { await cloud.editMember(m.id, null, rename.value); setRename(null); }); }}>
                        <input aria-label="Tên hiển thị mới" value={rename.value} onChange={(e) => setRename({ id: m.id, value: e.target.value })} maxLength={40} className="input-field !w-44 !py-1.5 text-[13px]" />
                        <Button variant="primary" type="submit" className="!py-1.5 text-xs">Lưu</Button><Button onClick={() => setRename(null)} className="!py-1.5 text-xs">Hủy</Button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-[15px] font-bold"><span className="truncate">{m.name}</span>
                        <button type="button" aria-label={`Đổi tên ${m.name}`} onClick={() => setRename({ id: m.id, value: m.name })} className="flex size-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted hover:bg-accent-soft hover:text-accent"><Icon name="edit" className="size-3.5" /></button></div>
                    )}
                    <div className="text-xs text-muted">Tham gia {fmtDate(m.joined)} · đã nhập {countBy(m.id)} giao dịch</div>
                  </div>
                  {confirm === m.id
                    ? <span className="flex gap-2"><Button variant="danger" className="!py-1.5 text-xs" onClick={() => void run(async () => { await cloud.dropMember(m.id); setConfirm(null); })}>Xác nhận gỡ</Button><Button className="!py-1.5 text-xs" onClick={() => setConfirm(null)}>Hủy</Button></span>
                    : <Button variant="ghost" className="!py-1.5 text-xs !text-expense" onClick={() => setConfirm(m.id)}>Gỡ khỏi nhóm</Button>}
                </div>
                <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={optim[m.id] ?? !!m.canViewAll} onChange={(e) => { const v = e.target.checked; setOptim((o) => ({ ...o, [m.id]: v })); void run(() => cloud.editMember(m.id, v, null)).finally(() => setOptim((o) => { const n = { ...o }; delete n[m.id]; return n; })); }} />Cho xem toàn bộ dữ liệu {(optim[m.id] ?? m.canViewAll) ? <Pill tone="warn">Xem tất cả</Pill> : <Pill tone="muted">Chỉ phần mình nhập</Pill>}</label>
              </li>
            ))}
          </ul>
        )}
        {confirm && <p className="mt-3 mb-0 text-xs text-muted">Gỡ thành viên: họ mất quyền ngay, các khoản đã nhập vẫn thuộc về bạn.</p>}
      </Card>

      {cloud.invites.length > 0 && (
        <Card title="Mã mời đang chờ" icon="tag" color={4}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cloud.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-alt px-3 py-2.5 text-[13px]">
                <span><b>{i.name}</b> · {i.canViewAll ? "xem tất cả" : "chỉ phần mình nhập"} · hết hạn {fmtDate(i.expiresAt)}</span>
                <Button variant="ghost" className="!py-1 text-xs !text-expense" onClick={() => void run(() => cloud.dropInvite(i.id))}>Thu hồi</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <NewInvite onSchemaError={() => setNeedSchema(true)} />

      <Card title="Bạn là tài khoản con?" icon="user" color={7}>
        <p className="mt-0 mb-3 text-[13px] leading-relaxed text-muted">Nếu tài khoản này mới tạo, chưa có giao dịch hay mục tiêu nào và bạn nhận được mã mời từ người khác, nhập mã tại đây để chuyển sang làm tài khoản con của họ.</p>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) void run(() => cloud.joinWithCode(code)); }}>
          <input aria-label="Mã mời nhận được" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD-EFGH" maxLength={9} className="input-field !w-44 text-center font-mono tracking-[0.2em]" />
          <Button type="submit" disabled={!code.trim()}>Tham gia</Button>
        </form>
      </Card>
    </div>
  );
}
