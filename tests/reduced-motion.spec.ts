import { test, expect } from '@playwright/test';

/**
 * Guards `prefers-reduced-motion` support. The app carries ~210 transitions
 * and a handful of animations; under the OS reduce-motion setting they must
 * collapse, while spinners keep turning (they signal work in flight, so
 * freezing them would remove information rather than motion).
 */

test('transitions collapse when the OS asks to reduce motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/square');
  await page.waitForSelector('a[href^="/post/"]');

  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .map((el) => getComputedStyle(el).transitionDuration)
      .filter((d) => d && d !== '0s')
      // A duration is a comma-separated list when several properties animate.
      .flatMap((d) => d.split(',').map((x) => parseFloat(x)))
      .filter((n) => !Number.isNaN(n)),
  );

  expect(durations.length).toBeGreaterThan(0); // page really does have transitions
  expect(Math.max(...durations)).toBeLessThan(0.05);
});

test('transitions stay animated when motion is not reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/square');
  await page.waitForSelector('a[href^="/post/"]');

  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .map((el) => getComputedStyle(el).transitionDuration)
      .flatMap((d) => d.split(',').map((x) => parseFloat(x)))
      .filter((n) => !Number.isNaN(n)),
  );

  // Without this assertion the test above would pass on a page with no
  // transitions at all, which would make the guard meaningless.
  expect(Math.max(...durations)).toBeGreaterThanOrEqual(0.1);
});

test('spinners keep animating under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/square');
  await page.waitForSelector('a[href^="/post/"]');

  const spinnerDuration = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'animate-spin';
    document.body.appendChild(el);
    const d = getComputedStyle(el).animationDuration;
    el.remove();
    return parseFloat(d);
  });

  // Reduced but still running, so loading states remain legible.
  expect(spinnerDuration).toBeGreaterThan(0.5);
});
