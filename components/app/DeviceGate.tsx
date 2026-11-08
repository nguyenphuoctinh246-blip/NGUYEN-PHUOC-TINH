"use client";

import { useState } from "react";
import { Button, Field } from "../ui";
import Icon from "../Icon";
import { deviceName } from "@/lib/cloud/device";
import { useApp } from "./AppContext";

/** Màn hình chặn: thiết bị mới đăng nhập phải được xác nhận bằng mã trước khi vào dữ liệu */
export default function DeviceGate() {
  const { cloud } = useApp();
  const { device } = cloud;
  const [recovery, setRecovery] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const code = device.code ? `${device.code.slice(0, 3)} ${device.code.slice(3)}` : "···  ···";

  async function useCode(e: React.FormEvent) {
    e.preventDefault();
    if (!recovery.trim()) return;
    setBusy(true); setMsg("");
    try {
      const r = await cloud.submitRecovery(recovery);
      if (!r.ok) setMsg(r.status === "denied" ? "Nhập sai quá 5 lần. Hãy thử lại sau 10 phút." : `Mã khôi phục không đúng. Còn ${r.attemptsLeft ?? 0} lần thử.`);
    } catch (err) { setMsg(err instanceof Error ? err.message : "Có lỗi xảy ra."); }
    finally { setBusy(false); }
  }

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center">{children}</div>
  );

  if (device.status === "checking") return shell(<><div className="size-10 animate-spin rounded-full border-[3px] border-line border-t-accent" /><p className="mt-4 text-sm text-muted">Đang kiểm tra thiết bị…</p></>);

  if (device.status === "error") return shell(
    <>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-expense-soft text-expense"><Icon name="alert" className="size-7" /></span>
      <h2 className="mt-4 mb-1 text-xl font-extrabold">Không kiểm tra được thiết bị</h2>
      <p className="m-0 text-[14px] text-fg-2">{device.message}</p>
      <div className="mt-5 flex gap-2"><Button variant="primary" onClick={() => window.location.reload()}>Thử lại</Button><Button onClick={() => void cloud.signOut()}>Đăng xuất</Button></div>
    </>,
  );

  if (device.status === "denied") return shell(
    <>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-expense-soft text-expense"><Icon name="alert" className="size-7" /></span>
      <h2 className="mt-4 mb-1 text-xl font-extrabold">Yêu cầu của thiết bị này bị từ chối</h2>
      <p className="m-0 text-[14px] leading-relaxed text-fg-2">Mã đã bị nhập sai quá 5 lần hoặc chủ tài khoản đã từ chối. Nếu đây là thiết bị của bạn, hãy đợi 10 phút rồi đăng nhập lại để nhận mã mới.</p>
      <div className="mt-5"><Button onClick={() => void cloud.signOut()}>Đăng xuất</Button></div>
    </>,
  );

  return shell(
    <>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warn-soft text-warn"><Icon name="shield" className="size-7" /></span>
      <h2 className="mt-4 mb-1 text-xl font-extrabold tracking-[-0.02em]">Thiết bị này cần được xác nhận</h2>
      <p className="m-0 text-[14px] leading-relaxed text-fg-2">Vì an toàn, thiết bị mới phải được bạn cho phép trước khi xem và nhập dữ liệu. Tài khoản: <b>{cloud.user?.email}</b></p>
      <div className="mt-5 w-full rounded-2xl border border-line-light bg-surface px-4 py-5 shadow-card">
        <div className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Mã xác nhận của thiết bị này</div>
        <div aria-label={`Mã xác nhận ${device.code ?? ""}`} className="mt-1.5 font-mono text-5xl font-bold tracking-[0.12em] text-accent tabular-nums">{code}</div>
      </div>
      <ol className="mt-5 flex w-full flex-col gap-2 pl-5 text-left text-[13px] leading-relaxed text-fg-2">
        <li>Mở ứng dụng trên một thiết bị <b>đã đăng nhập và được duyệt</b> (điện thoại hoặc máy tính cũ của bạn).</li>
        <li>Vào mục <b>Đồng bộ</b> → <b>Thiết bị đã đăng nhập</b>.</li>
        <li>Tìm yêu cầu <b>{deviceName()}</b> đang chờ, nhập mã 6 số ở trên rồi bấm <b>Duyệt</b>.</li>
      </ol>
      <p className="mt-3 mb-0 flex items-center gap-2 text-xs text-muted"><span className="size-2 animate-pulse rounded-full bg-warn" />Đang chờ xác nhận. Trang sẽ tự mở khi bạn được duyệt.</p>

      <div className="mt-5 w-full border-t border-line-light pt-4 text-left">
        {showRecovery ? (
          <form onSubmit={useCode} className="flex flex-col gap-2.5">
            <Field label="Mã khôi phục (dạng xxxx-xxxx)" htmlFor="recovery-code" hint="Dùng khi bạn không còn thiết bị nào đã đăng nhập. Mỗi mã chỉ dùng một lần.">
              <input id="recovery-code" value={recovery} onChange={(e) => setRecovery(e.target.value)} autoComplete="off" placeholder="a1b2-c3d4" className="input-field font-mono" />
            </Field>
            {msg && <p role="alert" className="m-0 text-[13px] font-medium text-expense">{msg}</p>}
            <div className="flex gap-2"><Button variant="primary" type="submit" disabled={busy}>Xác nhận bằng mã khôi phục</Button><Button onClick={() => setShowRecovery(false)}>Hủy</Button></div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setShowRecovery(true)}>Không còn thiết bị cũ? Dùng mã khôi phục</Button>
            <Button onClick={() => void cloud.signOut()}>Đăng xuất</Button>
          </div>
        )}
      </div>
    </>,
  );
}
