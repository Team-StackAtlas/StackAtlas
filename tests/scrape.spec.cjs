const { test, expect } = require('@playwright/test');

test('scrape page', async ({ page }) => {
  await page.goto('https://stack-atlas-d31a7509.base44.app');
  // Wait for the main app container to appear
  await page.waitForSelector('#root > div', { timeout: 10000 });
  // Wait a bit more for any dynamic content to load
  await page.waitForTimeout(3000);
  const content = await page.content();
  console.log('---START_CONTENT---');
  console.log(content);
  console.log('---END_CONTENT---');
});
