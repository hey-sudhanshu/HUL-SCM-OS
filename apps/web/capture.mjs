import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport for 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 120000 });
  
  // Wait a moment for animations/windows to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await page.screenshot({ path: 'screenshot_1440x900.png' });
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'screenshot_1920x1080.png' });
  
  await browser.close();
  console.log('Screenshots captured successfully.');
})();
