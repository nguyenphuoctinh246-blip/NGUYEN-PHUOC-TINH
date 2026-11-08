"use client";

import { useRef, useState } from "react";
import type { Account, Transaction } from "@/lib/types";
import { downloadFile } from "@/lib/download";
import { parseCsv, parseJson, toCsv } from "@/lib/exchange";
import { isoDate } from "@/lib/format";

type Msg = { kind: "ok" | "err"; text: string } | null;

export default function DataTools({
  transactions,
  accounts,
  hasSamples,
  onImport,
  onClear,
}: {
  transactions: Transaction[];
  accounts: Account[];
  hasSamples: boolean;
  onImport: (items: Transaction[]) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const real = transactions.filter((t) => !t.isSample);
  const stamp = isoDate(new Date());

  function exportCsv() {
    downloadFile(`chi-tieu-${stamp}.csv`, toCsv(real, accounts), "text/csv;charset=utf-8");
    setMsg({ kind: "ok", text: `Đã xuất ${real.length} giao dịch ra file Excel (CSV).` });
  }

  function exportJson() {
    downloadFile(`chi-tieu-${stamp}.json`, JSON.stringify(real, null, 2), "application/json");
    setMsg({ kind: "ok", text: `Đã tạo bản sao lưu ${real.length} giao dịch.` });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith(".json");
      const { items, skipped } = isJson ? parseJson(text, accounts) : parseCsv(text, accounts);
      if (items.length === 0) {
        setMsg({ kind: "err", text: "Không có dòng hợp lệ nào trong file. Hãy dùng đúng mẫu: Ngày; Loại; Danh mục; Số tiền; Ghi chú." });
        return;
      }
      onImport(items);
      setMsg({ kind: "ok", text: `Đã nhập ${items.length} giao dịch${skipped ? `, bỏ qua ${skipped} dòng không hợp lệ` : ""}.` });
    } catch {
      setMsg({ kind: "err", text: "Không đọc được file. Hãy chọn file .csv hoặc .json đã xuất từ ứng dụng." });
    }
  }

  function downloadTemplate() {
    const acc = accounts[0]?.id ?? "tien_mat";
    const sample: Transaction[] = [
      { id: "m1", type: "expense", amount: 45000, category: "an_uong", date: stamp, note: "Cà phê sáng", account: acc, payee: "Quán cafe", tags: ["hằng ngày"] },
      { id: "m2", type: "income", amount: 15000000, category: "luong", date: stamp, note: "Lương tháng", account: acc, payee: "Công ty ABC", tags: [] },
    ];
    downloadFile("mau-nhap-chi-tieu.csv", toCsv(sample, accounts), "text/csv;charset=utf-8");
  }

  const btn = "cursor-pointer rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-fg transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="card px-4 py-[18px]" aria-labelledby="data-tools-title">
      <h2 id="data-tools-title" className="card-title mb-1">Quản lý dữ liệu</h2>
      <p className="mb-3.5 text-[13px] text-muted">
        Dữ liệu lưu trên trình duyệt này. Hãy xuất file định kỳ để sao lưu hoặc chuyển sang máy khác.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={exportCsv} disabled={real.length === 0}>Xuất Excel (.csv)</button>
        <button type="button" className={btn} onClick={exportJson} disabled={real.length === 0}>Sao lưu (.json)</button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Nhập từ file</button>
        <button type="button" className={btn} onClick={downloadTemplate}>Tải file mẫu</button>
        <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={onFile} className="hidden" aria-label="Chọn file để nhập" />

        <span className="grow" />
        {confirmClear ? (
          <>
            <button type="button" className="cursor-pointer rounded-lg border-none bg-expense px-3.5 py-2 text-[13px] font-semibold text-white"
              onClick={() => { onClear(); setConfirmClear(false); setMsg({ kind: "ok", text: "Đã xóa toàn bộ dữ liệu." }); }}>
              Xác nhận xóa tất cả
            </button>
            <button type="button" className={btn} onClick={() => setConfirmClear(false)}>Hủy</button>
          </>
        ) : (
          <button type="button" className={`${btn} text-expense`} onClick={() => setConfirmClear(true)} disabled={transactions.length === 0}>
            Xóa tất cả
          </button>
        )}
      </div>

      {hasSamples && <p className="mt-3 text-xs text-muted">Dữ liệu mẫu không được đưa vào file xuất.</p>}
      {msg && (
        <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-[13px] font-medium ${msg.kind === "ok" ? "bg-income-soft text-income" : "bg-expense-soft text-expense"}`}>
          {msg.text}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        File nhập .csv gồm các cột cách nhau bằng dấu chấm phẩy: Ngày (2026-11-08 hoặc 08/11/2026); Loại (Thu nhập hoặc Chi tiêu); Danh mục; Số tiền; Ghi chú; Tài khoản; Nơi chi/Nguồn thu; Nhãn. Ba cột cuối có thể để trống.
      </p>
    </section>
  );
}
