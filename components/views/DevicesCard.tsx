"use client";

import { useState } from "react";
import type { DeviceInfo } from "@/lib/cloud/device";
import { useApp } from "../app/AppContext";
import { Button, Card, Pill } from "../ui";

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} giờ trước` : `${Math.round(h / 24)} ngày trước`;
};

function PendingRow({ d, onApproved }: { d: DeviceInfo; onApproved: (name: string) => void }) {
  const { cloud } = useApp();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve(e: React.FormEvent) {
    e.preventDefault();
    if (code.replace(/\D/g, "").length !== 6) return setMsg({ kind: "err", text: "Nhập đủ 6 số hiển thị trên thiết bị đó." });
    setBusy(true); setMsg(null);
    try {
      const r = await cloud.approve(d.id, code);
      if (r.ok) onApproved(d.name || "Thiết bị lạ");
      else setMsg({ kind: "err", text: r.status === "denied" ? "Nhập sai quá 5 lần: yêu cầu đã bị từ chối." : `Mã không đúng. Còn ${r.attemptsLeft ?? 0} lần thử.` });
    } catch (err) { setMsg({ kind: "err", text: err instanceof Error ? err.message : "Có lỗi xảy ra." }); }
    finally { setBusy(false); setCode(""); }
  }

  return (
    <li className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0"><div className="truncate text-[14px] font-semibold">🔐 {d.name || "Thiết bị lạ"}</div><div className="text-xs text-muted">Xin vào {ago(d.created_at)}. Chỉ duyệt nếu đây là thiết bị của bạn.</div></div>
        <Pill tone="warn">Chờ duyệt</Pill>
      </div>
      <form onSubmit={approve} className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={`code-${d.id}`} className="sr-only">Mã 6 số hiển thị trên {d.name}</label>
        <input id={`code-${d.id}`} inputMode="numeric" autoComplete="off" maxLength={7} placeholder="Nhập 6 số" value={code}
          onChange={(e) => { setCode(e.target.value.replace(/[^\d ]/g, "")); setMsg(null); }} className="input-field !w-[210px] !py-2 text-center font-mono text-base tracking-[0.2em]" />
        <Button variant="primary" type="submit" disabled={busy}>Duyệt</Button>
        <Button onClick={() => void cloud.deny(d.id)} disabled={busy}>Từ chối</Button>
      </form>
      {msg && <p role={msg.kind === "err" ? "alert" : "status"} className={`mt-2 mb-0 text-[13px] font-medium ${msg.kind === "err" ? "text-expense" : "text-income"}`}>{msg.text}</p>}
    </li>
  );
}

export default function DevicesCard() {
  const { cloud } = useApp();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const approved = cloud.devices.filter((d) => d.status === "approved");
  const pending = cloud.devices.filter((d) => d.status === "pending");
  const denied = cloud.devices.filter((d) => d.status === "denied");

  async function run(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Có lỗi xảy ra."); }
  }

  if (cloud.device.legacy) {
    return (
      <Card title="Duyệt thiết bị" icon="shield" color={4}>
        <p className="m-0 rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] leading-relaxed text-warn">Chưa bật duyệt thiết bị. Hiện bất kỳ thiết bị nào đăng nhập đúng email và mật khẩu đều vào được dữ liệu. Để bật, mở Supabase → SQL Editor và chạy lại toàn bộ file <b>supabase/schema.sql</b> bản mới nhất, rồi tải lại trang.</p>
      </Card>
    );
  }

  return (
    <Card title="Thiết bị đã đăng nhập" icon="shield" color={4}
      action={<Button onClick={() => void run(cloud.newRecoveryCodes)} className="!py-1.5 text-xs">Tạo mã khôi phục mới</Button>}>
      <p className="mt-0 mb-3.5 text-[13px] leading-relaxed text-muted">Thiết bị mới đăng nhập sẽ hiện mã 6 số và phải được bạn nhập mã ở đây mới nhập hoặc xem được dữ liệu.</p>
      {notice && <p role="status" className="mb-3 rounded-lg bg-income-soft px-3 py-2 text-[13px] font-medium text-income">{notice}</p>}
      {err && <p role="alert" className="mb-3 rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">{err}</p>}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {pending.map((d) => (<PendingRow key={d.id} d={d} onApproved={(n) => { setNotice(`Đã cho phép thiết bị "${n}" truy cập dữ liệu.`); setTimeout(() => setNotice(""), 6000); }} />))}
        {approved.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-light bg-surface px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold"><span className="truncate">{d.name || "Thiết bị"}</span>{d.current && <Pill tone="income">Thiết bị này</Pill>}</div>
              <div className="text-xs text-muted">Hoạt động {ago(d.last_seen)}</div>
            </div>
            {!d.current && (confirm === d.id
              ? <span className="flex gap-2"><Button variant="danger" className="!py-1.5 text-xs" onClick={() => void run(async () => { await cloud.revoke(d.id); setConfirm(null); })}>Xác nhận thu hồi</Button><Button className="!py-1.5 text-xs" onClick={() => setConfirm(null)}>Hủy</Button></span>
              : <Button variant="ghost" className="!py-1.5 text-xs !text-expense" disabled={approved.length <= 1} onClick={() => setConfirm(d.id)}>Thu hồi</Button>)}
          </li>
        ))}
        {denied.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-light bg-surface-alt px-4 py-3">
            <div className="min-w-0"><div className="truncate text-[14px] font-semibold">{d.name || "Thiết bị"}</div><div className="text-xs text-muted">Đã bị từ chối</div></div>
            <Button variant="ghost" className="!py-1.5 text-xs" onClick={() => void run(() => cloud.revoke(d.id))}>Xóa khỏi danh sách</Button>
          </li>
        ))}
      </ul>
      {pending.length === 0 && <p className="mt-3 mb-0 text-xs text-muted">Không có thiết bị nào đang chờ duyệt.</p>}
    </Card>
  );
}
