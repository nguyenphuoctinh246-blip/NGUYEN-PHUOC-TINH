import { Logo } from "./Navbar";

export default function Footer() {
  return (
    <footer className="border-t border-line-light py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
        <Logo />
        <p>Theo dõi thu chi cá nhân hằng ngày. Dữ liệu của bạn, ở lại trên thiết bị của bạn.</p>
        <p>© {new Date().getFullYear()} Chi Tiêu</p>
      </div>
    </footer>
  );
}
