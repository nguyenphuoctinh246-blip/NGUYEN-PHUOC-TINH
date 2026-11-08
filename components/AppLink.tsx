import Link from "next/link";

/** Liên kết nội bộ. Bản xem trước một file thay module này bằng thẻ <a> thường. */
export default function AppLink({ href, className, children, ...rest }: React.ComponentProps<"a"> & { href: string }) {
  return <Link href={href} className={className} {...rest}>{children}</Link>;
}
