"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { clearCloudConfig, getCloudConfig, runtimeConfigAllowed, saveCloudConfig } from "@/lib/cloud/config";
import { diagnose, type Diagnosis } from "@/lib/cloud/diagnose";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Field } from "../ui";

/** Chưa kết nối: dán Project URL + khóa để nối ứng dụng với cơ sở dữ liệu chung */
export function ConnectForm() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Diagnosis | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setRes(null);
    try {
      const d = await diagnose(url, key);
      setRes(d);
      if (d.ready) {
        saveCloudConfig(url, key);
        setTimeout(() => { window.location.hash = "dong-bo"; window.location.reload(); }, 900);
      }
    } finally { setBusy(false); }
  }

  return (
    <Card title="Kết nối cơ sở dữ liệu chung" icon="cloud" color={10} className="mx-auto w-full max-w-2xl">
      <p className="mt-0 mb-3 text-[14px] leading-relaxed text-fg-2">
        Hiện ứng dụng đang ở chế độ <b>lưu trên máy này</b>: điện thoại và máy tính mỗi nơi một dữ liệu riêng. Để cả hai cùng dùng <b>một nguồn dữ liệu</b>, hãy nối với Supabase (miễn phí) rồi dán hai thông tin kết nối vào đây. Không cần cấu hình Vercel hay triển khai lại.
      </p>
      <ol className="mb-4 flex flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-fg-2">
        <li>Tạo dự án tại <b>supabase.com</b>, mở <b>SQL Editor</b>, dán toàn bộ file <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">schema.sql</code> và bấm <b>Run</b>.</li>
        <li>Vào <b>Project Settings → API</b>, chép <b>Project URL</b> và khóa <b>anon public</b> (hoặc Publishable key).</li>
        <li>Dán vào hai ô dưới đây rồi bấm <b>Kiểm tra và kết nối</b>.</li>
      </ol>
      <form onSubmit={run} className="flex flex-col gap-3.5">
        <Field label="Project URL" htmlFor="cfg-url"><input id="cfg-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://abcdefghijkl.supabase.co" autoComplete="off" className="input-field font-mono text-[13px]" /></Field>
        <Field label="Khóa anon public / Publishable key" htmlFor="cfg-key" hint="Không dùng khóa service_role hoặc secret.">
          <input id="cfg-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi… hoặc sb_publishable_…" autoComplete="off" spellCheck={false} className="input-field font-mono text-[13px]" />
        </Field>
        <Button variant="primary" type="submit" disabled={busy || !url.trim() || !key.trim()} className="!py-2.5">{busy ? "Đang kiểm tra…" : "Kiểm tra và kết nối"}</Button>
      </form>
      {res && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0" aria-live="polite">
          {res.checks.map((c) => (
            <li key={c.label} className={`rounded-lg px-3 py-2.5 text-[13px] ${!c.ok ? "bg-expense-soft text-expense" : c.warn ? "bg-warn-soft text-warn" : "bg-income-soft text-income"}`}>
              <b>{c.ok ? (c.warn ? "! " : "✓ ") : "✗ "}{c.label}</b>
              {c.detail && <div className="mt-0.5 text-xs opacity-90">{c.detail}</div>}
            </li>
          ))}
          {res.ready && <li className="text-[13px] font-medium text-income">Đang kết nối…{res.confirmEmail ? " (Lưu ý: dự án đang yêu cầu xác nhận email khi tạo tài khoản.)" : ""}</li>}
        </ul>
      )}
    </Card>
  );
}

/** Đã kết nối: chia sẻ cấu hình sang thiết bị khác bằng link hoặc mã QR */
export function ShareCard() {
  const { cloud } = useApp();
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const l = cloud.makeShareLink();
    setLink(l);
    if (!l) return;
    let alive = true;
    QRCode.toDataURL(l, { margin: 1, width: 240, errorCorrectionLevel: "L" }).then((u) => { if (alive) setQr(u); }).catch(() => {});
    return () => { alive = false; };
  }, [cloud.configSource, cloud.configured]);

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* tự chép */ }
  }
  async function disconnect() {
    await cloud.signOut(false);
    clearCloudConfig();
    window.location.hash = "dong-bo";
    window.location.reload();
  }

  return (
    <Card title="Kết nối thiết bị khác vào cùng nguồn dữ liệu" icon="list" color={7}>
      <p className="mt-0 mb-3 text-[13px] leading-relaxed text-fg-2">Trên điện thoại hoặc máy khác, mở đường link dưới đây (hoặc quét mã QR bằng camera). Thiết bị đó tự kết nối cùng cơ sở dữ liệu, bạn chỉ cần đăng nhập và duyệt bằng mã 6 số.</p>
      <div className="flex flex-wrap items-start gap-4">
        {qr && <img src={qr} alt="Mã QR kết nối thiết bị" width={150} height={150} className="rounded-lg border border-line-light bg-white p-1" />}
        <div className="min-w-[220px] flex-1">
          <div className="flex gap-2">
            <input readOnly aria-label="Đường link kết nối" value={link} onFocus={(e) => e.currentTarget.select()} className="input-field !py-2 font-mono text-xs" />
            <Button onClick={() => void copy()}><Icon name="copy" className="size-4" />{copied ? "Đã chép" : "Chép"}</Button>
          </div>
          <p className="mt-2 mb-0 text-xs leading-relaxed text-muted">Link chỉ chứa địa chỉ dự án và khóa công khai, không chứa mật khẩu hay dữ liệu của bạn. Sau khi tất cả thiết bị đã đăng nhập, bạn nên tắt "Allow new users to sign up" trong Supabase (Authentication → Sign In / Providers) để không ai khác tạo được tài khoản.</p>
        </div>
      </div>
      {cloud.configSource === "device" && runtimeConfigAllowed && (
        <div className="mt-4 border-t border-line-light pt-3">
          {confirm
            ? <span className="flex flex-wrap items-center gap-2 text-[13px]"><span>Ngắt kết nối sẽ đăng xuất và xóa dữ liệu lưu trên máy này (dữ liệu vẫn còn trên Supabase).</span><Button variant="danger" onClick={() => void disconnect()}>Xác nhận ngắt kết nối</Button><Button onClick={() => setConfirm(false)}>Hủy</Button></span>
            : <Button variant="ghost" className="!text-expense" onClick={() => setConfirm(true)}>Ngắt kết nối cơ sở dữ liệu</Button>}
        </div>
      )}
    </Card>
  );
}


/** Hiện địa chỉ đang kết nối và cho kiểm tra lại, để tự phát hiện Project URL/khóa sai */
export function ConnectionCheck() {
  const { cloud } = useApp();
  const [res, setRes] = useState<Diagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const cfg = typeof window === "undefined" ? null : getCloudConfig();
  const host = (() => { try { return cfg ? new URL(cfg.url).host : ""; } catch { return cfg?.url ?? ""; } })();

  async function run() {
    if (!cfg) return;
    setBusy(true);
    try { setRes(await diagnose(cfg.url, cfg.key)); } finally { setBusy(false); }
  }
  const failed = res && !res.ready;

  return (
    <Card title="Kết nối đang dùng" icon="cloud" color={10}
      action={<Button onClick={() => void run()} disabled={busy} className="!py-1.5 text-xs">{busy ? "Đang kiểm tra…" : "Kiểm tra kết nối"}</Button>}>
      <p className="m-0 text-[13px] text-fg-2">Máy chủ: <b className="font-mono">{host || "chưa có"}</b> <span className="text-muted">({cloud.configSource === "env" ? "đặt trên Vercel" : "nhập trong ứng dụng"})</span></p>
      {res && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0" aria-live="polite">
          {res.checks.map((c) => (
            <li key={c.label} className={`rounded-lg px-3 py-2.5 text-[13px] ${!c.ok ? "bg-expense-soft text-expense" : c.warn ? "bg-warn-soft text-warn" : "bg-income-soft text-income"}`}>
              <b>{c.ok ? (c.warn ? "! " : "✓ ") : "✗ "}{c.label}</b>
              {c.detail && <div className="mt-0.5 text-xs opacity-90">{c.detail}</div>}
            </li>
          ))}
        </ul>
      )}
      {failed && runtimeConfigAllowed && (
        <div className="mt-3">
          {cloud.configSource === "env" && <p className="mt-0 mb-2 text-xs text-muted">Địa chỉ này đang được đặt trong biến môi trường trên Vercel. Bạn có thể nhập địa chỉ đúng bên dưới (ưu tiên hơn biến môi trường), hoặc sửa biến NEXT_PUBLIC_SUPABASE_URL trên Vercel rồi Redeploy.</p>}
          {edit ? <ConnectForm /> : <Button onClick={() => setEdit(true)}>Nhập lại Project URL và khóa</Button>}
        </div>
      )}
    </Card>
  );
}
