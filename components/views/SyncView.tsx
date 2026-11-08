"use client";

import { Fragment, useState } from "react";
import type { VerifyRow } from "@/lib/cloud/engine";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Field, Pill } from "../ui";
import DevicesCard from "./DevicesCard";
import { ConnectForm, ConnectionCheck, ShareCard } from "./ConnectCard";
import { getCloudConfig, runtimeConfigAllowed } from "@/lib/cloud/config";
import { deviceName } from "@/lib/cloud/device";

function Setup() {
  return (
    <Card title="Đồng bộ nhiều thiết bị" icon="cloud" color={10}>
      <p className="mt-0 mb-3 text-[14px] leading-relaxed text-fg-2">
        Hiện ứng dụng đang ở chế độ <b>lưu trên máy này</b>. Để đăng nhập và dùng chung dữ liệu trên điện thoại, máy tính bảng và máy tính, cần nối ứng dụng với một cơ sở dữ liệu trực tuyến (Supabase, có gói miễn phí).
      </p>
      <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-fg-2">
        <li>Tạo dự án tại supabase.com và chạy file <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">supabase/schema.sql</code> trong SQL Editor.</li>
        <li>Lấy <b>Project URL</b> và <b>anon public key</b> trong Project Settings → API.</li>
        <li>Trên Vercel, thêm hai biến môi trường <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> và <code className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, rồi bấm Redeploy.</li>
        <li>Mở lại trang này, bạn sẽ thấy form đăng nhập.</li>
      </ol>
      <p className="mt-3 mb-0 text-xs text-muted">Hướng dẫn từng bước có hình ảnh nằm trong file Word <b>Huong-dan-dong-bo-nhieu-thiet-bi.docx</b>.</p>
    </Card>
  );
}

function AuthCard() {
  const { cloud } = useApp();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim() || !pw) return setMsg({ kind: "err", text: "Vui lòng nhập email và mật khẩu." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) return setMsg({ kind: "err", text: "Email chưa đúng định dạng (ví dụ ten@gmail.com). Hãy nhập đúng email đã dùng trên máy tính." });
    if (mode === "up" && pw.length < 6) return setMsg({ kind: "err", text: "Mật khẩu cần tối thiểu 6 ký tự." });
    setBusy(true);
    try {
      if (mode === "in") {
        const err = await cloud.signIn(email.trim(), pw);
        if (err) setMsg({ kind: "err", text: err });
      } else {
        const r = await cloud.signUp(email.trim(), pw);
        if ("error" in r && r.error) setMsg({ kind: "err", text: r.error });
        else if ("needsConfirm" in r && r.needsConfirm) setMsg({ kind: "ok", text: "Đã gửi email xác nhận. Mở email, bấm vào liên kết xác nhận rồi quay lại đăng nhập." });
      }
    } finally { setBusy(false); }
  }

  const tab = (m: "in" | "up", label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg(null); }}
      className={`flex-1 cursor-pointer rounded-md border-none px-3 py-2 text-[13px] font-semibold ${mode === m ? "bg-surface shadow-card" : "bg-transparent text-muted"}`}>{label}</button>
  );
  return (
    <Card title="Đăng nhập để đồng bộ" icon="user" color={10} className="mx-auto w-full max-w-md">
      <p className="mt-0 mb-4 text-[13px] text-muted">Đăng nhập cùng một tài khoản trên mọi thiết bị để nhập và xem chung dữ liệu thu chi.</p>
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-alt p-[3px]" role="tablist">{tab("in", "Đăng nhập")}{tab("up", "Tạo tài khoản")}</div>
      {mode === "up" ? (
        <p className="mt-0 mb-3.5 rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] leading-relaxed text-warn"><b>Chỉ tạo tài khoản MỘT lần</b>, trên thiết bị đầu tiên. Điện thoại và các máy khác phải chọn tab <b>Đăng nhập</b> với đúng email và mật khẩu đó, nếu không mỗi máy sẽ có một kho dữ liệu riêng và không thấy dữ liệu của nhau.</p>
      ) : (
        <p className="mt-0 mb-3.5 text-xs leading-relaxed text-muted">Dùng đúng email và mật khẩu đã tạo trên thiết bị đầu tiên. Đăng nhập khác email sẽ ra kho dữ liệu khác.</p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Email" htmlFor="auth-email"><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="ten@email.com" /></Field>
        <Field label="Mật khẩu" htmlFor="auth-pw" hint={mode === "up" ? "Tối thiểu 6 ký tự." : undefined}>
          <input id="auth-pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} className="input-field" />
        </Field>
        {msg && <p role={msg.kind === "err" ? "alert" : "status"} className={`m-0 rounded-lg px-3 py-2 text-[13px] font-medium ${msg.kind === "err" ? "bg-expense-soft text-expense" : "bg-income-soft text-income"}`}>{msg.text}</p>}
        <Button variant="primary" type="submit" disabled={busy} className="!py-2.5">{busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}</Button>
      </form>
      <p className="mt-4 mb-0 text-xs leading-relaxed text-muted">Dữ liệu đang có trên máy này sẽ được hỏi trước khi gộp vào tài khoản. Bạn vẫn dùng được ứng dụng khi chưa đăng nhập.</p>
    </Card>
  );
}

const fmtTime = (t: number | null) => (t ? new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–");

function Signed() {
  const { cloud, s } = useApp();
  const { user, info } = cloud;
  const [rows, setRows] = useState<VerifyRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [forget, setForget] = useState(false);
  const link = typeof window === "undefined" ? "" : window.location.href.split("#")[0];
  const [reportCopied, setReportCopied] = useState(false);
  const cfgNow = typeof window === "undefined" ? null : getCloudConfig();
  const host = (() => { try { return cfgNow ? new URL(cfgNow.url).host : "–"; } catch { return cfgNow?.url ?? "–"; } })();
  const localTx = s.tx.filter((t) => !t.isSample).length;
  const diag: [string, string][] = [
    ["Phiên bản ứng dụng", `${process.env.NEXT_PUBLIC_COMMIT ?? "?"} · xây dựng ${process.env.NEXT_PUBLIC_BUILD_TIME ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString("vi-VN") : "?"}`],
    ["Máy chủ", host],
    ["Tài khoản", `${user?.email ?? "–"} · mã ${(user?.id ?? "").slice(0, 6)}`],
    ["Thiết bị", `${deviceName()} · ${cloud.device.legacy ? "chưa bật duyệt thiết bị" : "đã được duyệt"}`],
    ["Cập nhật tức thì", info.realtime ? "Đang hoạt động" : "Chưa hoạt động (vẫn tự đồng bộ mỗi 6 giây)"],
    ["Lần cập nhật cuối", fmtTime(info.lastSync)],
    ["Thay đổi chờ gửi", String(info.pending)],
    ["Dữ liệu trên máy này", `${localTx} giao dịch`],
    ...(rows ? rows.map((r): [string, string] => [`Trên tài khoản · ${r.label}`, `${r.remote} (máy này ${r.local})${r.onlyLocal || r.onlyRemote || r.different ? " · LỆCH" : ""}`]) : []),
  ];
  async function copyReport() {
    const text = ["BÁO CÁO CHẨN ĐOÁN ĐỒNG BỘ", ...diag.map(([k, v]) => `${k}: ${v}`), `Trạng thái: ${statusText}`, info.message ? `Thông báo: ${info.message}` : ""].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); setReportCopied(true); setTimeout(() => setReportCopied(false), 1800); } catch { /* tự chép */ }
  }

  async function check() {
    setChecking(true); setErr(""); setRows(null);
    try { setRows(await cloud.verify()); } catch (e) { setErr(e instanceof Error ? e.message : "Không kiểm tra được. Hãy thử lại."); }
    finally { setChecking(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* người dùng tự chép */ }
  }
  const mismatch = rows?.some((r) => r.onlyLocal || r.onlyRemote || r.different);
  const statusText = info.status === "synced" ? (info.pending ? `Còn ${info.pending} thay đổi chờ gửi` : "Đã đồng bộ") : info.status === "syncing" || info.status === "idle" ? "Đang đồng bộ…" : info.status === "offline" ? "Mất kết nối" : "Lỗi đồng bộ";
  const tone = info.status === "synced" && !info.pending ? "income" : info.status === "error" ? "expense" : "warn";

  return (
    <div className="flex flex-col gap-4">
      <section className="card relative overflow-hidden border-0 bg-gradient-to-br from-brand-from to-brand-to px-5 py-5 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.06em] uppercase opacity-80">Đang đăng nhập</div>
            <div className="mt-1 truncate text-lg font-bold">{user?.email}</div>
            <div className="mt-1 text-xs opacity-85">Cập nhật lần cuối: {fmtTime(info.lastSync)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void cloud.syncNow()} className="!border-white/30 !bg-white/15 !text-white hover:!bg-white/25"><Icon name="refresh" className="size-4" />Đồng bộ ngay</Button>
            {confirmOut ? (
              <><Button variant="danger" onClick={() => void cloud.signOut(forget)}>Xác nhận đăng xuất</Button><Button onClick={() => setConfirmOut(false)}>Hủy</Button></>
            ) : <Button onClick={() => setConfirmOut(true)} className="!border-white/30 !bg-white/15 !text-white hover:!bg-white/25">Đăng xuất</Button>}
          </div>
        </div>
        {confirmOut && (
          <div className="relative mt-3 text-xs opacity-90">
            <p className="m-0">Đăng xuất sẽ xóa dữ liệu lưu trên máy này (dữ liệu vẫn còn nguyên trong tài khoản). Đăng nhập lại để tải về.</p>
            {!cloud.device.legacy && <label className="mt-2 flex cursor-pointer items-center gap-2"><input type="checkbox" checked={forget} onChange={(e) => setForget(e.target.checked)} />Quên thiết bị này (lần sau phải được duyệt lại bằng mã, nên chọn khi dùng máy chung)</label>}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Chẩn đoán đồng bộ" icon="cloud" color={10}
          action={<Button className="!py-1.5 text-xs" onClick={() => void copyReport()}><Icon name="copy" className="size-3.5" />{reportCopied ? "Đã chép" : "Chép báo cáo"}</Button>}>
          <div className="mb-2 flex items-center gap-2"><Pill tone={tone}>{statusText}</Pill></div>
          {info.message && <p className="mt-0 mb-2 text-[13px] text-expense">{info.message}</p>}
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {diag.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="m-0 min-w-0 font-medium break-words">{v}</dd></Fragment>))}
          </dl>
          <p className="mt-3 mb-0 rounded-lg bg-surface-alt px-3 py-2 text-xs leading-relaxed text-fg-2"><b>Hai thiết bị cùng một nguồn dữ liệu</b> khi Máy chủ và Mã tài khoản ở hai máy giống hệt nhau. Nếu khác, một máy đang dùng dự án hoặc tài khoản khác.</p>
        </Card>
        <Card title="Dùng trên thiết bị khác" icon="list" color={7}>
          <p className="mt-0 mb-2 text-[13px] text-fg-2">Mở đường link dưới đây trên thiết bị khác và đăng nhập cùng email này:</p>
          <div className="flex gap-2">
            <input readOnly aria-label="Đường link ứng dụng" value={link} onFocus={(e) => e.currentTarget.select()} className="input-field !py-2 font-mono text-xs" />
            <Button onClick={() => void copy()}><Icon name="copy" className="size-4" />{copied ? "Đã chép" : "Chép"}</Button>
          </div>
        </Card>
      </div>

      <DevicesCard />

      <ShareCard />

      <Card title="Kiểm tra dữ liệu" icon="check" color={3} action={<Button variant="primary" onClick={() => void check()} disabled={checking}>{checking ? "Đang kiểm tra…" : "Kiểm tra ngay"}</Button>}>
        <p className="mt-0 mb-3 text-[13px] text-muted">So sánh dữ liệu trên máy này với dữ liệu đang lưu trong tài khoản, để chắc chắn mọi thiết bị thấy cùng một số liệu.</p>
        {err && <p role="alert" className="m-0 rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">{err}</p>}
        {rows && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead><tr className="border-b border-line-light text-left text-[11px] tracking-[0.05em] text-muted uppercase"><th className="py-2 pr-3 font-semibold">Mục</th><th className="px-3 py-2 text-right font-semibold">Trên máy</th><th className="px-3 py-2 text-right font-semibold">Trên tài khoản</th><th className="py-2 pl-3 text-right font-semibold">Kết quả</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const bad = r.onlyLocal || r.onlyRemote || r.different;
                    return (
                      <tr key={r.table} className="border-b border-line-light last:border-b-0">
                        <td className="py-2.5 pr-3 font-medium">{r.label}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.local}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{r.remote}</td>
                        <td className="py-2.5 pl-3 text-right">{bad ? <Pill tone="warn">Lệch {r.onlyLocal + r.onlyRemote + r.different}</Pill> : <Pill tone="income">Khớp</Pill>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {mismatch ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-[13px] text-warn">
                <span className="flex-1">Có dữ liệu chưa khớp (thường do đang chờ gửi). Bấm Đồng bộ ngay rồi kiểm tra lại, hoặc tải lại toàn bộ từ tài khoản.</span>
                <Button onClick={() => void cloud.syncNow().then(check)}>Đồng bộ rồi kiểm tra lại</Button>
                <Button onClick={() => void cloud.reload().then(check)}>Tải lại từ tài khoản (bỏ thay đổi chưa gửi)</Button>
              </div>
            ) : <p className="mt-3 mb-0 rounded-lg bg-income-soft px-3 py-2.5 text-[13px] font-medium text-income">Dữ liệu trên máy này khớp hoàn toàn với tài khoản ({s.tx.filter((t) => !t.isSample).length} giao dịch).</p>}
          </>
        )}
      </Card>
    </div>
  );
}

export default function SyncView() {
  const { cloud } = useApp();
  if (!cloud.authReady && !cloud.configured) return <div className="card h-40 animate-pulse" aria-busy="true" />;
  if (!cloud.configured) return runtimeConfigAllowed ? <ConnectForm /> : <Setup />;
  if (!cloud.authReady) return <div className="card h-40 animate-pulse" aria-busy="true" />;
  return cloud.user ? <Signed /> : (<div className="flex flex-col gap-4"><AuthCard /><div className="mx-auto flex w-full max-w-2xl flex-col gap-4"><ConnectionCheck /><ShareCard /></div></div>);
}
