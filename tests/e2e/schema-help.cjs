// Kiểm thử: cơ sở dữ liệu chưa chạy schema.sql bản mới -> ứng dụng hướng dẫn cập nhật (sao chép SQL, mở SQL Editor,
// kiểm tra lại) và sau khi cập nhật thì tạo được mã mời. Yêu cầu mock chạy với MOCK_LEGACY=1.
const { chromium } = require('playwright');
const fs = require('fs');

const APP = (process.env.APP_URL || 'http://localhost:3106') + '/ung-dung';
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ✓', m); else { fails++; console.log('  ✗ FAIL:', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 20000, step = 400) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { /* thử lại */ } await sleep(step); } return false; }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (x) => errors.push(x.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|realtime|ERR_CONNECTION|Failed to load resource|40\d/i.test(m.text())) errors.push(m.text()); });
  const body = async () => (await p.locator('body').innerText()).replace(/\s+/g, ' ');

  console.log('1. Cơ sở dữ liệu bản cũ: vào mục Thành viên thấy hướng dẫn cập nhật ngay');
  await p.goto(APP + '#dong-bo'); await sleep(900);
  await p.click('[role=tab]:has-text("Tạo tài khoản")'); await p.fill('#auth-email', 'vo.yeu'); await p.fill('#auth-pw', 'matkhau123'); await p.click('form button[type=submit]');
  await p.waitForSelector('[role=dialog]:has-text("Lưu mã khôi phục")', { timeout: 15000 });
  await p.check('[role=dialog] input[type=checkbox]'); await p.click('[role=dialog] button:has-text("Hoàn tất")'); await sleep(600);
  await p.click('aside button:has-text("Thành viên")'); await sleep(900);
  ok((await body()).includes('Cập nhật cơ sở dữ liệu (làm một lần)'), 'hiện khung hướng dẫn cập nhật cơ sở dữ liệu');
  const href = await p.locator('a:has-text("Mở SQL Editor")').getAttribute('href');
  ok(/^https:\/\/supabase\.com\/dashboard\/project\/localhost\/sql\/new$/.test(href), `nút Mở SQL Editor trỏ đúng dự án (${href})`);

  console.log('2. Sao chép mã SQL một lần bấm');
  await p.click('button:has-text("Sao chép mã SQL")'); await sleep(500);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  const disk = fs.readFileSync(__dirname + '/../../supabase/schema.sql', 'utf8');
  ok(clip === disk, `đã chép đủ ${clip.length} ký tự, giống hệt file supabase/schema.sql`);
  ok(clip.includes('create_invite') && clip.includes("notify pgrst, 'reload schema'"), 'mã SQL có tính năng tài khoản con và lệnh làm mới bộ nhớ đệm API');

  console.log('3. Chưa chạy SQL mà bấm Kiểm tra lại: báo rõ chưa cập nhật');
  await p.click('button:has-text("Kiểm tra lại")'); await sleep(900);
  ok((await body()).includes('Chưa thấy bản mới'), 'báo "Chưa thấy bản mới" thay vì lỗi khó hiểu');
  await p.fill('#inv-name', 'Vợ yêu'); await p.click('button:has-text("Tạo mã mời")'); await sleep(900);
  ok((await body()).includes('Cập nhật cơ sở dữ liệu (làm một lần)') && (await p.locator('[role=status] [aria-label^="Mã mời"]').count()) === 0, 'tạo mã mời khi chưa cập nhật: không có mã, vẫn hiện hướng dẫn');

  console.log('4. Sau khi chạy SQL (giả lập) bấm Kiểm tra lại: dùng được ngay');
  await fetch('http://localhost:54321/__legacy?on=0');
  await p.click('button:has-text("Kiểm tra lại")');
  ok(await until(async () => !(await body()).includes('Cập nhật cơ sở dữ liệu (làm một lần)'), 8000), 'khung hướng dẫn biến mất sau khi cơ sở dữ liệu đã cập nhật');
  await p.fill('#inv-name', 'Vợ yêu'); await p.click('button:has-text("Tạo mã mời")');
  ok(await until(async () => (await p.locator('[role=status] [aria-label^="Mã mời"]').count()) > 0, 8000), 'tạo được mã mời cho "Vợ yêu"');
  const code = (await p.locator('[role=status] [aria-label^="Mã mời"]').first().innerText()).trim();
  ok(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(code), `mã mời hợp lệ (${code})`);

  console.log('\nLỗi console/trang:', errors.length ? errors : 'không có');
  ok(errors.length === 0, 'không có lỗi JavaScript');
  await b.close();
  console.log(fails ? `\n${fails} kiểm thử THẤT BẠI` : '\nTất cả kiểm thử hướng dẫn cập nhật đạt');
  process.exit(fails ? 1 : 0);
})();
