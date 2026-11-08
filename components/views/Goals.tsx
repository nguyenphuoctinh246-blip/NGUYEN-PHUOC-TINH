"use client";

import { useState } from "react";
import type { Goal } from "@/lib/types";
import { fmt, fmtDateFull } from "@/lib/format";
import { newId } from "@/lib/id";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Empty, Field, Modal, Pill, Progress } from "../ui";

const monthsLeft = (deadline: string) => Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (86400000 * 30.44)));

function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { s } = useApp();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [saved, setSaved] = useState(goal ? String(goal.saved) : "0");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [err, setErr] = useState("");
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 12);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseInt(target || "0", 10);
    if (!name.trim()) return setErr("Vui lòng đặt tên mục tiêu");
    if (t < 1000) return setErr("Số tiền mục tiêu tối thiểu 1.000đ");
    s.saveGoal({ id: goal?.id ?? newId(), name: name.trim(), target: t, saved: parseInt(saved || "0", 10), deadline });
    onClose();
  }
  return (
    <Modal title={goal ? "Sửa mục tiêu" : "Thêm mục tiêu"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Tên mục tiêu" htmlFor="g-name"><input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Mua laptop" className="input-field" /></Field>
        <Field label="Số tiền cần đạt (đ)" htmlFor="g-target"><input id="g-target" inputMode="numeric" value={target ? fmt(+target) : ""} onChange={(e) => setTarget(digits(e.target.value))} className="input-field font-mono" /></Field>
        <Field label="Đã tiết kiệm (đ)" htmlFor="g-saved"><input id="g-saved" inputMode="numeric" value={saved ? fmt(+saved) : ""} onChange={(e) => setSaved(digits(e.target.value))} className="input-field font-mono" /></Field>
        <Field label="Hạn hoàn thành (không bắt buộc)" htmlFor="g-date"><input id="g-date" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-field" /></Field>
        {err && <p role="alert" className="text-xs font-medium text-expense">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-line-light pt-3.5"><Button onClick={onClose}>Hủy</Button><Button variant="primary" type="submit">Lưu mục tiêu</Button></div>
      </form>
    </Modal>
  );
}

function GoalCard({ g, onEdit }: { g: Goal; onEdit: () => void }) {
  const { s } = useApp();
  const [add, setAdd] = useState("");
  const [confirm, setConfirm] = useState(false);
  const pct = (g.saved / g.target) * 100;
  const done = g.saved >= g.target;
  const need = g.deadline && !done ? Math.ceil((g.target - g.saved) / monthsLeft(g.deadline)) : null;
  const overdue = g.deadline && !done && new Date(g.deadline).getTime() < Date.now();

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="m-0 truncate text-[15px] font-bold">🎯 {g.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">{done && <Pill tone="income">Hoàn thành</Pill>}{overdue && <Pill tone="expense">Quá hạn</Pill>}{g.deadline && <Pill tone="muted">Hạn {fmtDateFull(g.deadline)}</Pill>}</div></div>
        <div className="flex shrink-0 gap-0.5">
          <button type="button" aria-label="Sửa mục tiêu" onClick={onEdit} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-accent-soft hover:text-accent"><Icon name="edit" className="size-4" /></button>
          {confirm ? <button type="button" onClick={() => s.removeGoal(g.id)} onPointerLeave={() => setConfirm(false)} className="animate-pop cursor-pointer rounded-md border-none bg-expense px-2 text-[11px] font-semibold text-white">Xóa?</button>
            : <button type="button" aria-label="Xóa mục tiêu" onClick={() => setConfirm(true)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-expense-soft hover:text-expense"><Icon name="trash" className="size-4" /></button>}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2"><span className="font-mono text-xl font-bold text-income">{fmt(g.saved)}đ</span><span className="font-mono text-xs text-muted">/ {fmt(g.target)}đ</span></div>
      <div className="mt-2"><Progress pct={pct} tone={done ? "income" : "brand"} /></div>
      <div className="mt-1.5 flex justify-between text-xs text-muted"><span>{Math.min(pct, 100).toFixed(0)}%</span>{!done && <span>Còn {fmt(g.target - g.saved)}đ</span>}</div>
      {need !== null && <p className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-xs text-fg-2">Cần tiết kiệm khoảng <b className="font-mono">{fmt(need)}đ</b>/tháng để đạt đúng hạn.</p>}
      {!done && (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = parseInt(add || "0", 10); if (n > 0) { s.saveGoal({ ...g, saved: g.saved + n }); setAdd(""); } }}>
          <input aria-label={`Số tiền nạp thêm cho ${g.name}`} inputMode="numeric" placeholder="Nạp thêm (đ)" value={add ? fmt(+add) : ""} onChange={(e) => setAdd(e.target.value.replace(/\D/g, "").slice(0, 12))} className="input-field !py-2 font-mono text-[13px]" />
          <Button variant="primary" type="submit" disabled={!add}>Nạp</Button>
        </form>
      )}
    </Card>
  );
}

export default function Goals() {
  const { s } = useApp();
  const [modal, setModal] = useState<{ goal: Goal | null } | null>(null);
  const total = s.goals.reduce((a, g) => ({ saved: a.saved + g.saved, target: a.target + g.target }), { saved: 0, target: 0 });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[13px] text-muted">{s.goals.length ? `Đã tiết kiệm ${fmt(total.saved)}đ trên tổng mục tiêu ${fmt(total.target)}đ` : "Đặt mục tiêu để có động lực tiết kiệm đều đặn."}</p>
        <Button variant="primary" onClick={() => setModal({ goal: null })}><Icon name="plus" className="size-4" />Thêm mục tiêu</Button>
      </div>
      {s.goals.length === 0 ? <div className="card"><Empty icon="🎯" title="Chưa có mục tiêu nào" hint="Ví dụ: quỹ khẩn cấp, mua xe, du lịch, mua nhà." /></div> : (
        <div className="grid gap-4 md:grid-cols-2">{s.goals.map((g) => (<GoalCard key={g.id} g={g} onEdit={() => setModal({ goal: g })} />))}</div>
      )}
      {modal && <GoalModal goal={modal.goal} onClose={() => setModal(null)} />}
    </div>
  );
}
