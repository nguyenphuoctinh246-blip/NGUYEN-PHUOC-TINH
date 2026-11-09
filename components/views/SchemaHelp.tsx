"use client";

import { useState } from "react";
import { getCloudConfig } from "@/lib/cloud/config";
import { SCHEMA_SQL } from "@/lib/cloud/schema-sql";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card } from "../ui";

/** Hướng dẫn một lần bấm để cập nhật cơ sở dữ liệu Supabase lên bản schema.sql mới nhất */
export default function SchemaHelp({ onChecked }: { onChecked?: () => void }) {
  const { cloud } = useApp();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");
  const cfg = typeof window === "undefined" ? null : getCloudConfig();
  const ref = (() => { try { return cfg ? new URL(cfg.url).hostname.split(".")[0] : ""; } catch { return ""; } })();
  const editorUrl = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : "https://supabase.com/dashboard";

  async function copy() {
    try { await navigator.clipboard.writeText(SCHEMA_SQL); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setResult("Trình duyệt không cho chép tự động. Hãy mở file schema.sql bằng Notepad, chọn tất cả (Ctrl+A) và chép (Ctrl+C)."); }
  }
  async function recheck() {
    setChecking(true); setResult("");
    try {
      const ok = await cloud.checkSchema();
      setResult(ok ? "Đã cập nhật xong. Tính năng tài khoản con sẵn sàng." : "Chưa thấy bản mới. Hãy chắc chắn bạn đã dán mã vào SQL Editor và bấm Run (thấy chữ Success), đợi vài giây rồi bấm lại.");
      if (ok) onChecked?.();
    } finally { setChecking(false); }
  }

  return (
    <Card title="Cập nhật cơ sở dữ liệu (làm một lần)" icon="database" color={4}>
      <p className="mt-0 mb-3 text-[13px] leading-relaxed text-fg-2">Cơ sở dữ liệu Supabase của bạn đang dùng bản cũ nên chưa có tính năng này. Làm 4 bước nhỏ dưới đây, không mất dữ liệu:</p>
      <ol className="m-0 mb-4 flex list-decimal flex-col gap-2 pl-5 text-[13px] leading-relaxed text-fg-2">
        <li>Bấm <b>Sao chép mã SQL</b>.</li>
        <li>Bấm <b>Mở SQL Editor</b> (mở đúng dự án của bạn trên Supabase, đăng nhập nếu được hỏi).</li>
        <li>Bấm vào ô trống, dán mã (<b>Ctrl + V</b>), rồi bấm nút <b>Run</b> màu xanh. Nếu hiện cảnh báo "destructive operations", bấm <b>Run this query</b>. Chờ chữ <b>Success</b>.</li>
        <li>Quay lại đây bấm <b>Kiểm tra lại</b>.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void copy()}><Icon name="copy" className="size-4" />{copied ? "Đã chép mã SQL" : "1. Sao chép mã SQL"}</Button>
        <a href={editorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-fg no-underline hover:bg-surface-alt">2. Mở SQL Editor ↗</a>
        <Button onClick={() => void recheck()} disabled={checking}>{checking ? "Đang kiểm tra…" : "4. Kiểm tra lại"}</Button>
      </div>
      {result && <p role="status" className={`mt-3 mb-0 rounded-lg px-3 py-2 text-[13px] ${result.startsWith("Đã cập nhật") ? "bg-income-soft text-income" : "bg-warn-soft text-warn"}`}>{result}</p>}
    </Card>
  );
}
