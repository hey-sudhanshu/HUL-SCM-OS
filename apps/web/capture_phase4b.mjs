import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 120000 });
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  const routeIcon = await page.$$('::-p-xpath(//div[contains(text(), "Route Optimizer")])');
  if (routeIcon.length > 0) {
    await routeIcon[0].click();
    await routeIcon[0].click();
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'phase4b_geographic_1920x1080.png' });
    
    const closeBtn = await page.$$('::-p-xpath(//button[contains(@class, "close-button")])');
    if (closeBtn.length > 0) await closeBtn[0].click();
  }

  const dispatchIcon = await page.$$('::-p-xpath(//div[contains(text(), "Dispatch Manager")])');
  if (dispatchIcon.length > 0) {
    await dispatchIcon[0].click();
    await dispatchIcon[0].click();
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const truckRow = await page.$$('::-p-xpath(//span[contains(text(), "Vehicle 2")])');
    if (truckRow.length > 0) await truckRow[0].click();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'phase4b_dispatch_1920x1080.png' });

    const tacticalBtn = await page.$$('::-p-xpath(//button[contains(text(), "Schematic Tactical")])');
    if (tacticalBtn.length > 0) {
      await tacticalBtn[0].click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'phase4b_tactical_1920x1080.png' });
    }
  }
  
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));

  const dispatchIcon2 = await page.$$('::-p-xpath(//div[contains(text(), "Dispatch Manager")])');
  if (dispatchIcon2.length > 0) {
    await dispatchIcon2[0].click();
    await dispatchIcon2[0].click();
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const truckRow2 = await page.$$('::-p-xpath(//span[contains(text(), "Vehicle 2")])');
    if (truckRow2.length > 0) await truckRow2[0].click();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'phase4b_dispatch_1440x900.png' });

    const tacticalBtn2 = await page.$$('::-p-xpath(//button[contains(text(), "Schematic Tactical")])');
    if (tacticalBtn2.length > 0) {
      await tacticalBtn2[0].click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'phase4b_tactical_1440x900.png' });
    }
  }
  
  await browser.close();
  console.log('Screenshots captured successfully.');
})();
