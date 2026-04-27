const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://stack-atlas-d31a7509.base44.app', { waitUntil: 'networkidle' });
  
  // Get the rendered HTML
  const html = await page.content();
  console.log(html);
  
  await browser.close();
})();
