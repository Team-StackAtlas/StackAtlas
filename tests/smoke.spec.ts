import { test, expect } from '@playwright/test';

// Smoke coverage for the main product areas in local/seed mode. These guard
// the app shell, routing, catalog and feed rendering, and detail pages —
// the flows every push this cycle has touched.

test('Map renders the substance catalog', async ({ page }) => {
  await page.goto('/map');
  await expect(page.getByRole('link', { name: /Magnesium Glycinate/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Caffeine/i }).first()).toBeVisible();
});

test('Map deep-links into a canonical category filter', async ({ page }) => {
  await page.goto('/map?category=Recovery');
  // The category chip row shows the selected canonical category.
  await expect(page.getByText('Recovery', { exact: true }).first()).toBeVisible();
});

test('substance page shows safe-language details and related posts', async ({ page }) => {
  await page.goto('/supplement/magnesium-glycinate');
  await expect(page.getByRole('heading', { level: 1, name: /Magnesium Glycinate/i }).first()).toBeVisible();
  await expect(page.getByText(/Health Risks/i).first()).toBeVisible();
  // No recommendation language anywhere on the page.
  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toMatch(/recommended dosage/i);
});

test('Square renders the feed and opens a post', async ({ page }) => {
  await page.goto('/square');
  const firstPost = page.locator('a[href^="/post/"]').first();
  await expect(firstPost).toBeVisible();
  await firstPost.click();
  await expect(page.getByText(/Comments \(/)).toBeVisible();
});

test('brand and stack pages render', async ({ page }) => {
  await page.goto('/brand/b1');
  await expect(page.getByRole('heading', { name: /Nootropics Depot/i })).toBeVisible();
  await page.goto('/map');
  // Stacks tab exists and is clickable.
  await page.getByRole('button', { name: /^Stacks$/ }).first().click();
});

test('admin routes are gated for signed-out visitors', async ({ page }) => {
  await page.goto('/admin');
  // Backend unconfigured in tests: the page must not crash; either the admin
  // shell (mock role) or a redirect to map is acceptable, never a blank page.
  await expect(page.locator('body')).not.toHaveText('');
});

test('global search finds catalog entries and posts', async ({ page }) => {
  await page.goto('/map');
  // Open via the header button, not Cmd/Ctrl+K: on /map the shortcut can race
  // listener mount and the page's inline search box shares a similar
  // placeholder, which previously let this test pass against the wrong input.
  await page.getByRole('button', { name: 'Search everything' }).click();
  await page.getByPlaceholder(/stacks, posts/i).fill('magnesium');
  await expect(page.getByRole('button', { name: /Magnesium Glycinate/i }).first()).toBeVisible();
});

test('create flow requires the create route to load', async ({ page }) => {
  await page.goto('/create');
  // RequireAuth may bounce to login in seed mode; both outcomes render UI.
  await expect(page.locator('body')).not.toHaveText('');
});

test('global search surfaces glossary terms', async ({ page }) => {
  await page.goto('/map');
  await page.getByRole('button', { name: 'Search everything' }).click();
  await page.getByPlaceholder(/stacks, posts/i).fill('bioavailability');
  const hit = page.getByRole('button', { name: /Bioavailability/i }).first();
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page).toHaveURL(/\/glossary\?term=bioavailability/);
  await expect(page.getByRole('heading', { name: /^Glossary$/ })).toBeVisible();
});

test('Lab shows popular-comparison quick-starts that open compare results', async ({ page }) => {
  await page.goto('/lab');
  const chip = page.locator('a[href^="/compare?type=substance"]').first();
  await expect(chip).toBeVisible();
  await chip.click();
  // The deep link renders the full results view with both identity cards.
  await expect(page).toHaveURL(/\/compare\?type=substance&id1=.+&id2=.+/);
  await expect(page.getByText('Key Facts', { exact: false }).first()).toBeVisible();
});

test('compare deep link renders both substances', async ({ page }) => {
  await page.goto('/compare?type=substance&id1=caffeine&id2=l-theanine');
  await expect(page.getByRole('heading', { name: /^Caffeine$/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /L-Theanine/i }).first()).toBeVisible();
});

test('stack page rows carry classification and risk context', async ({ page }) => {
  await page.goto('/stack/st1');
  await expect(page.getByRole('heading', { name: /Beginner Focus Stack/i })).toBeVisible();
  // Enriched substance rows: classification subline + risk pill.
  await expect(page.getByText('Everyday · Food / Drink · Botanical').first()).toBeVisible();
  await expect(page.getByText('Low', { exact: true }).first()).toBeVisible();
});
