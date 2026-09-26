const puppeteer = require('puppeteer');
const path = require('path');

const brainDir = '/Users/sudhanshudeshmukh/.gemini/antigravity/brain/a02a1b22-0f85-4c67-aa77-ec979886b12a';

async function takeScreenshot(page, filename, width, height) {
    await page.setViewport({ width, height });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(brainDir, filename) });
    console.log(`Saved ${filename}`);
}

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto('http://localhost:3000');
    await page.waitForTimeout(4000);
    
    // Open Inventory Lab
    await page.evaluate(() => {
        const icon = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Inventory'));
        if (icon) icon.click();
    });
    await page.waitForTimeout(2000);
    
    // Screenshot 1: Classification Grid (AY selected)
    await takeScreenshot(page, 'phase5a_classification_1440x900.png', 1440, 900);
    await takeScreenshot(page, 'phase5a_classification_1920x1080.png', 1920, 1080);
    
    // Select SKU-044
    await page.evaluate(() => {
        const select = document.querySelector('select');
        if (select) {
            select.value = Array.from(select.options).find(o => o.value.includes('SKU')).value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'phase5a_policy_1440x900.png', 1440, 900);
    await takeScreenshot(page, 'phase5a_policy_1920x1080.png', 1920, 1080);

    // Switch to Reorder Plan
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Reorder Plan');
        if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'phase5a_reorder_1440x900.png', 1440, 900);
    await takeScreenshot(page, 'phase5a_reorder_1920x1080.png', 1920, 1080);

    // Switch to Baseline Comparison
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Baseline'));
        if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'phase5a_baseline_1440x900.png', 1440, 900);
    await takeScreenshot(page, 'phase5a_baseline_1920x1080.png', 1920, 1080);

    // Switch to Risk Pooling
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Risk Pooling'));
        if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'phase5a_riskpooling_1440x900.png', 1440, 900);
    await takeScreenshot(page, 'phase5a_riskpooling_1920x1080.png', 1920, 1080);

    await browser.close();
})();
