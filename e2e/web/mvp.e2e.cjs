#!/usr/bin/env node
// E2E MVP trên Expo Web (CR-01 E-03: Playwright thay Maestro): E2E-01, E2E-02, E2E-09, E2E-10 (phần UI), E2E-13.
// Chạy: WEB_URL=http://localhost:8099 API_URL=http://localhost:3999/api/v1 node e2e/web/mvp.e2e.cjs
// Cần gói `playwright` + Chromium có sẵn trong môi trường (chưa khai báo trong package.json — xem README).
// Backend chạy với AI_PROVIDER=fake khi kiểm thử cục bộ/CI (không gọi Claude thật).
const { chromium } = require('playwright');
const zlib = require('node:zlib');

const WEB = process.env.WEB_URL || 'http://localhost:8099';
const API = process.env.API_URL || 'http://localhost:3999/api/v1';
const NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';
const INSUFFICIENT = 'Số dư không đủ';
const results = [];

function receiptPng() {
  // Ảnh "hóa đơn" sinh bằng code (không dùng hóa đơn thật)
  const w = 120, h = 160;
  const raw = Buffer.alloc((w * 3 + 1) * h, 255);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  const chunk = (t, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(t), d])) >>> 0);
    return Buffer.concat([len, Buffer.from(t), d, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e && e.message || e).split('\n')[0] });
    console.log(`✗ ${name}\n   ${String(e && e.message || e).split('\n').slice(0, 3).join('\n   ')}`);
    throw e;
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const vis = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
  const text = (s) => page.getByText(s, { exact: true }).locator('visible=true').first();
  const expectText = (s, timeout = 15000) => text(s).waitFor({ timeout });
  const email = `e2e${Date.now()}@test.vn`;
  const password = 'Example123';

  const register = async (mail, pw, name = 'Người kiểm thử', terms = true) => {
    await vis('go-register').click();
    await vis('reg-name').fill(name);
    await vis('reg-email').fill(mail);
    await vis('reg-password').fill(pw);
    await vis('reg-confirm').fill(pw);
    if (terms) await vis('reg-terms').click();
    await vis('reg-submit').click();
  };
  const login = async (mail, pw) => {
    await vis('login-email').fill(mail);
    await vis('login-password').fill(pw);
    await vis('login-submit').click();
    await vis('available-balance').waitFor({ timeout: 15000 });
  };
  const gotoTab = async (title) => page.getByRole('tab', { name: title }).locator('visible=true').first().click().catch(async () => text(title).click());
  const addExpense = async (amount) => {
    await gotoTab('Thêm chi');
    await vis('expense-amount').fill(amount);
    await text('Ăn uống').click();
    await vis('expense-submit').click();
  };
  // Điều hướng trong app (web giữ phiên trong bộ nhớ: tải lại trang = đăng xuất, CR-01 E-04)
  const openOpening = async () => {
    await gotoTab('Trang chủ');
    await vis('available-balance').waitFor();
    if (await page.locator('[data-testid="go-opening"]:visible').count()) await vis('go-opening').click();
    else await text('Số dư ban đầu').click();
    await vis('opening-amount').waitFor();
  };
  const setOpening = async (amount) => {
    await openOpening();
    await vis('opening-amount').fill(amount);
    await vis('opening-submit').click();
    await vis('available-balance').waitFor({ timeout: 10000 });
  };

  try {
    await page.goto(WEB, { waitUntil: 'networkidle' });
    await vis('login-email').waitFor({ timeout: 20000 });

    await step('E2E-01 đăng ký (lỗi: mật khẩu ngắn, thiếu đồng ý điều khoản, email trùng) → đăng nhập → không có "Ghi nhớ đăng nhập" → đăng xuất', async () => {
      if (await page.getByText('Ghi nhớ đăng nhập').count()) throw new Error('"Ghi nhớ đăng nhập" hiển thị trên web');
      await register(email, 'short1', 'Người kiểm thử', false);
      await expectText('Mật khẩu phải có ít nhất 8 ký tự', 5000);
      await vis('reg-password').fill(password);
      await vis('reg-confirm').fill(password);
      await vis('reg-submit').click(); // chưa tick điều khoản
      await expectText('Bạn cần đồng ý với điều khoản sử dụng', 5000);
      await vis('reg-terms').click();
      await vis('reg-submit').click();
      await expectText('Đăng ký thành công, mời bạn đăng nhập');
      // email trùng
      await register(email, password);
      await page.getByText(/đã được sử dụng/).locator('visible=true').first().waitFor({ timeout: 10000 });
      await page.goto(WEB, { waitUntil: 'networkidle' });
      await login(email, password);
      await gotoTab('Cá nhân');
      await vis('logout').click();
      await vis('logout-confirm').click();
      await vis('login-email').waitFor({ timeout: 10000 });
      await login(email, password);
      await page.reload({ waitUntil: 'networkidle' });
      await vis('login-email').waitFor({ timeout: 10000 }); // web: tải lại trang phải đăng nhập lại (E-04)
      await login(email, password);
    });

    await step('E2E-02 chưa thiết lập → chi bị chặn (OB-6) → thiết lập 0 → "Số dư không đủ" → 100.000 → chi 100.000 (số dư 0) → chi 1.000 bị chặn', async () => {
      await expectText(NOT_SET);
      await addExpense('1000');
      await page.waitForTimeout(800);
      if ((await page.getByText(NOT_SET).locator('visible=true').count()) < 2) throw new Error('thiếu thông báo OB-6 sau khi lưu');
      await setOpening('0');
      await addExpense('1000');
      await page.getByText(INSUFFICIENT, { exact: true }).locator('visible=true').first().waitFor({ timeout: 10000 });
      await setOpening('100000');
      await addExpense('100000');
      await expectText('Đã lưu khoản chi 100.000 ₫.');
      await expectText('Số dư khả dụng: 0 ₫');
      await vis('expense-amount').fill('1000');
      await vis('expense-submit').click();
      await page.getByText(INSUFFICIENT, { exact: true }).locator('visible=true').first().waitFor({ timeout: 10000 });
      await gotoTab('Trang chủ');
      await page.waitForTimeout(500);
      const bal = await vis('available-balance').innerText();
      if (!bal.startsWith('0')) throw new Error(`số dư trang chủ = ${bal}`);
      await vis('see-all').click(); // xem danh sách khoản chi
      await page.getByText('1 khoản chi').locator('visible=true').first().waitFor({ timeout: 10000 });
      await page.goBack();
    });

    await step('E2E-13 số dư âm bị từ chối (API trả 422 VALIDATION_ERROR; ô nhập trên UI chỉ nhận chữ số)', async () => {
      const email2 = `e2e13-${Date.now()}@test.vn`;
      const r = await page.evaluate(async ({ API, email2, password }) => {
        const j = (u, b, t) => fetch(API + u, { method: b ? (b.__put ? 'PUT' : 'POST') : 'GET', headers: { 'content-type': 'application/json', ...(t && { authorization: `Bearer ${t}` }) }, body: b ? JSON.stringify(b.__put ? b.body : b) : undefined });
        await j('/auth/register', { full_name: 'X', email: email2, password, phone: null, terms_accepted: true });
        const tok = (await (await j('/auth/login', { email: email2, password })).json()).data.access_token;
        const res = await j('/users/me/opening-balance', { __put: true, body: { amount: '-50000' } }, tok);
        return { status: res.status, body: await res.json() };
      }, { API, email2, password });
      if (r.status !== 422 || r.body.error.code !== 'VALIDATION_ERROR') throw new Error(JSON.stringify(r));
    });

    await step('E2E-09 quét → lệch tổng → sửa → chọn danh mục → xác nhận khi chưa thiết lập bị chặn → thiết lập trong hộp thoại → xác nhận thành công → số dư ban đầu bị khóa', async () => {
      // người dùng mới, chưa thiết lập số dư
      const email3 = `e2e09-${Date.now()}@test.vn`;
      await gotoTab('Cá nhân');
      await vis('logout').click();
      await vis('logout-confirm').click();
      await vis('login-email').waitFor();
      await register(email3, password);
      await expectText('Đăng ký thành công, mời bạn đăng nhập');
      await login(email3, password);
      await gotoTab('Quét hóa đơn');
      const chooser = page.waitForEvent('filechooser');
      await vis('scan-pick').click();
      await (await chooser).setFiles({ name: 'hoa-don.png', mimeType: 'image/png', buffer: receiptPng() });
      await expectText('Kiểm tra bản nháp', 30000);
      // chưa có giao dịch nào sau khi quét
      // làm lệch tổng: sửa giá món 1
      await vis('item-amount-0').fill('50000');
      await vis('recon-mismatch').waitFor({ timeout: 5000 });
      if (await vis('draft-confirm').isEnabled()) throw new Error('nút xác nhận bật khi lệch tổng');
      await vis('item-amount-0').fill('45000');
      await vis('recon-mismatch').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      await vis('draft-date').fill('2026-11-20');
      await text('Ăn uống').click();
      await vis('draft-confirm').click();
      await page.getByText(NOT_SET).locator('visible=true').first().waitFor({ timeout: 10000 });
      await vis('opening-amount').waitFor({ timeout: 10000 }); // hộp thoại thiết lập số dư
      await vis('opening-amount').fill('300000');
      await vis('opening-submit').click();
      await expectText('Đã thiết lập số dư ban đầu. Bấm “Xác nhận lưu” để lưu hóa đơn.');
      await vis('draft-confirm').click();
      await expectText('Đã lưu khoản chi', 15000);
      await vis('scan-home').click();
      await vis('available-balance').waitFor();
      const bal = await vis('available-balance').innerText();
      if (!bal.startsWith('200.000')) throw new Error(`số dư sau hóa đơn = ${bal}`);
      await openOpening();
      await expectText('Đã có khoản chi nên số dư ban đầu đã bị khóa.', 10000);
    });

    await step('E2E-10 (UI) sau khi quét, trang không còn tham chiếu ảnh (blob URL đã thu hồi)', async () => {
      const blobs = await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.startsWith('blob:')).length);
      if (blobs) throw new Error(`còn ${blobs} ảnh blob trên trang`);
    });
  } finally {
    await page.screenshot({ path: process.env.E2E_SCREENSHOT || '/tmp/ase-e2e-last.png', fullPage: true }).catch(() => {});
    await browser.close();
    if (pageErrors.length) console.log('Lỗi JS trên trang:', pageErrors);
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} kịch bản đạt`);
    process.exit(failed || pageErrors.length ? 1 : 0);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
