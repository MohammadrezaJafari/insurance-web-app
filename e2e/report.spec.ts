import { expect, test } from '@playwright/test';

test('a listed person can ask for their profile to be removed', async ({ page }) => {
  await page.goto('/profiles/demo-roshan');
  await page.getByRole('button', { name: 'گزارش خطا' }).click();

  const dialog = page.locator('.dialog-card');
  await dialog.getByRole('button', { name: 'حذف پروفایل' }).click();
  await expect(dialog.getByRole('heading')).toHaveText('درخواست حذف پروفایل');

  await dialog.getByLabel('نسبت شما با این پروفایل').selectOption('self');
  await dialog
    .getByLabel('توضیح درخواست')
    .fill('این پروفایل متعلق به من است و نمی‌خواهم نمایش داده شود.');
  await dialog.getByLabel('راه تماس برای بررسی ارتباط شما').fill('owner@example.test');
  await dialog.getByRole('button', { name: 'ثبت درخواست حذف' }).click();

  await expect(dialog).toContainText('درخواست حذف ثبت شد');
  // Nothing is hidden until an operator reviews the request.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('نمونه نمایندگی روشن');
});

test('an error report needs the incorrect section', async ({ page }) => {
  await page.goto('/profiles/demo-roshan');
  await page.getByRole('button', { name: 'گزارش خطا' }).click();

  const dialog = page.locator('.dialog-card');
  await dialog.getByLabel('کدام بخش نادرست است؟').selectOption('contact');
  await dialog.getByLabel('شرح خطا و اطلاعات درست').fill('شمارهٔ تلفن دفتر تغییر کرده است.');
  await dialog.getByRole('button', { name: 'ثبت گزارش' }).click();

  await expect(dialog).toContainText('گزارش شما ثبت شد');
});
