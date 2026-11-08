const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const e=[];
const mk=async(name)=>{const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
 p.on('pageerror',x=>e.push(name+' PAGEERR '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/WebSocket|realtime|ERR_CONNECTION|Failed to load resource/i.test(m.text()))e.push(name+' '+m.text())});return p;};
const A=await mk('A'),B=await mk('B');
const txt=async(p,s)=>(await p.locator(s).first().innerText()).replace(/\s+/g,' ');
const URL='http://localhost:3105/ung-dung';
// ---- A: chưa đăng nhập, có dữ liệu mẫu; thêm 1 giao dịch thật offline-local
await A.goto(URL+'#dong-bo');await A.waitForTimeout(1200);
console.log('A form shown',await A.locator('#auth-email').count(),'pill',await txt(A,'header button:has-text("Chưa đăng nhập")'));
// local real data before sign-up
await A.click('header button:has-text("Thêm giao dịch")');await A.fill('#tx-amount','111000');await A.fill('#tx-payee','Local first');await A.click('[role=dialog] button:has-text("Lưu"):not(:has-text("thêm tiếp"))');await A.waitForTimeout(300);
await A.goto(URL+'#dong-bo');await A.waitForTimeout(500);
// wrong signup validation
await A.click('[role=tab]:has-text("Tạo tài khoản")');await A.fill('#auth-email','a@test.vn');await A.fill('#auth-pw','123');await A.click('form button[type=submit]');console.log('short pw msg:',await txt(A,'[role=alert]'));
await A.fill('#auth-pw','secret1');await A.click('form button[type=submit]');await A.waitForTimeout(2500);
console.log('A signed in?',await A.locator('text=Đang đăng nhập').count(),'status',await txt(A,'header button[title="a@test.vn"]'));
// bad login on B
await B.goto(URL+'#dong-bo');await B.waitForTimeout(1000);await B.fill('#auth-email','a@test.vn');await B.fill('#auth-pw','wrong');await B.click('form button[type=submit]');await B.waitForTimeout(800);console.log('B bad login:',await txt(B,'[role=alert]'));
await B.fill('#auth-pw','secret1');await B.click('form button[type=submit]');await B.waitForTimeout(2500);
console.log('B signed in?',await B.locator('text=Đang đăng nhập').count());
// B sees A's data
await B.click('aside button:has-text("Giao dịch")');await B.waitForTimeout(500);
console.log('B has Local first',await B.getByText('Local first').count(),'samples banner',await B.getByText('dữ liệu mẫu').count());
// B adds a tx
await B.click('header button:has-text("Thêm giao dịch")');await B.fill('#tx-amount','222000');await B.fill('#tx-payee','From B');await B.click('[role=dialog] button:has-text("Lưu"):not(:has-text("thêm tiếp"))');await B.waitForTimeout(1800);
// A reload (realtime not mocked): resume pulls B's tx
await A.reload();await A.waitForTimeout(2500);await A.click('aside button:has-text("Giao dịch")');await A.waitForTimeout(400);
console.log('A has From B',await A.getByText('From B').count(),'and Local first',await A.getByText('Local first').count());
// verify screen
await A.click('aside button:has-text("Đồng bộ")');await A.waitForTimeout(300);await A.click('button:has-text("Kiểm tra ngay")');await A.waitForTimeout(1500);
console.log('verify:',await txt(A,'section:has-text("Kiểm tra dữ liệu")'));
// delete on A, B reload sees
await A.click('aside button:has-text("Giao dịch")');await A.locator('section[aria-label="Danh sách giao dịch"] li:has-text("From B")').click();await A.click('[role=dialog] button:has-text("Xóa giao dịch")');await A.click('[role=dialog] button:has-text("Xác nhận xóa")');await A.waitForTimeout(1800);
await B.reload();await B.waitForTimeout(2500);await B.click('aside button:has-text("Giao dịch")');await B.waitForTimeout(400);
console.log('B after A delete: From B =',await B.getByText('From B').count(),'Local first =',await B.getByText('Local first').count());
// sign out on A clears local
await A.click('aside button:has-text("Đồng bộ")');await A.click('button:has-text("Đăng xuất")');await A.click('button:has-text("Xác nhận đăng xuất")');await A.waitForTimeout(1200);
console.log('A after signout: form',await A.locator('#auth-email').count());
await A.click('aside button:has-text("Giao dịch")');await A.waitForTimeout(300);console.log('A local after signout has Local first =',await A.getByText('Local first').count());
const st=await (await fetch('http://localhost:54321/__state')).json();console.log('server counts',JSON.stringify(st.counts));console.log(st.log.filter(l=>/POST|DELETE/.test(l)).slice(-6).join('\n'));
console.log('ERRORS',e);
await A.goto(URL+'#dong-bo');await A.screenshot({path:process.argv[2]+'/sync-auth.png'});
await b.close()})();
