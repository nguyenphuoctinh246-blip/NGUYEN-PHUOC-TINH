// Kiểm thử trình duyệt thật: nhập cấu hình ngay trong ứng dụng (không cần biến môi trường),
// chia sẻ link/QR sang điện thoại, rồi duyệt thiết bị bằng mã. Ứng dụng build KHÔNG có biến Supabase.
const { chromium, devices } = require('playwright');
const http = require('http');
// Máy chủ giả trả về trang web HTML (như khi dán nhầm địa chỉ mẫu hoặc trang quản lý)
const htmlServer = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }); r.end('<!DOCTYPE html><html><body>Not Supabase</body></html>'); }).listen(54400);

const APP = (process.env.APP_URL || 'http://localhost:3107') + '/ung-dung';
const MOCK = 'http://localhost:54321';
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗ FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 20000, step = 400) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { /* thử lại */ } await sleep(step); } return false; }

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const open = async (name, opts) => {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', (x) => errors.push(`${name}: ${x.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|realtime|ERR_CONNECTION|Failed to load resource|40\d/i.test(m.text())) errors.push(`${name}: ${m.text()}`); });
    return p;
  };
  const D = await open('Máy tính', { viewport: { width: 1280, height: 900 } });
  const P = await open('Điện thoại', { ...devices['iPhone 13'] });
  const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

  console.log('1. Chưa cấu hình: hiện form kết nối (không có biến môi trường)');
  await D.goto(APP + '#dong-bo'); await sleep(900);
  ok(await D.locator('#cfg-url').count() === 1, 'hiện form nhập Project URL và khóa');
  ok((await body(D)).includes('lưu trên máy này'), 'giải thích rõ đang ở chế độ lưu trên máy này');
  await D.goto(APP + '#tong-quan'); await sleep(700);
  ok((await body(D)).includes('Dữ liệu chỉ lưu trên thiết bị này'), 'các trang khác hiện cảnh báo dữ liệu chỉ lưu trên máy này');
  await D.goto(APP + '#dong-bo'); await sleep(700);

  console.log('2. Báo lỗi dễ hiểu khi nhập sai');
  await D.fill('#cfg-url', 'khong-phai-dia-chi'); await D.fill('#cfg-key', 'x'); await D.click('button:has-text("Kiểm tra và kết nối")'); await sleep(1200);
  ok((await body(D)).includes('Nhập đủ Project URL'), 'địa chỉ không hợp lệ: nhắc nhập đúng Project URL');
  await D.fill('#cfg-url', 'http://localhost:54400'); await D.fill('#cfg-key', 'test-anon-key'); await D.click('button:has-text("Kiểm tra và kết nối")'); await sleep(1200);
  ok((await body(D)).includes('không trả lời như một dự án Supabase'), 'địa chỉ trả về trang web HTML: báo không phải Supabase (đúng lỗi bạn gặp)');
  await D.fill('#cfg-url', 'https://supabase.com/dashboard/project/abc'); await D.click('button:has-text("Kiểm tra và kết nối")'); await sleep(600);
  ok((await body(D)).includes('địa chỉ một trang web'), 'dán địa chỉ trang quản lý supabase.com: bị từ chối');
  await D.fill('#cfg-url', MOCK); await D.fill('#cfg-key', 'sai-khoa'); await D.click('button:has-text("Kiểm tra và kết nối")'); await sleep(1200);
  ok((await body(D)).includes('Khóa không đúng'), 'khóa sai: báo "Khóa không đúng"');
  await D.fill('#cfg-key', 'service_role-abc'); await D.click('button:has-text("Kiểm tra và kết nối")'); await sleep(600);
  ok((await body(D)).includes('khóa bí mật'), 'khóa service_role bị từ chối vì là khóa bí mật');

  console.log('3. Nhập đúng: tự kết nối và hiện form đăng nhập + link/QR chia sẻ');
  await D.fill('#cfg-key', 'test-anon-key'); await D.click('button:has-text("Kiểm tra và kết nối")');
  ok(await until(async () => (await D.locator('#auth-email').count()) > 0, 15000), 'sau khi kiểm tra đạt, ứng dụng tự chuyển sang form đăng nhập');
  ok(await until(async () => (await D.locator('img[alt^="Mã QR"]').count()) > 0, 8000), 'hiện mã QR kết nối thiết bị khác');
  const link = await D.locator('input[aria-label="Đường link kết nối"]').inputValue();
  ok(link.includes('#ket-noi='), 'có đường link kết nối');
  ok(!link.includes('matkhau'), 'link không chứa mật khẩu');

  console.log('4. Điện thoại mở link: tự nhận cấu hình, không phải nhập gì');
  await P.goto(link); await sleep(1200);
  ok((await body(P)).includes('Kết nối ứng dụng tới cơ sở dữ liệu này?') && (await body(P)).includes('localhost:54321'), 'điện thoại hỏi xác nhận và hiện rõ máy chủ sẽ kết nối (chống link giả mạo)');
  await P.click('[role=dialog] button:has-text("Hủy")'); await sleep(500);
  ok(await P.locator('#cfg-url').count() === 1, 'bấm Hủy: không kết nối, vẫn ở form nhập thủ công');
  await P.goto(link); await sleep(1200); await P.click('[role=dialog] button:has-text("Đúng, kết nối")'); await sleep(1800);
  ok(await P.locator('#auth-email').count() === 1, 'bấm xác nhận: điện thoại hiện form đăng nhập (đã tự kết nối)');
  ok(!(await P.evaluate(() => location.hash)).includes('ket-noi'), 'đã xóa cấu hình khỏi thanh địa chỉ');
  console.log('4b. Kiểm tra kết nối ngay cạnh form đăng nhập');
  await P.click('button:has-text("Kiểm tra kết nối")'); await sleep(1500);
  ok((await body(P)).includes('Kết nối được dự án Supabase'), 'nút Kiểm tra kết nối báo kết nối tốt');

  console.log('5. Tạo tài khoản trên máy tính, duyệt điện thoại bằng mã, dữ liệu dùng chung');
  await D.click('[role=tab]:has-text("Tạo tài khoản")'); await D.fill('#auth-email', 'qc@email.com'); await D.fill('#auth-pw', 'matkhau123'); await D.click('form button[type=submit]');
  ok(await until(async () => (await D.locator('[role=dialog]:has-text("Lưu mã khôi phục")').count()) > 0, 15000), 'máy tính tạo tài khoản, nhận mã khôi phục');
  await D.check('[role=dialog] input[type=checkbox]'); await D.click('[role=dialog] button:has-text("Hoàn tất")'); await sleep(400);
  await D.click('aside button:has-text("Giao dịch")'); await D.click('header button:has-text("Thêm giao dịch")');
  await D.fill('#tx-amount', '99000'); await D.fill('#tx-payee', 'Dùng chung'); await D.click('[role=dialog] button:has-text("Lưu"):not(:has-text("thêm tiếp"))'); await sleep(1500);
  await P.fill('#auth-email', 'qc@email.com'); await P.fill('#auth-pw', 'matkhau123'); await P.click('form button[type=submit]');
  ok(await until(async () => (await P.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) > 0, 15000), 'điện thoại bị chặn chờ mã');
  const code = (await P.locator('[aria-label^="Mã xác nhận"]').first().innerText()).replace(/\D/g, '');
  ok(await until(async () => (await body(D)).includes('đang xin vào'), 15000), 'máy tính nhận thông báo');
  await D.click('aside button:has-text("Đồng bộ")'); await sleep(500);
  await D.fill('input[placeholder="Nhập 6 số"]', code); await D.click('li button[type=submit]:has-text("Duyệt")');
  ok(await until(async () => (await P.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) === 0, 12000), 'điện thoại được vào sau khi nhập mã');
  await P.click('header nav button:has-text("Giao dịch")');
  ok(await until(async () => (await body(P)).includes('Dùng chung'), 10000), 'điện thoại thấy giao dịch nhập từ máy tính (cùng một nguồn dữ liệu)');

  console.log('\nLỗi console/trang:', errors.length ? errors : 'không có');
  ok(errors.length === 0, 'không có lỗi JavaScript');
  await b.close(); htmlServer.close();
  console.log(fails ? `\n${fails} kiểm thử THẤT BẠI` : '\nTất cả kiểm thử kết nối nhanh đạt');
  process.exit(fails ? 1 : 0);
})();
