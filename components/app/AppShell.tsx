"use client";

import AppLink from "../AppLink";
import Icon from "../Icon";
import ThemeToggle from "../ThemeToggle";
import { Logo } from "../Navbar";
import { Button } from "../ui";
import { AppProvider, useApp, VIEWS } from "./AppContext";
import PeriodBar from "./PeriodBar";
import TxModal from "./TxModal";
import Overview from "../views/Overview";
import Categories from "../views/Categories";
import SyncView from "../views/SyncView";
import SyncPill from "./SyncPill";
import { Modal } from "../ui";
import Transactions from "../views/Transactions";
import Budgets from "../views/Budgets";
import Goals from "../views/Goals";
import Accounts from "../views/Accounts";
import Reports from "../views/Reports";
import DataView from "../views/DataView";

function Shell() {
  const { view, go, s, openTx, txModal, cloud } = useApp();
  const current = VIEWS.find((v) => v.id === view)!;
  const showPeriod = view !== "tai-khoan" && view !== "du-lieu" && view !== "muc-tieu" && view !== "danh-muc" && view !== "dong-bo";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-side-bg px-3 py-5 text-side-fg lg:flex">
        <div className="px-2 pb-6"><AppLink href="/" aria-label="Trang giới thiệu"><Logo light /></AppLink></div>
        <nav aria-label="Chức năng" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {VIEWS.map((v) => {
            const active = v.id === view;
            const c = `color-mix(in srgb, var(--cat-${v.color}) 62%, white)`;
            return (
              <button key={v.id} type="button" onClick={() => go(v.id)} aria-current={active ? "page" : undefined}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-none px-2.5 py-2 text-left text-[14px] font-medium transition-colors ${active ? "bg-white/12 font-semibold text-white" : "bg-transparent text-side-fg hover:bg-white/7 hover:text-white"}`}>
                <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, var(--cat-${v.color}) ${active ? 38 : 22}%, transparent)`, color: c }}>
                  <Icon name={v.icon} className="size-4" />
                </span>
                {v.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-side-line px-1 pt-4">
          <AppLink href="/" className="text-[13px] font-medium text-side-fg hover:text-white">← Trang giới thiệu</AppLink>
          <ThemeToggle onDark />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line-light bg-bg/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <div className="flex w-full items-center justify-between gap-2 lg:hidden">
              <AppLink href="/" aria-label="Trang giới thiệu"><Logo /></AppLink>
              <ThemeToggle />
            </div>
            <h1 className="hidden text-lg font-extrabold tracking-[-0.02em] lg:block">{current.label}</h1>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <SyncPill />
              {showPeriod && <PeriodBar />}
              <Button variant="primary" onClick={() => openTx(null)} className="max-lg:hidden !h-9 !border-0 !bg-gradient-to-r !from-brand-from !to-brand-to"><Icon name="plus" className="size-4" />Thêm giao dịch</Button>
            </div>
          </div>
          <nav aria-label="Chức năng" className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {VIEWS.map((v) => {
              const active = v.id === view;
              return (
                <button key={v.id} type="button" onClick={() => go(v.id)} aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${active ? "border-accent bg-accent text-white" : "border-line bg-surface text-fg-2"}`}>
                  <span style={{ color: active ? "inherit" : `var(--cat-${v.color})` }}><Icon name={v.icon} className="size-3.5" /></span>{v.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
          {!s.ready ? <Skeleton /> : (
            <>
              {s.hasSamples && view !== "du-lieu" && !cloud.user && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-light bg-accent-soft px-3.5 py-2.5 text-[13px] font-medium text-fg-2">
                  <span>📌 Đang hiển thị dữ liệu mẫu. Thêm giao dịch đầu tiên của bạn, dữ liệu mẫu sẽ tự biến mất.</span>
                  <Button onClick={s.clearSamples} className="!py-1 text-xs">Xóa dữ liệu mẫu</Button>
                </div>
              )}
              {view === "tong-quan" && <Overview />}
              {view === "giao-dich" && <Transactions />}
              {view === "ngan-sach" && <Budgets />}
              {view === "muc-tieu" && <Goals />}
              {view === "tai-khoan" && <Accounts />}
              {view === "bao-cao" && <Reports />}
              {view === "danh-muc" && <Categories />}
              {view === "dong-bo" && <SyncView />}
              {view === "du-lieu" && <DataView />}
            </>
          )}
        </main>
      </div>
      <button type="button" onClick={() => openTx(null)} aria-label="Thêm giao dịch"
        className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-12 cursor-pointer items-center gap-2 rounded-full border-none bg-gradient-to-r from-brand-from to-brand-to px-5 text-sm font-semibold text-white shadow-pop lg:hidden">
        <Icon name="plus" className="size-5" />Thêm
      </button>
      {txModal.open && <TxModal />}
      {cloud.choice && (
        <Modal title="Gộp dữ liệu trên máy này?" onClose={() => {}}>
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[14px] leading-relaxed">Máy này đang có <b>{cloud.choice.localTx}</b> giao dịch chưa đồng bộ, còn tài khoản của bạn đã có <b>{cloud.choice.remoteTx}</b> giao dịch.</p>
            <Button variant="primary" onClick={() => void cloud.resolveChoice("merge")}>Gộp cả hai (khuyên dùng)</Button>
            <Button onClick={() => void cloud.resolveChoice("account")}>Chỉ dùng dữ liệu của tài khoản</Button>
            <p className="m-0 text-xs text-muted">Chọn "Chỉ dùng dữ liệu của tài khoản" sẽ bỏ {cloud.choice.localTx} giao dịch đang có trên máy này.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => (<div key={i} className="card h-[108px]" />))}</div>
      <div className="card h-[300px]" />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
