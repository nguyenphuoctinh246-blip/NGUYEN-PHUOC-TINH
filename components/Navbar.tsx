"use client";

import { useState } from "react";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import AppLink from "./AppLink";

const LINKS = [
  ["#tinh-nang", "Tính năng"],
  ["#cach-dung", "Cách dùng"],
  ["#hoi-dap", "Hỏi đáp"],
];

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-extrabold tracking-[-0.02em]">
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-accent text-white">
        <Icon name="wallet" className="size-[18px]" />
      </span>
      Chi Tiêu
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line-light bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Điều hướng chính">
        <a href="#" aria-label="Trang chủ"><Logo /></a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-fg-2 transition-colors hover:bg-surface-alt hover:text-fg">
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AppLink href="/ung-dung" className="hidden rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:block">
            Mở ứng dụng
          </AppLink>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Mở menu"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-fg-2 md:hidden"
          >
            <Icon name={open ? "x" : "menu"} className="size-[18px]" />
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-line-light bg-bg px-4 py-2 md:hidden">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-fg-2 hover:bg-surface-alt">
                {label}
              </a>
            </li>
          ))}
          <li className="py-2">
            <AppLink href="/ung-dung" onClick={() => setOpen(false)} className="block rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-white">
              Mở ứng dụng
            </AppLink>
          </li>
        </ul>
      )}
    </header>
  );
}
