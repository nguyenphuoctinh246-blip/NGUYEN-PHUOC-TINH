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
import Transactions from "../views/Transactions";
import Budgets from "../views/Budgets";
import Goals from "../views/Goals";
import Accounts from "../views/Accounts";
import Reports from "../views/Reports";
import DataView from "../views/DataView";

function Shell() {
  const { view, go, s, openTx, txModal } = useApp();
  const current = VIEWS.find((v) => v.id === view)!;
  const showPeriod = view !== "tai-khoan" && view !== "du-lieu" && view !== "muc-tieu";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line-light bg-surface px-3 py-5 lg:flex">
        <div className="px-2 pb-6"><AppLink href="/" aria-label="Trang giới thiệu"><Logo /></AppLink></div>
        <nav aria-label="Chức năng" className="flex flex-1 flex-col gap-0.5">
          {VIEWS.map((v) => {
            const active = v.id === view;
            return (
              <button key={v.id} type="button" onClick={() => go(v.id)} aria-current={active ? "page" : undefined}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-none px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${active ? "bg-accent-soft font-semibold text-accent" : "bg-transparent text-fg-2 hover:bg-surface-alt hover:text-fg"}`}>
                <Icon name={v.icon} className="size-[18px]" />
                {v.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-line-light px-1 pt-4">
          <AppLink href="/" className="text-[13px] font-medium text-muted hover:text-fg">← Trang giới thiệu</AppLink>
          <ThemeToggle />
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
              {showPeriod && <PeriodBar />}
              <Button variant="primary" onClick={() => openTx(null)} className="max-lg:hidden !h-9"><Icon name="plus" className="size-4" />Thêm giao dịch</Button>
            </div>
          </div>
          <nav aria-label="Chức năng" className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {VIEWS.map((v) => {
              const active = v.id === view;
              return (
                <button key={v.id} type="button" onClick={() => go(v.id)} aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${active ? "border-accent bg-accent text-white" : "border-line bg-surface text-fg-2"}`}>
                  <Icon name={v.icon} className="size-3.5" />{v.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
          {!s.ready ? <Skeleton /> : (
            <>
              {s.hasSamples && view !== "du-lieu" && (
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
              {view === "du-lieu" && <DataView />}
            </>
          )}
        </main>
      </div>
      <button type="button" onClick={() => openTx(null)} aria-label="Thêm giao dịch"
        className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 flex h-12 cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-5 text-sm font-semibold text-white shadow-pop lg:hidden">
        <Icon name="plus" className="size-5" />Thêm
      </button>
      {txModal.open && <TxModal />}
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
