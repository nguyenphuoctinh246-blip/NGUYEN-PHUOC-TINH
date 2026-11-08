"use client";

import { useState } from "react";
import type { Transaction, TxType } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { fmt, isoDate } from "@/lib/format";
import { newId } from "@/lib/id";

interface Props {
  /** Giao dịch đang sửa (null = thêm mới). Cha dùng key để làm mới form khi đổi giao dịch. */
  editing: Transaction | null;
  onAdd: (t: Transaction) => void;
  onUpdate: (t: Transaction) => void;
  onCancel: () => void;
}

export default function TxForm({ editing, onAdd, onUpdate, onCancel }: Props) {
  const [type, setType] = useState<TxType>(editing?.type ?? "expense");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES.expense[0].id);
  const [date, setDate] = useState(editing?.date ?? isoDate(new Date()));
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState("");

  const cats = CATEGORIES[type];
  const isIncome = type === "income";
  const num = parseFloat(amount);

  function switchType(next: TxType) {
    setType(next);
    setCategory(CATEGORIES[next][0].id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!num || num < 1000) {
      setError("Số tiền tối thiểu 1.000đ");
      return;
    }
    if (!date) {
      setError("Vui lòng chọn ngày");
      return;
    }
    setError("");
    const data = { type, amount: Math.round(num), category, date, note: note.trim() };
    if (editing) onUpdate({ ...data, id: editing.id });
    else onAdd({ ...data, id: newId() });
    if (!editing) {
      setAmount("");
      setNote("");
    }
  }

  const toggleBase = "flex-1 cursor-pointer rounded-lg border-none p-2 text-[13px] font-semibold transition-all";

  return (
    <form
      id="form-giao-dich"
      onSubmit={submit}
      className={`card scroll-mt-20 px-4 py-[18px] ${editing ? "ring-2 ring-accent" : ""}`}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="card-title">{editing ? "Sửa giao dịch" : "Thêm giao dịch"}</h2>
        {editing && (
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg-2 hover:bg-surface-alt">
            Hủy sửa
          </button>
        )}
      </div>

      <div className="mb-3.5 flex gap-[3px] rounded-[10px] bg-surface-alt p-[3px]" role="group" aria-label="Loại giao dịch">
        <button type="button" aria-pressed={!isIncome} onClick={() => switchType("expense")}
          className={`${toggleBase} ${!isIncome ? "bg-expense text-white" : "bg-transparent text-muted"}`}>
          Chi tiêu
        </button>
        <button type="button" aria-pressed={isIncome} onClick={() => switchType("income")}
          className={`${toggleBase} ${isIncome ? "bg-income text-white" : "bg-transparent text-muted"}`}>
          Thu nhập
        </button>
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="amt">Số tiền (VNĐ)</label>
        <input id="amt" type="number" inputMode="numeric" required min={1000} step={1000} placeholder="0"
          value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }}
          className="input-field font-mono font-medium" />
        {num >= 1000 && <p className="mt-1 font-mono text-xs text-muted">= {fmt(Math.round(num))}đ</p>}
        {error && <p role="alert" className="mt-1 text-xs font-medium text-expense">{error}</p>}
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="cat">Danh mục</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="dt">Ngày</label>
        <input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
      </div>

      <div className="mb-3.5">
        <label className="input-label" htmlFor="nt">Ghi chú</label>
        <input id="nt" type="text" placeholder="Mô tả ngắn..." value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
      </div>

      <button type="submit"
        className={`w-full cursor-pointer rounded-[10px] border-none p-[11px] text-sm font-semibold tracking-[0.01em] text-white transition-opacity hover:opacity-90 ${isIncome ? "bg-income" : "bg-expense"}`}>
        {editing ? "Lưu thay đổi" : isIncome ? "+ Thêm khoản thu" : "+ Thêm khoản chi"}
      </button>
    </form>
  );
}
