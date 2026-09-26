import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://fmcg-supply-chain-dashboard.vercel.app/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'reference.png' });
  await browser.close();
  console.log('Reference screenshot captured.');
})();
