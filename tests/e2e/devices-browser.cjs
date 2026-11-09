// Kiểm thử trình duyệt thật: duyệt thiết bị bằng mã + đồng bộ giữa máy tính và điện thoại.
// Yêu cầu: mock-supabase.cjs đang chạy (cổng 54321) và ứng dụng build với
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test  đang chạy ở APP_URL.
const { chromium, devices } = require('playwright');

const APP = (process.env.APP_URL || 'http://localhost:3106') + '/ung-dung';
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
    p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|realtime|ERR_CONNECTION|Failed to load resource|403|400/i.test(m.text())) errors.push(`${name}: ${m.text()}`); });
    return p;
  };
  const D = await open('Máy tính', { viewport: { width: 1280, height: 900 } });
  const P = await open('Điện thoại', { ...devices['iPhone 13'] });
  const T = await open('Máy tính bảng', { viewport: { width: 900, height: 900 }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Tab) Chrome/120 Safari/537.36' });
  const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const goto = async (p, v) => { await p.goto(`${APP}#${v}`); await sleep(700); };
  const nav = async (p, label) => { const vp = p.viewportSize().width; await p.click(vp >= 1024 ? `aside button:has-text("${label}")` : `header nav button:has-text("${label}")`); await sleep(300); };
  const add = async (p, amount, payee) => {
    await p.click(p.viewportSize().width >= 1024 ? 'header button:has-text("Thêm giao dịch")' : 'button[aria-label="Thêm giao dịch"]');
    await p.fill('#tx-amount', String(amount)); await p.fill('#tx-payee', payee);
    await p.click('[role=dialog] button:has-text("Lưu"):not(:has-text("thêm tiếp"))'); await sleep(400);
  };

  console.log('1. Máy tính: tạo tài khoản, là thiết bị đầu tiên nên được duyệt tự động');
  await goto(D, 'dong-bo');
  await D.click('[role=tab]:has-text("Tạo tài khoản")'); await D.fill('#auth-email', 'chu@email.com'); await D.fill('#auth-pw', 'matkhau123'); await D.click('form button[type=submit]');
  ok(await until(async () => (await D.locator('[role=dialog]:has-text("Lưu mã khôi phục")').count()) > 0, 15000), 'hiện hộp thoại mã khôi phục sau khi tạo tài khoản');
  const codes = (await D.locator('[role=dialog] li').allInnerTexts()).map((x) => x.trim());
  ok(codes.length === 8 && codes.every((c) => /^[0-9a-f]{4}-[0-9a-f]{4}$/.test(c)), '8 mã khôi phục đúng định dạng');
  ok(await D.locator('[role=dialog] button:has-text("Hoàn tất")').isDisabled(), 'chưa tick "đã lưu" thì chưa đóng được');
  await D.check('[role=dialog] input[type=checkbox]'); await D.click('[role=dialog] button:has-text("Hoàn tất")'); await sleep(500);
  await nav(D, 'Giao dịch'); await add(D, 150000, 'Từ máy tính');
  await sleep(1200);
  ok((await body(D)).includes('Từ máy tính'), 'máy tính nhập được giao dịch');

  console.log('2. Điện thoại: đăng nhập cùng email nhưng bị chặn, phải chờ xác nhận');
  await goto(P, 'dong-bo');
  await P.fill('#auth-email', 'chu@email.com'); await P.fill('#auth-pw', 'sai-mat-khau'); await P.click('form button[type=submit]'); await sleep(800);
  ok((await body(P)).includes('Sai tên đăng nhập (hoặc email) hoặc mật khẩu'), 'sai mật khẩu bị từ chối');
  await P.fill('#auth-pw', 'matkhau123'); await P.click('form button[type=submit]');
  ok(await until(async () => (await P.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) > 0, 15000), 'điện thoại bị chặn bởi màn hình xác nhận');
  const code = (await P.locator('[aria-label^="Mã xác nhận"]').first().innerText()).replace(/\D/g, '');
  ok(/^\d{6}$/.test(code), `điện thoại hiện mã 6 số (${code})`);
  ok(await P.locator('button[aria-label="Thêm giao dịch"]').count() === 0, 'điện thoại chưa có nút thêm giao dịch');
  ok(!(await body(P)).includes('Từ máy tính'), 'điện thoại chưa thấy dữ liệu');

  console.log('3. Máy tính nhận yêu cầu, nhập sai rồi nhập đúng mã');
  ok(await until(async () => (await body(D)).includes('đang xin vào'), 15000), 'máy tính hiện thông báo có thiết bị xin vào');
  await nav(D, 'Đồng bộ');
  ok((await body(D)).includes('Thiết bị đã đăng nhập') && (await body(D)).includes('Safari trên iPhone'), 'danh sách thiết bị hiện "Safari trên iPhone"');
  const wrong = code === '123456' ? '654321' : '123456';
  await D.fill('input[placeholder="Nhập 6 số"]', wrong); await D.click('li button[type=submit]:has-text("Duyệt")'); await sleep(700);
  const t3 = await body(D); if (!t3.includes('Mã không đúng. Còn 4 lần thử')) console.log('   [debug]', t3.slice(t3.indexOf('Thiết bị đã đăng nhập'), t3.indexOf('Thiết bị đã đăng nhập') + 500));
  ok(t3.includes('Mã không đúng. Còn 4 lần thử'), 'nhập sai mã: báo còn 4 lần');
  ok((await body(P)).includes('Thiết bị này cần được xác nhận'), 'điện thoại vẫn bị chặn sau khi nhập sai');
  await D.fill('input[placeholder="Nhập 6 số"]', code); await D.click('li button[type=submit]:has-text("Duyệt")'); await sleep(700);
  ok((await body(D)).includes('Đã cho phép thiết bị'), 'nhập đúng mã: máy tính duyệt thành công');

  console.log('4. Điện thoại được vào, thấy dữ liệu từ máy tính, nhập dữ liệu mới');
  ok(await until(async () => (await P.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) === 0, 12000), 'điện thoại tự mở sau khi được duyệt');
  await nav(P, 'Giao dịch');
  ok(await until(async () => (await body(P)).includes('Từ máy tính'), 10000), 'điện thoại thấy giao dịch nhập từ máy tính');
  await add(P, 70000, 'Từ điện thoại');
  await sleep(1500);

  console.log('5. Máy tính nhận dữ liệu nhập từ điện thoại (không cần tải lại trang)');
  await nav(D, 'Giao dịch');
  ok(await until(async () => (await body(D)).includes('Từ điện thoại'), 25000, 1000), 'máy tính tự thấy giao dịch từ điện thoại');
  await nav(D, 'Đồng bộ'); await D.click('button:has-text("Kiểm tra ngay")'); await sleep(1500);
  const chk = await body(D);
  ok(chk.includes('khớp hoàn toàn') && !chk.includes('Lệch'), 'kiểm tra dữ liệu: khớp hoàn toàn');

  console.log('5b. Chẩn đoán: hai máy cùng máy chủ và cùng mã tài khoản');
  await nav(P, 'Đồng bộ'); await sleep(600);
  const field = async (p, label) => (await p.locator(`dt:has-text("${label}") + dd`).first().innerText()).trim();
  const dAcc = await field(D, 'Tài khoản'), pAcc = await field(P, 'Tài khoản');
  const dHost = await field(D, 'Máy chủ'), pHost = await field(P, 'Máy chủ');
  ok(dAcc === pAcc && /mã [0-9a-f]{6}/.test(dAcc), `mã tài khoản hai máy giống nhau (${dAcc})`);
  ok(dHost === pHost, `hai máy cùng máy chủ (${dHost})`);
  ok((await field(P, 'Thiết bị')).includes('đã được duyệt'), 'điện thoại báo thiết bị đã được duyệt');
  console.log('5c. Nhập trên máy tính, điện thoại tự thấy trong vài giây (không bấm gì)');
  await nav(D, 'Giao dịch'); await add(D, 33000, 'Chiều ngược lại');
  await nav(P, 'Giao dịch');
  ok(await until(async () => (await body(P)).includes('Chiều ngược lại'), 15000, 500), 'điện thoại tự thấy giao dịch mới của máy tính trong vài giây');
  console.log('6. Máy tính bảng dùng mã khôi phục thay vì mã duyệt');
  await goto(T, 'dong-bo');
  await T.fill('#auth-email', 'chu@email.com'); await T.fill('#auth-pw', 'matkhau123'); await T.click('form button[type=submit]');
  ok(await until(async () => (await T.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) > 0, 15000), 'máy tính bảng bị chặn chờ xác nhận');
  await T.click('button:has-text("Dùng mã khôi phục")'); await T.fill('#recovery-code', '0000-0000'); await T.click('button:has-text("Xác nhận bằng mã khôi phục")'); await sleep(700);
  ok((await body(T)).includes('Mã khôi phục không đúng. Còn 4 lần thử'), 'mã khôi phục sai bị từ chối');
  await T.fill('#recovery-code', codes[0]); await T.click('button:has-text("Xác nhận bằng mã khôi phục")');
  ok(await until(async () => (await T.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) === 0, 12000), 'mã khôi phục đúng: máy tính bảng được vào');
  await nav(T, 'Giao dịch');
  ok(await until(async () => (await body(T)).includes('Từ điện thoại'), 10000), 'máy tính bảng thấy đủ dữ liệu');

  console.log('7. Máy tính thu hồi điện thoại: điện thoại mất quyền và bị xóa dữ liệu trên máy');
  await nav(D, 'Đồng bộ'); await sleep(500);
  await D.locator('li:has-text("Safari trên iPhone") button:has-text("Thu hồi")').click(); await D.click('button:has-text("Xác nhận thu hồi")'); await sleep(800);
  ok(!(await body(D)).includes('Safari trên iPhone'), 'điện thoại biến mất khỏi danh sách thiết bị');
  ok(await until(async () => (await P.locator('h2:has-text("Thiết bị này cần được xác nhận")').count()) > 0, 25000, 1000), 'điện thoại bị đưa về màn hình chờ xác nhận');
  ok(!(await body(P)).includes('Từ máy tính'), 'điện thoại không còn hiển thị dữ liệu');

  console.log('\nLỗi console/trang:', errors.length ? errors : 'không có');
  ok(errors.length === 0, 'không có lỗi JavaScript');
  await b.close();
  console.log(fails ? `\n${fails} kiểm thử THẤT BẠI` : '\nTất cả kiểm thử trình duyệt đạt');
  process.exit(fails ? 1 : 0);
})();
