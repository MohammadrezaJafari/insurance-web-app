import { expect, test } from '@playwright/test';

test('search leads to a verified profile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('صنعت بیمه');

  await page.getByLabel('جست‌وجو').fill('روشن');
  await page.getByRole('button', { name: 'جست‌وجو', exact: true }).click();
  await expect(page).toHaveURL(/\/search\?.*q=/);

  await page
    .getByRole('link', { name: /نمونه نمایندگی روشن/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/profiles\/demo-roshan$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('نمونه نمایندگی روشن');
  await expect(page.locator('.badge--verified')).toBeVisible();
});

test('pages fit the viewport without horizontal scrolling', async ({ page }) => {
  for (const path of ['/', '/search', '/profiles/demo-roshan', '/verification']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test('profiles are server-rendered for crawlers', async ({ request }) => {
  const html = await (await request.get('/profiles/demo-roshan')).text();
  expect(html).toContain('<title>نمونه نمایندگی روشن');
  expect(html).toContain('نمونه نمایندگی روشن</h1>');

  const missing = await request.get('/profiles/does-not-exist');
  expect(await missing.text()).toContain('noindex');
});

test('sitemap index points to paged profile sitemaps', async ({ request }) => {
  const index = await (await request.get('/sitemap.xml')).text();
  expect(index).toContain('<sitemapindex');
  expect(index).toContain('/sitemaps/profiles-1.xml');

  const profiles = await (await request.get('/sitemaps/profiles-1.xml')).text();
  expect(profiles).toContain('/profiles/demo-roshan');

  expect((await request.get('/sitemaps/profiles-99.xml')).status()).toBe(404);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
});
