const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  } catch(e) {
    console.log("GOTO ERROR:", e);
  }
  await page.waitForTimeout(2000);
  console.log("Done");
  await browser.close();
})();
