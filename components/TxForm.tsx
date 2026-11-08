"use client";

import { useState } from "react";
import type { Transaction, TxType } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { isoDate } from "@/lib/format";

export default function TxForm({ onAdd }: { onAdd: (t: Transaction) => void }) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES.expense[0].id);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const cats = CATEGORIES[type];
  const isIncome = type === "income";

  function switchType(next: TxType) {
    setType(next);
    setCategory(CATEGORIES[next][0].id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num < 1000) {
      setError("Số tiền tối thiểu 1.000đ");
      return;
    }
    setError("");
    onAdd({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      amount: num,
      category,
      date,
      note: note.trim(),
    });
    setAmount("");
    setNote("");
  }

  const toggleBase = "flex-1 cursor-pointer rounded-lg border-none p-2 text-[13px] font-semibold transition-all";

  return (
    <form onSubmit={submit} className="card px-4 py-[18px]">
      <h2 className="card-title mb-3.5">Thêm giao dịch</h2>

      <div className="mb-3.5 flex gap-[3px] rounded-[10px] bg-surface-alt p-[3px]" role="group" aria-label="Loại giao dịch">
        <button
          type="button"
          aria-pressed={!isIncome}
          onClick={() => switchType("expense")}
          className={`${toggleBase} ${!isIncome ? "bg-expense text-white" : "bg-transparent text-muted"}`}
        >
          Chi tiêu
        </button>
        <button
          type="button"
          aria-pressed={isIncome}
          onClick={() => switchType("income")}
          className={`${toggleBase} ${isIncome ? "bg-income text-white" : "bg-transparent text-muted"}`}
        >
          Thu nhập
        </button>
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="amt">Số tiền (VNĐ)</label>
        <input
          id="amt"
          type="number"
          inputMode="numeric"
          required
          min={1000}
          step={1000}
          placeholder="0"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError("");
          }}
          className="input-field font-mono font-medium"
        />
        {error && <p className="mt-1 text-xs font-medium text-expense">{error}</p>}
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="cat">Danh mục</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2.5">
        <label className="input-label" htmlFor="dt">Ngày</label>
        <input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
      </div>

      <div className="mb-3.5">
        <label className="input-label" htmlFor="nt">Ghi chú</label>
        <input
          id="nt"
          type="text"
          placeholder="Mô tả ngắn..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input-field"
        />
      </div>

      <button
        type="submit"
        className={`w-full cursor-pointer rounded-[10px] border-none p-[11px] text-sm font-semibold tracking-[0.01em] text-white transition-opacity hover:opacity-90 ${
          isIncome ? "bg-income" : "bg-expense"
        }`}
      >
        {isIncome ? "+ Thêm khoản thu" : "+ Thêm khoản chi"}
      </button>
    </form>
  );
}
