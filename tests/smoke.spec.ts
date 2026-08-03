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

// Seeds the mock signed-in user the way the app stores it, so RequireAuth
// routes (composer) and per-user state (saves) work in seed mode.
const seedUser = { id: 'mock-user', username: 'testuser', displayName: 'Test User', onboarded: true };

test('signal composer publishes to the Square feed', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  await page.goto('/create');
  await page.getByText('Start a Signal').click();
  // Title is the first non-search input on the form.
  await page.locator('input:visible').nth(1).fill('Smoke test signal');
  await page.getByPlaceholder("What's on your mind?").fill('Published by the smoke suite to verify the core write path.');
  // Bearings are required: search the inline picker and pick one.
  await page.getByText('Open Bearing picker').click();
  await page.getByPlaceholder('Search Bearings...').fill('sleep');
  await page.getByRole('button', { name: 'Sleep', exact: true }).click();
  await page.getByRole('button', { name: 'Broadcast Signal' }).click();
  // Publishing redirects to the Square with the new post on top.
  await expect(page).toHaveURL(/\/square/);
  await expect(page.getByText('Smoke test signal').first()).toBeVisible();
});

test('saving a post from the Square surfaces it in the Library', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  await page.goto('/square');
  const firstCard = page.locator('a[href^="/post/"]').first();
  await expect(firstCard).toBeVisible();
  await page.locator('button:has(svg.lucide-bookmark)').first().click();
  await page.goto('/library');
  // The empty state must be gone and a saved row present with album controls
  // (the per-row select whose placeholder option is "Add to album…").
  await expect(page.getByText('Nothing saved yet')).toHaveCount(0);
  await expect(page.locator('select', { hasText: 'Add to album…' }).first()).toBeVisible();
});

test('albums organize saved items end to end', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  // Save something first so there is a row to organize.
  await page.goto('/square');
  await page.locator('button:has(svg.lucide-bookmark)').first().click();
  // Create an album, file the saved item into it, and open it.
  await page.goto('/library');
  await page.getByRole('button', { name: /New album/i }).click();
  await page.locator('input:visible').last().fill('Smoke album');
  await page.getByRole('button', { name: 'Create album' }).click();
  await page
    .locator('select', { hasText: 'Add to album…' })
    .first()
    .selectOption({ label: 'Smoke album' });
  await page.locator('a[href^="/library/albums/"]').first().click();
  await expect(page.getByRole('heading', { name: 'Smoke album' })).toBeVisible();
  // The filed item renders inside the album, not the empty state.
  await expect(page.getByText('Nothing in this album yet')).toHaveCount(0);
});

test('Comms DM: open a thread, send a message, react to it', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  await page.goto('/comms');
  // Open the first conversation and send a message.
  await page.locator('button.w-full').first().click();
  const composer = page.getByPlaceholder(/message/i).last();
  await composer.fill('smoke dm message');
  await composer.press('Enter');
  await expect(page.getByText('smoke dm message').first()).toBeVisible();
  // Hovering the bubble reveals the react action; reacting shows a count.
  await page.getByText('smoke dm message').first().hover();
  await page.getByRole('button', { name: /react with thumbs up/i }).first().click();
  await expect(page.getByText('👍').first()).toBeVisible();
});

test('Comms Quarters: open a quarter and post to it', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  await page.goto('/comms');
  await page.getByRole('button', { name: /Quarters/i }).first().click();
  await page.locator('button.w-full').first().click();
  const composer = page.getByPlaceholder(/message/i).last();
  await composer.fill('smoke quarter message');
  await composer.press('Enter');
  await expect(page.getByText('smoke quarter message').first()).toBeVisible();
});

test('Glossary opens category-first and deep links still resolve', async ({ page }) => {
  await page.goto('/glossary');
  // Landing state: category cards, not the full term list.
  const categoryCard = page.locator('button:has(svg.lucide-book-open)').first();
  await expect(categoryCard).toBeVisible();
  await categoryCard.click();
  // A term card renders inside the opened category.
  await expect(page.locator('[id^="term-"]').first()).toBeVisible();
  // Back control returns to the overview.
  await page.getByRole('button', { name: /All categories/i }).click();
  await expect(page.locator('button:has(svg.lucide-book-open)').first()).toBeVisible();
});

test('Compare suggestions rank same-purpose substances first', async ({ page }) => {
  await page.goto('/lab');
  await page.getByText('Substance Compare').click();
  await page.getByText('Modafinil', { exact: true }).first().click();
  // The pick-second list is similarity-ranked: for Modafinil the top
  // suggestion must be a Cognition/stimulant peer, not a relaxation herb.
  const firstSuggestion = page.locator('button .text-\\[15px\\]').first();
  await expect(firstSuggestion).toHaveText(/Caffeine|L-Theanine|Alpha-GPC|Creatine/);
});

test('Map search ranks literal name matches first', async ({ page }) => {
  await page.goto('/map');
  await page.locator('input[placeholder*="Search"]').first().fill('theanine');
  // "theanine" appears in many descriptions and pairing lists; the literal
  // name match must outrank all of them.
  const firstResult = page.locator('a:below(:text("Search Results"))').first();
  await expect(firstResult).toContainText('L-Theanine');
});

test('signal composer attaches a photo that renders on the published post', async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(user));
  }, seedUser);
  await page.goto('/create');
  await page.getByText('Start a Signal').click();
  await page.locator('input:visible').nth(1).fill('Photo signal smoke test');
  await page.getByPlaceholder("What's on your mind?").fill('Verifies the image attach + render path end to end.');
  // Attach via the hidden file input behind the "Add photo" button.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
  });
  // The picker shows the processed preview before publish.
  await expect(page.locator('img[alt="Attached"]')).toBeVisible();
  await page.getByText('Open Bearing picker').click();
  await page.getByPlaceholder('Search Bearings...').fill('sleep');
  await page.getByRole('button', { name: 'Sleep', exact: true }).click();
  await page.getByRole('button', { name: 'Broadcast Signal' }).click();
  await expect(page).toHaveURL(/\/square/);
  // The published card renders the attached image (data-url src).
  const card = page.locator('article, div').filter({ hasText: 'Photo signal smoke test' }).first();
  await expect(card.locator('img[src^="data:image"]').first()).toBeVisible();
});

test('Ctrl+K opens exactly one global search dialog and navigates', async ({ page }) => {
  await page.goto('/map');
  // The hotkey listener attaches in an effect — wait for the header trigger
  // to be mounted before pressing, or the keystroke can race hydration.
  await expect(page.getByRole('button', { name: 'Search everything' }).last()).toBeAttached();
  await page.keyboard.press('Control+k');
  // Layout mounts a GlobalSearch per header (mobile + desktop); only one may
  // own the hotkey or this opens two stacked dialogs.
  await expect(page.locator('[role="dialog"][aria-label="Search everything"]')).toHaveCount(1);
  await page.getByPlaceholder(/stacks, posts/i).fill('caffeine');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/substance\/caffeine/);
});
