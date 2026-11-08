"use client";

import { useState } from "react";
import { Button, Modal } from "../ui";
import Icon from "../Icon";
import { useApp } from "./AppContext";

/** Hiện mã khôi phục một lần duy nhất */
export default function RecoveryModal({ codes }: { codes: string[] }) {
  const { cloud } = useApp();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(codes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* tự chép tay */ }
  }
  return (
    <Modal title="Lưu mã khôi phục" onClose={() => { if (saved) cloud.dismissRecovery(); }} wide>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[14px] leading-relaxed text-fg-2">Nếu mất hết thiết bị đã đăng nhập, mã khôi phục là cách duy nhất để duyệt thiết bị mới. <b>Các mã này chỉ hiển thị một lần.</b> Hãy chép lại và cất ở nơi an toàn (không lưu trong chính ứng dụng này).</p>
        <ul className="m-0 grid grid-cols-2 gap-2 p-0">
          {codes.map((c) => (<li key={c} className="list-none rounded-lg border border-line-light bg-surface-alt px-3 py-2 text-center font-mono text-[15px] font-semibold tracking-wider">{c}</li>))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => void copy()}><Icon name="copy" className="size-4" />{copied ? "Đã chép" : "Chép tất cả"}</Button>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />Tôi đã lưu các mã này</label>
        </div>
        <div className="flex justify-end border-t border-line-light pt-3.5"><Button variant="primary" disabled={!saved} onClick={cloud.dismissRecovery}>Hoàn tất</Button></div>
      </div>
    </Modal>
  );
}
