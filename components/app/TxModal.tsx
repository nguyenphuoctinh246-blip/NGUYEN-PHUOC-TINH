"use client";

import { useState } from "react";
import type { TxType } from "@/lib/types";
import { catList } from "@/lib/categories";
import { fmt, isoDate } from "@/lib/format";
import { newId } from "@/lib/id";
import { Button, Field, Modal } from "../ui";
import { useApp } from "./AppContext";

export default function TxModal() {
  const { s, txModal, closeTx } = useApp();
  const editing = txModal.editing;
  const [type, setType] = useState<TxType>(editing?.type ?? "expense");
  const [digits, setDigits] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category ?? catList("expense")[0]?.id ?? "chi_khac");
  const [date, setDate] = useState(editing?.date ?? isoDate(new Date()));
  const [account, setAccount] = useState(editing?.account ?? s.accounts[0]?.id ?? "tien_mat");
  const [payee, setPayee] = useState(editing?.payee ?? "");
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const isIncome = type === "income";
  const amount = parseInt(digits || "0", 10);
  const payees = [...new Set(s.tx.map((t) => t.payee).filter(Boolean))].slice(0, 60);

  function switchType(next: TxType) {
    setType(next);
    setCategory(catList(next)[0]?.id ?? "");
  }

  function build() {
    if (amount < 1000) { setError("Số tiền tối thiểu 1.000đ"); return null; }
    if (!date) { setError("Vui lòng chọn ngày"); return null; }
    setError("");
    return {
      id: editing?.id ?? newId(), type, amount, category, date, account, note: note.trim(), payee: payee.trim(),
      tags: tags.split(/[,#]/).map((x) => x.trim()).filter(Boolean),
    };
  }

  function save(again: boolean) {
    const t = build();
    if (!t) return;
    if (editing) s.updateTx(t);
    else s.addTx(t);
    if (again && !editing) { setDigits(""); setNote(""); setPayee(""); setTags(""); }
    else closeTx();
  }

  const toggle = "flex-1 cursor-pointer rounded-lg border-none p-2 text-[13px] font-semibold transition-all";
  return (
    <Modal title={editing ? "Sửa giao dịch" : "Thêm giao dịch"} onClose={closeTx} wide>
      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="flex flex-col gap-3.5">
        <div className="flex gap-[3px] rounded-[10px] bg-surface-alt p-[3px]" role="group" aria-label="Loại giao dịch">
          <button type="button" aria-pressed={!isIncome} onClick={() => switchType("expense")} className={`${toggle} ${!isIncome ? "bg-expense text-white" : "bg-transparent text-muted"}`}>Chi tiêu</button>
          <button type="button" aria-pressed={isIncome} onClick={() => switchType("income")} className={`${toggle} ${isIncome ? "bg-income text-white" : "bg-transparent text-muted"}`}>Thu nhập</button>
        </div>

        <Field label="Số tiền (VNĐ)" htmlFor="tx-amount">
          <div className="relative">
            <input id="tx-amount" inputMode="numeric" autoComplete="off" placeholder="0"
              value={digits ? fmt(amount) : ""} onChange={(e) => { setDigits(e.target.value.replace(/\D/g, "").slice(0, 12)); setError(""); }}
              className={`input-field !py-3 pr-9 font-mono text-xl font-bold ${isIncome ? "text-income" : "text-expense"}`} />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-semibold text-muted">đ</span>
          </div>
          {error && <p role="alert" className="mt-1 text-xs font-medium text-expense">{error}</p>}
        </Field>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Danh mục" htmlFor="tx-cat">
            <select id="tx-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {catList(type).map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.label}</option>))}
            </select>
          </Field>
          <Field label="Ngày" htmlFor="tx-date">
            <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </Field>
          <Field label={isIncome ? "Nhận vào tài khoản" : "Trả từ tài khoản"} htmlFor="tx-acc">
            <select id="tx-acc" value={account} onChange={(e) => setAccount(e.target.value)} className="input-field">
              {s.accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </Field>
          <Field label={isIncome ? "Nguồn thu" : "Nơi chi tiêu"} htmlFor="tx-payee">
            <input id="tx-payee" list="payee-list" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={isIncome ? "Ví dụ: Công ty ABC" : "Ví dụ: Siêu thị, quán cafe"} className="input-field" />
            <datalist id="payee-list">{payees.map((p) => (<option key={p} value={p} />))}</datalist>
          </Field>
        </div>

        <Field label="Nhãn" htmlFor="tx-tags" hint="Cách nhau bằng dấu phẩy, ví dụ: cố định, gia đình">
          <input id="tx-tags" value={tags} onChange={(e) => setTags(e.target.value)} className="input-field" />
        </Field>
        <Field label="Ghi chú" htmlFor="tx-note">
          <input id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả ngắn..." className="input-field" />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-light pt-3.5">
          {editing ? (
            confirmDel ? (
              <span className="flex gap-2">
                <Button variant="danger" onClick={() => { s.removeTx(editing.id); closeTx(); }}>Xác nhận xóa</Button>
                <Button onClick={() => setConfirmDel(false)}>Hủy</Button>
              </span>
            ) : (<Button variant="ghost" className="!text-expense" onClick={() => setConfirmDel(true)}>Xóa giao dịch</Button>)
          ) : <span />}
          <span className="flex gap-2">
            {!editing && <Button onClick={() => save(true)}>Lưu và thêm tiếp</Button>}
            <Button variant="primary" type="submit">{editing ? "Lưu thay đổi" : "Lưu"}</Button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
