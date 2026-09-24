import { expect, test, type Page } from '@playwright/test';

// Demo accounts exist only in the throwaway e2e database (see backend DemoMarketplaceSeeder).
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-password-123';

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/account');
  await page.getByLabel('ایمیل').fill(email);
  await page.getByLabel('رمز عبور').fill(password);
  await page.locator('form').getByRole('button', { name: 'ورود' }).click();
  await expect(page.getByRole('link', { name: 'ورود' })).toHaveCount(0);
}

test('a new buyer registers and submits a liability request', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('tab', { name: 'ثبت‌نام' }).click();
  await page.getByLabel('نام و نام خانوادگی').fill('خریدار آزمون');
  await page.getByLabel('ایمیل').fill(`buyer-${Date.now()}@e2e.test`);
  await page.getByLabel('رمز عبور').fill('e2e-password-1234');
  await page.getByRole('button', { name: 'ایجاد حساب' }).click();
  await expect(page.getByRole('link', { name: 'ورود' })).toHaveCount(0);

  await page.goto('/requests/new?type=liability');
  await page.getByLabel('عنوان درخواست').fill('بیمه مسئولیت کارفرما برای کارگاه آزمون');
  await page.getByLabel(/نوع مسئولیت/).selectOption('کارفرما در قبال کارکنان');
  await page.getByLabel(/نوع فعالیت کسب‌وکار/).fill('تولید قطعات');
  await page.getByLabel(/تعداد کارکنان/).fill('25');
  await page.getByLabel(/استان/).selectOption('تهران');
  await page.getByLabel(/سقف تعهد مورد نیاز/).fill('20000000000');
  await page.getByRole('button', { name: /ارسال برای بررسی/ }).click();

  await expect(page).toHaveURL(/\/requests\/[a-z0-9]+$/);
  await expect(page.getByText('در انتظار بررسی اپراتور').first()).toBeVisible();
});

test('the demo buyer compares the proposal received', async ({ page }) => {
  await signIn(page, 'buyer@demo.test', DEMO_PASSWORD);

  await page.goto('/requests');
  await page.getByRole('link', { name: /بیمه مسئولیت کارفرما برای کارگاه تولید قطعات/ }).click();
  await expect(page.getByText('نمونه شرکت بیمه سپهر').first()).toBeVisible();
});

test('pages behind sign-in redirect anonymous visitors to the account page', async ({ page }) => {
  await page.goto('/requests');
  await expect(page).toHaveURL(/\/account\?redirect=(%2F|\/)requests$/);
});
