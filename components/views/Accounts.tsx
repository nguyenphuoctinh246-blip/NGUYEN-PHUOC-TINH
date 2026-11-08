"use client";

import { useState } from "react";
import type { Account, AccountKind } from "@/lib/types";
import { ACCOUNT_KINDS, accountBalance } from "@/lib/accounts";
import { fmt } from "@/lib/format";
import { newId } from "@/lib/id";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Field, Modal } from "../ui";

function AccountModal({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const { s } = useApp();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "bank");
  const [neg, setNeg] = useState((account?.opening ?? 0) < 0);
  const [digits, setDigits] = useState(account ? String(Math.abs(account.opening)) : "");
  const [err, setErr] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Vui lòng nhập tên tài khoản");
    const n = parseInt(digits || "0", 10);
    s.saveAccount({ id: account?.id ?? "acc_" + newId(), name: name.trim(), kind, opening: neg ? -n : n });
    onClose();
  }
  return (
    <Modal title={account ? "Sửa tài khoản" : "Thêm tài khoản"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Tên tài khoản" htmlFor="a-name"><input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Thẻ lương, Ví MoMo" className="input-field" /></Field>
        <Field label="Loại" htmlFor="a-kind">
          <select id="a-kind" value={kind} onChange={(e) => { const k = e.target.value as AccountKind; setKind(k); setNeg(k === "credit" ? neg : false); }} className="input-field">
            {Object.entries(ACCOUNT_KINDS).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
          </select>
        </Field>
        <Field label="Số dư ban đầu (đ)" htmlFor="a-open" hint={kind === "credit" ? "Thẻ tín dụng: tick ô dưới nếu đang dư nợ." : "Số tiền có sẵn trước khi bạn bắt đầu ghi giao dịch."}>
          <input id="a-open" inputMode="numeric" value={digits ? fmt(+digits) : ""} onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 13))} className="input-field font-mono" />
          {kind === "credit" && <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={neg} onChange={(e) => setNeg(e.target.checked)} />Đang dư nợ (số âm)</label>}
        </Field>
        {err && <p role="alert" className="text-xs font-medium text-expense">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-line-light pt-3.5"><Button onClick={onClose}>Hủy</Button><Button variant="primary" type="submit">Lưu</Button></div>
      </form>
    </Modal>
  );
}

export default function Accounts() {
  const { s } = useApp();
  const [modal, setModal] = useState<{ account: Account | null } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const bal = s.accounts.map((a) => ({ a, b: accountBalance(a, s.tx), n: s.tx.filter((t) => t.account === a.id).length }));
  const assets = bal.filter((x) => x.b > 0).reduce((t, x) => t + x.b, 0);
  const debts = bal.filter((x) => x.b < 0).reduce((t, x) => t + x.b, 0);
  const net = assets + debts;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Tổng tài sản ròng</div><div className={`mt-1 font-mono text-2xl font-bold ${net < 0 ? "text-expense" : ""}`}>{fmt(net)}đ</div></div>
          <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Tài sản</div><div className="mt-1 font-mono text-xl font-bold text-income">{fmt(assets)}đ</div></div>
          <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Nợ</div><div className="mt-1 font-mono text-xl font-bold text-expense">{fmt(Math.abs(debts))}đ</div></div>
        </div>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-muted">Số dư = số dư ban đầu + thu − chi của mọi giao dịch ghi vào tài khoản.</p>
        <Button variant="primary" onClick={() => setModal({ account: null })}><Icon name="plus" className="size-4" />Thêm tài khoản</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bal.map(({ a, b, n }) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-xl">{ACCOUNT_KINDS[a.kind].icon}</span>
                <div className="min-w-0"><h3 className="m-0 truncate text-[15px] font-bold">{a.name}</h3><div className="text-xs text-muted">{ACCOUNT_KINDS[a.kind].label}</div></div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <button type="button" aria-label={`Sửa ${a.name}`} onClick={() => setModal({ account: a })} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-accent-soft hover:text-accent"><Icon name="edit" className="size-4" /></button>
                {confirm === a.id ? <button type="button" onClick={() => { s.removeAccount(a.id); setConfirm(null); }} onPointerLeave={() => setConfirm(null)} className="animate-pop cursor-pointer rounded-md border-none bg-expense px-2 text-[11px] font-semibold text-white">Xóa?</button>
                  : <button type="button" aria-label={`Xóa ${a.name}`} disabled={n > 0 || s.accounts.length <= 1} title={n > 0 ? "Tài khoản đã có giao dịch nên không xóa được" : s.accounts.length <= 1 ? "Cần giữ ít nhất một tài khoản" : "Xóa tài khoản"} onClick={() => setConfirm(a.id)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-expense-soft hover:text-expense disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted"><Icon name="trash" className="size-4" /></button>}
              </div>
            </div>
            <div className={`mt-4 font-mono text-2xl font-bold ${b < 0 ? "text-expense" : ""}`}>{b < 0 ? "-" : ""}{fmt(Math.abs(b))}đ</div>
            <div className="mt-1 text-xs text-muted">{n} giao dịch · số dư ban đầu {fmt(a.opening)}đ</div>
          </Card>
        ))}
      </div>
      {modal && <AccountModal account={modal.account} onClose={() => setModal(null)} />}
    </div>
  );
}
