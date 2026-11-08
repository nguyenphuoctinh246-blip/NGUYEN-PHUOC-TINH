// Thay next/link trong bản xem trước một file: dùng điều hướng bằng #hash.
const MAP: Record<string, string> = { "/ung-dung": "#tong-quan", "/": "#" };

export default function Link({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) {
  return <a href={MAP[href] ?? href} {...rest}>{children}</a>;
}
