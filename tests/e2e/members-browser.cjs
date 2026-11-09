// Kiểm thử trình duyệt thật: tên đăng nhập (không cần email) + tài khoản con dùng mã mời,
// máy chủ ghi nhận người nhập, chủ xem được, phân quyền xem, gỡ thành viên.
const { chromium, devices } = require('playwright');

const APP = (process.env.APP_URL || 'http://localhost:3106') + '/ung-dung';
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗ FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 25000, step = 500) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { /* thử lại */ } await sleep(step); } return false; }

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
  const O = await open('Chủ (máy tính)', { viewport: { width: 1280, height: 900 } });
  const M = await open('Tài khoản con (điện thoại)', { ...devices['iPhone 13'] });
  const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const nav = async (p, label) => { const vp = p.viewportSize().width; await p.click(vp >= 1024 ? `aside button:has-text("${label}")` : `header nav button:has-text("${label}")`); await sleep(350); };
  const add = async (p, amount, payee) => {
    await p.click(p.viewportSize().width >= 1024 ? 'header button:has-text("Thêm giao dịch")' : 'button[aria-label="Thêm giao dịch"]');
    await p.fill('#tx-amount', String(amount)); await p.fill('#tx-payee', payee);
    await p.click('[role=dialog] button:has-text("Lưu"):not(:has-text("thêm tiếp"))'); await sleep(500);
  };
  const navLabels = async (p) => (await p.locator(p.viewportSize().width >= 1024 ? 'aside nav button' : 'header nav button').allInnerTexts()).map((x) => x.trim());

  console.log('1. Chủ tạo tài khoản bằng TÊN ĐĂNG NHẬP (không cần Gmail)');
  await O.goto(APP + '#dong-bo'); await sleep(900);
  await O.click('[role=tab]:has-text("Tạo tài khoản")');
  await O.fill('#auth-email', 'ab'); await O.fill('#auth-pw', 'matkhau123'); await O.click('form button[type=submit]'); await sleep(400);
  ok((await body(O)).includes('3 đến 30 ký tự'), 'tên đăng nhập quá ngắn bị nhắc quy tắc');
  await O.fill('#auth-email', 'Chủ Nhà'); await sleep(200);
  ok((await body(O)).includes('Tên đăng nhập sẽ là: chu.nha'), 'tên có dấu và khoảng trắng được chuẩn hóa thành chu.nha');
  await O.click('form button[type=submit]');
  ok(await until(async () => (await O.locator('[role=dialog]:has-text("Lưu mã khôi phục")').count()) > 0, 15000), 'tạo tài khoản thành công không cần email, nhận mã khôi phục');
  await O.check('[role=dialog] input[type=checkbox]'); await O.click('[role=dialog] button:has-text("Hoàn tất")'); await sleep(500);
  ok((await body(O)).includes('chu.nha'), 'ứng dụng hiện tên đăng nhập chu.nha (không hiện địa chỉ nội bộ)');
  ok(!(await body(O)).includes('@chitieu.local'), 'không lộ địa chỉ email nội bộ ra giao diện');
  await nav(O, 'Giao dịch'); await add(O, 100000, 'Của chủ'); await sleep(1500);

  console.log('2. Chủ tạo mã mời cho "Bé An" (chỉ xem phần mình nhập)');
  ok((await navLabels(O)).some((x) => x.includes('Thành viên')), 'chủ có mục Thành viên');
  await nav(O, 'Thành viên'); await sleep(400);
  await O.fill('#inv-name', 'Bé An'); await O.click('button:has-text("Tạo mã mời")');
  ok(await until(async () => (await O.locator('[role=status] [aria-label^="Mã mời"]').count()) > 0, 8000), 'hiện mã mời');
  const inviteCode = (await O.locator('[role=status] [aria-label^="Mã mời"]').first().innerText()).trim();
  ok(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(inviteCode), `mã mời đúng định dạng (${inviteCode})`);

  console.log('3. Người nhà đăng ký tài khoản con bằng mã mời (tên đăng nhập, không email)');
  await M.goto(APP + '#dong-bo'); await sleep(900);
  await M.click('[role=tab]:has-text("Có mã mời")');
  await M.fill('#auth-code', 'ZZZZ-9999'); await M.fill('#auth-email', 'Bé An'); await M.fill('#auth-pw', 'matkhau123'); await M.click('form button[type=submit]');
  ok(await until(async () => (await body(M)).includes('chưa tham gia được') && (await body(M)).includes('Mã mời không đúng'), 12000), 'mã sai: báo lỗi rõ ràng bằng tiếng Việt');
  // tài khoản be.an đã tạo; dùng mã đúng ở mục Thành viên của chính tài khoản này
  await sleep(800);
  ok(await until(async () => (await M.locator('[role=dialog]:has-text("Lưu mã khôi phục")').count()) > 0, 12000), 'tài khoản mới là thiết bị đầu tiên nên vào được ngay (nhận mã khôi phục)');
  await M.check('[role=dialog] input[type=checkbox]'); await M.click('[role=dialog] button:has-text("Hoàn tất")'); await sleep(400);
  await nav(M, 'Thành viên').catch(() => {});
  // dùng mã đúng
  await M.goto(APP + '#thanh-vien'); await sleep(1200);
  await M.fill('input[aria-label="Mã mời nhận được"]', inviteCode); await M.click('button:has-text("Tham gia")');
  ok(await until(async () => (await navLabels(M)).length === 3, 20000), 'nhập mã đúng: chuyển thành tài khoản con, menu chỉ còn 3 mục');
  const labels = await navLabels(M);
  ok(labels.some((x) => x.includes('Giao dịch')) && !labels.some((x) => /Danh mục|Ngân sách|Thành viên|Tài khoản|Dữ liệu|Mục tiêu/.test(x)), `tài khoản con chỉ thấy: ${labels.join(', ')}`);

  console.log('4. Tài khoản con nhập số liệu: chủ thấy kèm tên người nhập');
  await nav(M, 'Giao dịch');
  ok(!(await body(M)).includes('Của chủ'), 'tài khoản con (chỉ phần mình nhập) không thấy giao dịch của chủ');
  await add(M, 45000, 'Của bé An'); await sleep(1500);
  await nav(O, 'Giao dịch');
  ok(await until(async () => (await body(O)).includes('Của bé An'), 25000), 'chủ tự thấy giao dịch do tài khoản con nhập (không cần tải lại)');
  ok(await until(async () => (await body(O)).includes('👤 Bé An'), 15000), 'máy chủ ghi nhận đúng người nhập: Bé An');
  ok((await body(O)).includes('👤 Bạn'), 'giao dịch của chủ ghi "Bạn"');
  await O.click('section[aria-label="Danh sách giao dịch"] li:has-text("Của bé An")'); await sleep(500);
  ok((await body(O)).includes('nhập bởi Bé An'), 'chi tiết giao dịch ghi "nhập bởi Bé An" kèm thời điểm máy chủ ghi nhận');
  await O.click('[role=dialog] button:has-text("Hủy")').catch(async () => { await O.keyboard.press('Escape'); }); await sleep(300);
  await O.keyboard.press('Escape').catch(() => {});

  console.log('5. Phân quyền xem: chủ cho phép xem tất cả');
  await nav(O, 'Thành viên'); await sleep(500);
  ok((await body(O)).includes('Bé An') && (await body(O)).includes('đã nhập 1 giao dịch'), 'danh sách thành viên hiện Bé An đã nhập 1 giao dịch');
  await O.locator('li:has-text("Bé An") input[type=checkbox]').check(); await sleep(800);
  await nav(M, 'Tổng quan'); await nav(M, 'Giao dịch');
  ok(await until(async () => (await body(M)).includes('Của chủ'), 25000), 'được cấp quyền xem tất cả: tài khoản con thấy giao dịch của chủ');
  await M.locator('section[aria-label="Danh sách giao dịch"] li:has-text("Của chủ")').click(); await sleep(500);
  ok(await M.locator('[role=dialog]').count() === 0, 'tài khoản con KHÔNG mở sửa được giao dịch của chủ');

  console.log('6. Chủ gỡ tài khoản con: mất quyền ngay');
  await nav(O, 'Thành viên');
  await O.click('button:has-text("Gỡ khỏi nhóm")'); await O.click('button:has-text("Xác nhận gỡ")'); await sleep(800);
  ok(await until(async () => !(await body(M)).includes('Của chủ') && (await navLabels(M)).length > 3, 30000), 'tài khoản con bị gỡ: mất dữ liệu của chủ và quay về tài khoản riêng');
  await nav(O, 'Giao dịch');
  ok((await body(O)).includes('Của bé An'), 'dữ liệu Bé An đã nhập vẫn còn trong kho của chủ');

  console.log('\nLỗi console/trang:', errors.length ? errors : 'không có');
  ok(errors.length === 0, 'không có lỗi JavaScript');
  await b.close();
  console.log(fails ? `\n${fails} kiểm thử THẤT BẠI` : '\nTất cả kiểm thử tài khoản con đạt');
  process.exit(fails ? 1 : 0);
})();
