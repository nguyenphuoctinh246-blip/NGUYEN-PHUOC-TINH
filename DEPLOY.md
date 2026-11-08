# Hướng dẫn đưa app lên web

Dự án là Next.js 16 (App Router) + Tailwind CSS 4. Có 2 cách đưa lên web miễn phí. **Khuyên dùng Cách A (Vercel)**: ít bước nhất, có sẵn tên miền `.vercel.app`, tự cập nhật mỗi lần bạn push code.

## Bước 0: Chuẩn bị (làm một lần)

1. Cài [Node.js 22](https://nodejs.org) (chọn bản LTS) và [Git](https://git-scm.com/downloads).
2. Giải nén `expense-app.zip` vào một thư mục, mở terminal tại thư mục đó.
3. Chạy thử trên máy:
   ```bash
   npm install
   npm run dev
   ```
   Mở http://localhost:3000. Thấy trang là đúng.
4. Có tài khoản GitHub (https://github.com/signup).

## Bước 1: Đưa code lên GitHub (cần cho cả hai cách)

1. Vào https://github.com/new, đặt tên repo, ví dụ `quan-ly-chi-tieu`, chọn **Public**, **không** tick "Add a README", bấm **Create repository**.
2. Trong terminal tại thư mục dự án (thay `TEN-CUA-BAN` bằng tên GitHub của bạn):
   ```bash
   git init -b main
   git add -A
   git commit -m "Quản lý chi tiêu"
   git remote add origin https://github.com/TEN-CUA-BAN/quan-ly-chi-tieu.git
   git push -u origin main
   ```
   Lần đầu GitHub sẽ yêu cầu đăng nhập. Nếu hỏi mật khẩu, hãy dùng Personal Access Token hoặc đăng nhập bằng trình duyệt.

## Cách A: Vercel (khuyên dùng)

1. Vào https://vercel.com/signup, chọn **Continue with GitHub**.
2. Bấm **Add New… → Project**, chọn repo `quan-ly-chi-tieu`, bấm **Import**.
3. Giữ nguyên mọi mặc định (Vercel tự nhận Next.js). Bấm **Deploy**.
4. Sau khoảng 1 phút bạn nhận được link dạng `https://quan-ly-chi-tieu.vercel.app`.
5. Từ nay mỗi lần `git push` lên `main`, Vercel tự build và cập nhật trang.

Gắn tên miền riêng: **Project → Settings → Domains → Add**, nhập tên miền rồi làm theo hướng dẫn DNS hiển thị.

## Cách B: GitHub Pages (dự án đã có sẵn workflow)

1. Trên GitHub, vào repo → **Settings → Pages**.
2. Mục **Build and deployment → Source**, chọn **GitHub Actions**.
3. Push code lên `main` (hoặc vào tab **Actions → Deploy to GitHub Pages → Run workflow**).
4. Chờ workflow chạy xong (dấu tích xanh, khoảng 1–2 phút). Trang nằm tại `https://TEN-CUA-BAN.github.io/quan-ly-chi-tieu/`.

Workflow ở `.github/workflows/deploy-pages.yml` build bằng `STATIC_EXPORT=1` và tự đặt `BASE_PATH` theo tên repo, nên bạn không cần sửa gì.

## Chạy trên server của riêng bạn (VPS)

```bash
npm ci
npm run build
npm start        # cổng 3000; đặt sau Nginx/Caddy để có HTTPS
```

## Đồng bộ nhiều thiết bị (đăng nhập bằng đường link)

Mặc định dữ liệu chỉ lưu trên từng trình duyệt. Để nhiều thiết bị cùng đăng nhập và dùng chung dữ liệu:

1. Tạo dự án miễn phí tại [supabase.com](https://supabase.com), mở SQL Editor, dán và chạy toàn bộ file `supabase/schema.sql`.
2. Lấy **Project URL** và khóa **anon/publishable** ở Project Settings → API (không dùng khóa service_role/secret).
3. **Cách nhanh (khuyên dùng):** mở `/ung-dung` → mục **Đồng bộ** → dán Project URL và khóa vào ô *Kết nối cơ sở dữ liệu chung* → **Kiểm tra và kết nối**. Ứng dụng tự kiểm tra (khóa đúng chưa, đã chạy schema.sql chưa) và báo lỗi bằng tiếng Việt. Không cần Vercel hay triển khai lại.
   *Cách khác:* trên Vercel → Settings → Environment Variables, thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (xem `.env.example`), rồi **Redeploy**.
4. Tạo tài khoản. Trên điện thoại hoặc máy khác, **quét mã QR** (hoặc mở link) trong khung *Kết nối thiết bị khác vào cùng nguồn dữ liệu*: thiết bị tự nhận cấu hình, bạn chỉ cần đăng nhập và duyệt bằng mã 6 số. Sau khi mọi thiết bị đã vào, nên tắt "Allow new users to sign up" trong Supabase.

5. **Duyệt thiết bị bằng mã:** thiết bị đầu tiên được duyệt tự động và nhận 8 mã khôi phục (hãy lưu lại). Thiết bị mới đăng nhập sẽ hiện mã 6 số và bị chặn cho đến khi một thiết bị đã duyệt nhập mã đó ở Đồng bộ → Thiết bị đã đăng nhập. Việc chặn do chính cơ sở dữ liệu thực hiện (Row Level Security), không chỉ ở giao diện.

Hướng dẫn có hình ảnh: file Word `Huong-dan-dong-bo-nhieu-thiet-bi.docx`.

Kiểm thử:

```bash
npm test                        # logic đồng bộ (máy chủ giả lập trong bộ nhớ)
psql -d <db> -f tests/sql/supabase-stub.sql -f supabase/schema.sql -f tests/sql/devices.test.sql   # RLS + duyệt thiết bị trên Postgres thật
bash tests/e2e/run.sh           # trình duyệt thật: máy tính + điện thoại + máy tính bảng
```

## Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Vercel báo build lỗi | Mở log, thường do thiếu file. Chạy `npm run build` trên máy để thấy lỗi tương tự. |
| GitHub Pages hiện 404 | Kiểm tra Settings → Pages đã chọn **GitHub Actions**, và workflow ở tab Actions đã xanh. |
| Trang mất CSS/JS trên GitHub Pages | Đường dẫn sai base path. Đảm bảo tên repo khớp URL; không tự đổi `BASE_PATH`. |
| Mất dữ liệu giao dịch | Dữ liệu lưu trong trình duyệt (localStorage), mỗi thiết bị và mỗi tên miền có dữ liệu riêng. Đổi tên miền sẽ thấy dữ liệu trống. |

## Lưu ý

- App không có máy chủ hay cơ sở dữ liệu, nên không cần cấu hình biến môi trường hay khóa bí mật.
- Muốn đồng bộ dữ liệu giữa nhiều thiết bị, cần thêm đăng nhập và cơ sở dữ liệu (ví dụ Supabase). Đây là bước phát triển thêm, chưa có trong bản này.
